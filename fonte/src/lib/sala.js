// Sala em tempo real. O GitHub Pages so serve arquivos; quem leva as
// mensagens e um broker MQTT publico (sem conta, sem servidor nosso).
//
// Topicos, sob terra-sob-as-unhas/v1/<CODIGO>/ — todos RETIDOS, entao quem
// entra depois recebe o ultimo valor de cada um:
//   online/<cid>    "1" | "0" ("0" vem do testamento quando a aba fecha)
//   status/<cid>    resumo pequeno: nome, PV/PM/SAN…, marcadores (todos veem)
//   rolagens/<cid>  as ultimas 8 rolagens da pessoa (todos veem)
//   ficha/<cid>     a ficha inteira (so o mestre assina)
// Mensagem vazia apaga o retido: e assim que alguem "sai da sala".
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { normalizar, resumoStatus, str, uid } from './modelo.js';

const params = new URLSearchParams(location.search);
export const BROKER = params.get('broker') || 'wss://broker.emqx.io:8084/mqtt';
const RAIZ = 'terra-sob-as-unhas/v1/';
const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sem 0/O/1/I, que se confundem ditados
export const MAX_ROLAGENS = 8;
const VALIDADE_ROLAGEM = 6 * 60 * 60 * 1000;
const CID_VALIDO = /^[a-z0-9-]{2,32}$/i;

export function novoCodigo() {
  const a = new Uint32Array(6);
  crypto.getRandomValues(a);
  return Array.from(a, (n) => ALFABETO[n % ALFABETO.length]).join('');
}

export const limparCodigo = (c) => str(c).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);

// Identidade estavel deste navegador: a pessoa continua sendo a mesma depois de recarregar.
function meuCid(papel) {
  const chave = papel === 'mestre' ? 'terra-sob-as-unhas:cid-mestre' : 'terra-sob-as-unhas:cid';
  let cid = null;
  try { cid = localStorage.getItem(chave); } catch { /* sem armazenamento */ }
  if (!cid || !CID_VALIDO.test(cid)) {
    cid = (papel === 'mestre' ? 'm' : 'j') + Math.random().toString(36).slice(2, 12);
    try { localStorage.setItem(chave, cid); } catch { /* segue com um novo por visita */ }
  }
  return cid;
}

function topicos(codigo) {
  const base = RAIZ + codigo;
  return { de: (tipo, cid) => `${base}/${tipo}/${cid}`, todos: (tipo) => `${base}/${tipo}/+` };
}

const texto = (payload) => { try { return new TextDecoder().decode(payload); } catch { return String(payload); } };
const ler = (t) => { try { return JSON.parse(t); } catch { return null; } };
const lista = (v) => (Array.isArray(v) ? v : []);

// Tudo que chega da rede e de terceiros: so passa o que tem o formato esperado.
function limparStatus(s) {
  if (!s || typeof s !== 'object') return null;
  return {
    nome: str(s.nome).slice(0, 60),
    contadores: lista(s.contadores).slice(0, 8).map((c) => ({ rotulo: str(c?.rotulo).slice(0, 24), valor: str(c?.valor).slice(0, 12), max: str(c?.max).slice(0, 12) })),
    marcadores: lista(s.marcadores).slice(0, 8).map((m) => ({
      rotulo: str(m?.rotulo).slice(0, 24),
      total: Math.max(1, Math.min(40, Number(m?.total) || 1)),
      marcados: Math.max(0, Math.min(40, Number(m?.marcados) || 0)),
      cor: m?.cor === 'rosa' ? 'rosa' : 'verde',
    })),
  };
}
function limparRolagem(r, cid) {
  if (!r || typeof r !== 'object') return null;
  return {
    id: str(r.id).slice(0, 16) || uid(), cid, t: Number(r.t) || 0,
    nome: str(r.nome).slice(0, 60), num: str(r.num).slice(0, 8), veredito: str(r.veredito).slice(0, 60),
    classe: r.classe === 'sucesso' || r.classe === 'falha' ? r.classe : '', contra: str(r.contra).slice(0, 200),
  };
}

const sem = (obj, chave) => { if (!(chave in obj)) return obj; const n = { ...obj }; delete n[chave]; return n; };

export function useSala({ codigo, papel, ficha }) {
  const cid = useMemo(() => meuCid(papel), [papel]);
  const [conexao, setConexao] = useState('fora');
  const [membros, setMembros] = useState({});   // cid -> { status, online }
  const [fichas, setFichas] = useState({});     // cid -> { ficha, t }  (so mestre)
  const [daSala, setDaSala] = useState({});     // cid -> [rolagens]
  const [minhas, setMinhas] = useState([]);

  const clienteRef = useRef(null);
  const topRef = useRef(null);
  const fichaRef = useRef(ficha);
  fichaRef.current = ficha;
  const minhasRef = useRef(minhas);
  minhasRef.current = minhas;
  const ultimoStatus = useRef('');

  const publicar = useCallback((tipo, conteudo) => {
    const c = clienteRef.current;
    if (!c || !c.connected || !topRef.current) return;
    c.publish(topRef.current.de(tipo, cid), conteudo, { qos: 1, retain: true });
  }, [cid]);

  const publicarFicha = useCallback(() => {
    if (papel !== 'jogador' || !fichaRef.current) return;
    publicar('ficha', JSON.stringify({ t: Date.now(), ficha: fichaRef.current }));
    const st = JSON.stringify(resumoStatus(fichaRef.current));
    if (st !== ultimoStatus.current) { ultimoStatus.current = st; publicar('status', st); }
  }, [papel, publicar]);

  useEffect(() => {
    if (!codigo) { setConexao('fora'); return undefined; }
    const t = topicos(codigo);
    topRef.current = t;
    ultimoStatus.current = '';
    setMembros({}); setFichas({}); setDaSala({});
    const jogador = papel === 'jogador';
    let c = null;
    let cancelado = false;
    setConexao('conectando');
    // A biblioteca MQTT so e baixada quando a pessoa entra numa sala.
    import('mqtt').then(({ default: mqtt }) => {
      if (cancelado) return;
      c = mqtt.connect(BROKER, {
        clientId: 'tsu-' + uid(), clean: true, keepalive: 30, reconnectPeriod: 4000, connectTimeout: 10000,
        will: jogador ? { topic: t.de('online', cid), payload: '0', qos: 1, retain: true } : undefined,
      });
      clienteRef.current = c;

      c.on('connect', () => {
        setConexao('conectado');
        const subs = [t.todos('online'), t.todos('status'), t.todos('rolagens')];
        if (!jogador) subs.push(t.todos('ficha'));
        c.subscribe(subs, { qos: 1 });
        ultimoStatus.current = '';
        if (jogador) { publicar('online', '1'); publicarFicha(); }
        if (minhasRef.current.length) publicar('rolagens', JSON.stringify(minhasRef.current));
      });
      c.on('reconnect', () => setConexao('reconectando'));
      c.on('offline', () => setConexao('sem-conexao'));
      c.on('error', () => setConexao('sem-conexao'));

      c.on('message', (topico, payload) => {
        const partes = topico.split('/');
        const quem = partes[partes.length - 1];
        const tipo = partes[partes.length - 2];
        if (!CID_VALIDO.test(quem)) return;
        const txt = texto(payload);
        if (tipo === 'online') {
          if (!txt) setMembros((m) => sem(m, quem));
          else setMembros((m) => ({ ...m, [quem]: { ...m[quem], online: txt === '1' } }));
        } else if (tipo === 'status') {
          const st = txt ? limparStatus(ler(txt)) : null;
          setMembros((m) => (st ? { ...m, [quem]: { ...m[quem], status: st } } : sem(m, quem)));
        } else if (tipo === 'rolagens') {
          if (quem === cid) return; // as minhas eu ja tenho
          const rs = txt ? lista(ler(txt)).slice(0, MAX_ROLAGENS).map((r) => limparRolagem(r, quem)).filter(Boolean) : [];
          setDaSala((d) => (rs.length ? { ...d, [quem]: rs } : sem(d, quem)));
        } else if (tipo === 'ficha' && !jogador) {
          const dados = txt ? ler(txt) : null;
          if (!dados || !dados.ficha || !Array.isArray(dados.ficha.secoes)) { setFichas((f) => sem(f, quem)); return; }
          setFichas((f) => ({ ...f, [quem]: { ficha: normalizar(dados.ficha), t: Number(dados.t) || Date.now() } }));
        }
      });
    }).catch(() => { if (!cancelado) setConexao('sem-conexao'); });

    // end(false): deixa sair o que ainda está na fila (ex.: as mensagens vazias de "sair da sala").
    return () => { cancelado = true; if (c) c.end(false); clienteRef.current = null; topRef.current = null; };
  }, [codigo, papel, cid, publicar, publicarFicha]);

  // A cada mudanca na ficha, publica (com uma pausa curta pra juntar as teclas).
  useEffect(() => {
    if (!codigo || papel !== 'jogador') return undefined;
    const tm = setTimeout(publicarFicha, 400);
    return () => clearTimeout(tm);
  }, [ficha, codigo, papel, publicarFicha]);

  const registrarRolagem = useCallback((r) => {
    const nome = papel === 'mestre' ? 'Mestre' : (fichaRef.current?.titulo || 'Sem nome');
    const nova = { ...r, cid, nome: nome.slice(0, 60) };
    const lista8 = [nova, ...minhasRef.current].slice(0, MAX_ROLAGENS);
    minhasRef.current = lista8;
    setMinhas(lista8);
    publicar('rolagens', JSON.stringify(lista8));
  }, [cid, papel, publicar]);

  // Sair de verdade apaga tudo que esta pessoa deixou retido na sala.
  const sair = useCallback(() => {
    const c = clienteRef.current;
    if (c && c.connected) {
      const tipos = papel === 'jogador' ? ['ficha', 'status', 'online', 'rolagens'] : ['rolagens'];
      tipos.forEach((tipo) => publicar(tipo, ''));
    }
  }, [papel, publicar]);

  const removerJogador = useCallback((alvo) => {
    const c = clienteRef.current;
    if (!c || !c.connected || !topRef.current || !CID_VALIDO.test(alvo)) return;
    ['ficha', 'status', 'online', 'rolagens'].forEach((tipo) => c.publish(topRef.current.de(tipo, alvo), '', { qos: 1, retain: true }));
    setFichas((f) => sem(f, alvo));
    setMembros((m) => sem(m, alvo));
    setDaSala((d) => sem(d, alvo));
  }, []);

  const historico = useMemo(() => {
    const limite = Date.now() - VALIDADE_ROLAGEM;
    return [...minhas, ...Object.values(daSala).flat()]
      .filter((r) => r.t > limite)
      .sort((a, b) => b.t - a.t)
      .slice(0, 60);
  }, [minhas, daSala]);

  const listaMembros = useMemo(() => Object.entries(membros)
    .filter(([, m]) => m.status)
    .map(([id, m]) => ({ cid: id, voce: id === cid, online: !!m.online, ...m.status }))
    .sort((a, b) => (b.voce - a.voce) || a.nome.localeCompare(b.nome, 'pt-BR')), [membros, cid]);

  return { cid, conexao, membros: listaMembros, fichas, historico, registrarRolagem, sair, removerJogador };
}

export const TEXTO_CONEXAO = {
  fora: 'Fora de sala',
  conectando: 'Conectando…',
  conectado: 'Ao vivo',
  reconectando: 'Reconectando…',
  'sem-conexao': 'Sem conexão',
};

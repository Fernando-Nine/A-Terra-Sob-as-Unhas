// Sala — o transporte em tempo real entre jogadores e mestre.
//
// O GitHub Pages so serve arquivos; quem leva as mensagens e um broker MQTT
// publico (sem conta, sem servidor nosso). Cada jogador publica a ficha
// inteira como mensagem "retida": o broker guarda a ultima, entao o mestre
// ve todas as fichas mesmo se entrar depois. Rolagens nao sao retidas: so
// quem esta na sala naquele momento ve.
//
// Topicos, sob terra-sob-as-unhas/v1/<CODIGO>/:
//   ficha/<cid>   JSON { cid, t, ficha }   retida; vazia = saiu da sala
//   online/<cid>  "1" | "0"                retida; "0" vem do testamento (will)
//   rolagem       JSON { cid, nome, ... }  nao retida
window.Sala = (function () {
  'use strict';

  const params = new URLSearchParams(location.search);
  const BROKER = params.get('broker') || 'wss://broker.emqx.io:8084/mqtt';
  const RAIZ = 'terra-sob-as-unhas/v1/';
  const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sem 0/O/1/I, que se confundem ditados
  const CHAVE_CID = 'terra-sob-as-unhas:cid';

  function novoCodigo() {
    const a = new Uint32Array(6);
    crypto.getRandomValues(a);
    return Array.from(a, (n) => ALFABETO[n % ALFABETO.length]).join('');
  }

  function limparCodigo(c) {
    return String(c == null ? '' : c).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
  }

  // Identidade estavel deste navegador na sala: a ficha de uma pessoa continua
  // sendo a mesma ficha depois de recarregar a pagina.
  function meuCid() {
    let cid = null;
    try { cid = localStorage.getItem(CHAVE_CID); } catch (e) { /* sem armazenamento */ }
    if (!cid) {
      cid = 'j' + Math.random().toString(36).slice(2, 12);
      try { localStorage.setItem(CHAVE_CID, cid); } catch (e) { /* segue com um novo a cada visita */ }
    }
    return cid;
  }

  function topicos(codigo) {
    const base = RAIZ + codigo;
    return {
      base,
      ficha: (cid) => `${base}/ficha/${cid}`,
      online: (cid) => `${base}/online/${cid}`,
      todasFichas: `${base}/ficha/+`,
      todosOnline: `${base}/online/+`,
      rolagem: `${base}/rolagem`,
    };
  }

  function cidDoTopico(topico) {
    return topico.slice(topico.lastIndexOf('/') + 1);
  }

  function texto(payload) {
    try { return new TextDecoder().decode(payload); } catch (e) { return String(payload); }
  }

  // Conecta e avisa a mudanca de estado: 'conectando' | 'conectado' | 'reconectando' | 'sem-conexao'.
  function conectar(opcoes) {
    if (typeof mqtt === 'undefined') throw new Error('biblioteca MQTT nao carregou');
    const cliente = mqtt.connect(BROKER, {
      clientId: 'tsu-' + Math.random().toString(36).slice(2, 12),
      clean: true,
      keepalive: 30,
      reconnectPeriod: 4000,
      connectTimeout: 10000,
      will: opcoes.will,
    });
    const aviso = opcoes.aoMudar || function () {};
    aviso('conectando');
    cliente.on('connect', () => { aviso('conectado'); if (opcoes.aoConectar) opcoes.aoConectar(cliente); });
    cliente.on('reconnect', () => aviso('reconectando'));
    cliente.on('offline', () => aviso('sem-conexao'));
    cliente.on('error', () => aviso('sem-conexao'));
    if (opcoes.aoReceber) cliente.on('message', (topico, payload) => opcoes.aoReceber(topico, texto(payload)));
    return cliente;
  }

  return { BROKER, novoCodigo, limparCodigo, meuCid, topicos, cidDoTopico, conectar };
})();

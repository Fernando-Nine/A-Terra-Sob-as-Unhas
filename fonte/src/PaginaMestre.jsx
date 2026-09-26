// Painel do mestre: cria a sala, vê a mesa, a ficha inteira de cada jogador e o
// histórico. O mestre também rola (aparece como "Mestre" para todos).
import { useEffect, useMemo, useState } from 'react';
import { Check, ChevronDown, ChevronUp, Copy, DoorOpen, FileText, Sparkles, Trash2 } from 'lucide-react';
import { useSala, novoCodigo, limparCodigo, TEXTO_CONEXAO } from './lib/sala.js';
import { useDados } from './lib/useDados.js';
import { useAviso } from './lib/useAviso.js';
import { BarraDados } from './componentes/BarraDados.jsx';
import { JanelaHistorico } from './componentes/Historico.jsx';
import { Mesa } from './componentes/Mesa.jsx';
import { FichaLeitura } from './componentes/FichaLeitura.jsx';
import { Aviso, PontoOnline } from './componentes/base.jsx';

function irPara(c) {
  const u = new URL(location.href);
  u.searchParams.set('sala', c);
  location.href = u.toString();
}

function AbrirSala() {
  const [digitado, setDigitado] = useState('');
  return (
    <main className="mx-auto flex max-w-xl flex-col gap-6 px-4 py-12">
      <h1 className="font-display text-4xl text-verde">Painel do mestre</h1>
      <p className="text-tinta-2">Crie uma sala e passe o código para os jogadores. Aqui você vê a ficha inteira de cada um mudando enquanto eles jogam, o status da mesa e todas as rolagens.</p>
      <button type="button" className="botao-primario self-start text-base" onClick={() => irPara(novoCodigo())}><Sparkles className="size-5" /> Criar sala nova</button>
      <div className="flex flex-col gap-2">
        <p className="text-sm text-tinta-2">Ou abra uma sala que já existe:</p>
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); const c = limparCodigo(digitado); if (c) irPara(c); }}>
          <input value={digitado} onChange={(e) => setDigitado(e.target.value)} placeholder="Código, ex.: K7PX2M" aria-label="Código da sala"
            autoComplete="off" autoCapitalize="characters" spellCheck={false}
            className="min-h-11 min-w-0 flex-1 rounded-md border border-linha-forte bg-folha px-3 font-mono uppercase tracking-widest placeholder:font-sans placeholder:normal-case placeholder:tracking-normal" />
          <button type="submit" className="botao"><DoorOpen className="size-4" /> Abrir</button>
        </form>
      </div>
      <a className="text-sm font-medium text-verde underline underline-offset-2" href="./">Voltar para a minha ficha</a>
    </main>
  );
}

function quando(t) {
  const s = Math.round((Date.now() - t) / 1000);
  if (s < 10) return 'agora';
  if (s < 60) return `há ${s} s`;
  const m = Math.round(s / 60);
  return m < 60 ? `há ${m} min` : `há ${Math.round(m / 60)} h`;
}

function CartaoFicha({ cid, ficha, t, online, remover }) {
  const [recolhido, setRecolhido] = useState(false);
  const [confirmar, setConfirmar] = useState(false);
  const [piscar, setPiscar] = useState(0);
  useEffect(() => { setPiscar((n) => n + 1); }, [t]);
  useEffect(() => { if (!confirmar) return undefined; const tm = setTimeout(() => setConfirmar(false), 4000); return () => clearTimeout(tm); }, [confirmar]);
  return (
    <article key={piscar} className={`flex min-w-0 flex-col rounded-xl border border-linha-forte bg-folha ${piscar > 1 ? 'anim-piscou' : ''}`}>
      <header className={`flex flex-wrap items-center gap-2 px-3 py-2.5 ${recolhido ? '' : 'border-b border-linha'}`}>
        <PontoOnline online={online} />
        <h3 className={`min-w-0 flex-[1_1_150px] font-display text-xl [overflow-wrap:break-word] ${ficha.titulo ? 'text-verde' : 'italic text-tinta-2'}`}>{ficha.titulo || 'Personagem sem nome'}</h3>
        <span className="text-xs text-tinta-2">{quando(t)}</span>
        <button type="button" className="botao-icone size-9" onClick={() => setRecolhido((r) => !r)} aria-expanded={!recolhido} aria-label={recolhido ? 'Abrir ficha' : 'Recolher ficha'} title={recolhido ? 'Abrir' : 'Recolher'}>
          {recolhido ? <ChevronDown className="size-4" /> : <ChevronUp className="size-4" />}
        </button>
        <button type="button" onClick={() => (confirmar ? remover(cid) : setConfirmar(true))}
          className={`inline-flex h-9 items-center gap-1.5 rounded-md px-2 text-sm ${confirmar ? 'bg-rosa text-folha' : 'text-tinta-2 hover:bg-rosa-fundo hover:text-rosa'}`}
          aria-label="Remover ficha da sala" title="Remover da sala">
          <Trash2 className="size-4" />{confirmar && 'Remover mesmo?'}
        </button>
      </header>
      {!recolhido && <div className="p-3"><FichaLeitura ficha={ficha} /></div>}
    </article>
  );
}

function Painel({ codigo }) {
  const { aviso, avisar } = useAviso();
  const [historicoAberto, setHistoricoAberto] = useState(true);
  const [copiado, setCopiado] = useState(false);
  const [, setRelogio] = useState(0);
  const sala = useSala({ codigo, papel: 'mestre', ficha: null });
  const dados = useDados({ registrar: sala.registrarRolagem, historico: sala.historico, historicoAberto, avisar });

  useEffect(() => { document.title = `Mestre · Sala ${codigo}`; }, [codigo]);
  useEffect(() => { const i = setInterval(() => setRelogio((n) => n + 1), 15000); return () => clearInterval(i); }, []);

  const link = useMemo(() => {
    const u = new URL('./', location.href);
    u.search = '';
    u.searchParams.set('sala', codigo);
    const b = new URLSearchParams(location.search).get('broker');
    if (b) u.searchParams.set('broker', b);
    return u.toString();
  }, [codigo]);

  const online = Object.fromEntries(sala.membros.map((m) => [m.cid, m.online]));
  const fichas = Object.entries(sala.fichas).sort((a, b) => a[1].ficha.titulo.localeCompare(b[1].ficha.titulo, 'pt-BR'));

  const copiar = async () => {
    try { await navigator.clipboard.writeText(link); setCopiado(true); setTimeout(() => setCopiado(false), 2000); } catch { avisar('Selecione o link e copie com Ctrl+C'); }
  };

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-linha bg-papel/90 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2">
          <span className="font-display text-sm text-verde">Mestre</span>
          <span className={`flex items-center gap-1.5 text-xs font-medium ${sala.conexao === 'conectado' ? 'text-verde' : sala.conexao === 'conectando' ? 'text-tinta-2' : 'text-rosa'}`} aria-live="polite">
            <PontoOnline online={sala.conexao === 'conectado'} /> {TEXTO_CONEXAO[sala.conexao]}
          </span>
          <a href="./" className="botao ml-auto min-h-10 px-3 text-sm"><FileText className="size-4" /> Minha ficha</a>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 pb-44 pt-6">
        <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-4">
          <div>
            <p className="rotulo">Sala</p>
            <h1 className="font-mono text-5xl font-semibold tracking-[0.12em] text-verde">{codigo}</h1>
          </div>
          <div className="flex max-w-xl flex-[1_1_320px] flex-col gap-1">
            <label htmlFor="link" className="rotulo">Link para os jogadores</label>
            <div className="flex gap-2">
              <input id="link" readOnly value={link} onFocus={(e) => e.target.select()} className="min-h-11 min-w-0 flex-1 rounded-md border border-linha-forte bg-folha px-2 font-mono text-xs" />
              <button type="button" className="botao" onClick={copiar}>{copiado ? <Check className="size-4" /> : <Copy className="size-4" />}{copiado ? 'Copiado' : 'Copiar'}</button>
            </div>
            <p className="text-xs text-tinta-2">Ou eles tocam em <b>Sala</b> na ficha e digitam o código.</p>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
          <section className="flex min-w-0 flex-col gap-3 lg:order-1" aria-labelledby="t-fichas">
            <h2 id="t-fichas" className="font-display text-lg uppercase tracking-[0.06em] text-verde">Fichas {fichas.length > 0 && <span className="text-tinta-2">· {fichas.length}</span>}</h2>
            {fichas.length ? (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(min(440px,100%),1fr))] items-start gap-4">
                {fichas.map(([cid, f]) => (
                  <CartaoFicha key={cid} cid={cid} ficha={f.ficha} t={f.t} online={!!online[cid]}
                    remover={(c) => { sala.removerJogador(c); avisar('Ficha removida. Se o jogador continuar na sala, ela volta na próxima mudança.'); }} />
                ))}
              </div>
            ) : (
              <p className="rounded-xl border-2 border-dashed border-linha-forte p-6 text-tinta-2">Nenhuma ficha ainda. Quando um jogador entrar na sala, a ficha dele aparece aqui.</p>
            )}
          </section>
          <aside className="lg:order-2">
            <div className="lg:sticky lg:top-20"><Mesa membros={sala.membros} /></div>
          </aside>
        </div>
      </div>

      <div className="pointer-events-none fixed inset-x-0 bottom-36 z-50 flex justify-center px-4 sm:bottom-24"><Aviso aviso={aviso} /></div>
      <BarraDados ultima={dados.ultima} modo={dados.modo} setModo={dados.setModo}
        rolarLivre={(e) => dados.rolarExpressao(e, '')} abrirHistorico={() => setHistoricoAberto((a) => !a)} novasNoHistorico={dados.novas} />
      <JanelaHistorico aberta={historicoAberto} fechar={() => setHistoricoAberto(false)} historico={sala.historico} meuCid={sala.cid} emSala canto="esquerda" chave="mestre" />
    </>
  );
}

export function PaginaMestre() {
  const codigo = limparCodigo(new URLSearchParams(location.search).get('sala'));
  return codigo ? <Painel codigo={codigo} /> : <AbrirSala />;
}

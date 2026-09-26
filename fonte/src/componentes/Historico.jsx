// Janela flutuante com as rolagens da mesa. Arrasta pela barra de título e
// lembra onde ficou. Não é modal: dá pra continuar mexendo na ficha com ela aberta.
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { GripHorizontal, History, X } from 'lucide-react';
import { D20 } from './base.jsx';
import { gravarLocal, lerLocal } from '../lib/useFicha.js';

const MARGEM = 8;

function quando(t) {
  const s = Math.round((Date.now() - t) / 1000);
  if (s < 10) return 'agora';
  if (s < 60) return `${s} s`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min`;
  return `${Math.round(m / 60)} h`;
}

// canto: onde a janela nasce na primeira vez ('direita' no alto, ou 'esquerda' embaixo).
export function JanelaHistorico({ aberta, fechar, historico, meuCid, emSala, canto = 'direita', chave = 'jogador' }) {
  const CHAVE_POS = `terra-sob-as-unhas:historico-pos:${chave}`;
  const ref = useRef(null);
  const arrasto = useRef(null);
  const [pos, setPos] = useState(() => {
    try { const p = JSON.parse(lerLocal(CHAVE_POS, 'null')); return p && Number.isFinite(p.x) ? p : null; } catch { return null; }
  });
  const [, setRelogio] = useState(0);

  const prender = useCallback((p) => {
    const el = ref.current;
    const w = el ? el.offsetWidth : 340;
    const h = el ? el.offsetHeight : 200;
    return {
      x: Math.min(Math.max(MARGEM, p.x), window.innerWidth - w - MARGEM),
      y: Math.min(Math.max(MARGEM, p.y), window.innerHeight - Math.min(h, 120) - MARGEM),
    };
  }, []);

  // Primeira vez: canto direito, acima da barra de dados.
  useLayoutEffect(() => {
    if (!aberta) return;
    if (!pos) {
      const el = ref.current;
      setPos(prender(canto === 'esquerda'
        ? { x: 16, y: window.innerHeight - (el?.offsetHeight || 300) - 110 }
        : { x: window.innerWidth - (el?.offsetWidth || 340) - 16, y: 72 }));
    } else {
      setPos((p) => prender(p));
    }
  }, [aberta]);

  useEffect(() => {
    if (!aberta) return undefined;
    const aoRedimensionar = () => setPos((p) => (p ? prender(p) : p));
    const aoTeclar = (e) => { if (e.key === 'Escape') fechar(); };
    const relogio = setInterval(() => setRelogio((n) => n + 1), 15000);
    window.addEventListener('resize', aoRedimensionar);
    window.addEventListener('keydown', aoTeclar);
    return () => { window.removeEventListener('resize', aoRedimensionar); window.removeEventListener('keydown', aoTeclar); clearInterval(relogio); };
  }, [aberta, fechar, prender]);

  const inicio = (e) => {
    if (e.button !== 0 || e.target.closest('button')) return;
    const r = ref.current.getBoundingClientRect();
    arrasto.current = { dx: e.clientX - r.left, dy: e.clientY - r.top };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const mover = (e) => {
    if (!arrasto.current) return;
    setPos(prender({ x: e.clientX - arrasto.current.dx, y: e.clientY - arrasto.current.dy }));
  };
  const fim = () => {
    if (!arrasto.current) return;
    arrasto.current = null;
    setPos((p) => { gravarLocal(CHAVE_POS, JSON.stringify(p)); return p; });
  };
  // Teclado: setas movem a janela quando a barra de título tem foco.
  const teclar = (e) => {
    const passo = e.shiftKey ? 64 : 16;
    const d = { ArrowLeft: [-passo, 0], ArrowRight: [passo, 0], ArrowUp: [0, -passo], ArrowDown: [0, passo] }[e.key];
    if (!d) return;
    e.preventDefault();
    setPos((p) => { const n = prender({ x: p.x + d[0], y: p.y + d[1] }); gravarLocal(CHAVE_POS, JSON.stringify(n)); return n; });
  };

  if (!aberta) return null;
  return (
    <section
      ref={ref}
      role="dialog"
      aria-labelledby="t-historico"
      style={{ left: pos?.x ?? -9999, top: pos?.y ?? 72 }}
      className="fixed z-40 flex max-h-[min(70vh,560px)] w-[min(340px,calc(100vw-16px))] flex-col overflow-hidden rounded-xl border border-linha-forte bg-folha shadow-2xl"
    >
      <header
        tabIndex={0}
        onPointerDown={inicio} onPointerMove={mover} onPointerUp={fim} onPointerCancel={fim} onKeyDown={teclar}
        aria-label="Barra da janela: arraste, ou use as setas, para mover"
        className="flex cursor-grab touch-none select-none items-center gap-2 border-b border-linha bg-verde-fundo py-1.5 pl-3 pr-1.5 active:cursor-grabbing"
      >
        <History className="size-4 text-verde" />
        <h2 id="t-historico" className="font-display text-base text-verde">Rolagens</h2>
        <span className="text-xs text-tinta-2">{emSala ? 'da mesa' : 'só suas'}</span>
        <GripHorizontal className="ml-auto size-4 text-tinta-2" aria-hidden="true" />
        <button type="button" onClick={fechar} className="botao-icone size-9" aria-label="Fechar histórico"><X className="size-4" /></button>
      </header>
      {historico.length ? (
        <ol className="flex flex-col overflow-y-auto overscroll-contain" aria-live="polite">
          {historico.map((r, i) => (
            <li key={r.cid + r.id} className={`grid grid-cols-[3rem_1fr_auto] items-start gap-2 border-b border-linha px-3 py-2 ${i === 0 ? 'anim-entra' : ''}`}>
              <span className={`text-center font-mono text-xl font-semibold leading-tight ${r.classe === 'sucesso' ? 'text-verde' : r.classe === 'falha' ? 'text-rosa' : ''}`}>{r.num}</span>
              <div className="min-w-0 text-sm">
                <div className="truncate">
                  <b className={r.cid === meuCid ? 'text-verde' : ''}>{r.cid === meuCid ? 'Você' : (r.nome || 'Sem nome')}</b>
                  {' · '}
                  <span className={r.classe === 'sucesso' ? 'font-semibold text-verde' : r.classe === 'falha' ? 'font-semibold text-rosa' : ''}>{r.veredito}</span>
                </div>
                <div className="text-xs text-tinta-2 [overflow-wrap:anywhere]">{r.contra}</div>
              </div>
              <span className="text-[11px] text-tinta-2">{quando(r.t)}</span>
            </li>
          ))}
        </ol>
      ) : (
        <div className="flex flex-col items-center gap-2 px-6 py-8 text-center text-sm text-tinta-2">
          <D20 className="size-8 text-verde-borda" />
          {emSala ? 'Nenhuma rolagem na mesa ainda. Quando alguém rolar, aparece aqui.' : 'Suas rolagens aparecem aqui. Entre numa sala para ver as da mesa.'}
        </div>
      )}
      <p className="border-t border-linha px-3 py-1.5 text-[11px] text-tinta-2">Guarda as últimas 8 rolagens de cada pessoa, por até 6 horas.</p>
    </section>
  );
}

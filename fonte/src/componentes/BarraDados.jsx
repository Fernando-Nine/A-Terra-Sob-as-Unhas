// Barra fixa embaixo: último resultado, dado extra do d100 e rolagem livre.
import { useEffect, useRef, useState } from 'react';
import { History } from 'lucide-react';
import { D20 } from './base.jsx';

const MODOS = [
  { v: -1, rotulo: 'Penalidade', dica: 'Rola duas dezenas e fica com a pior' },
  { v: 0, rotulo: 'Normal' },
  { v: 1, rotulo: 'Bônus', dica: 'Rola duas dezenas e fica com a melhor' },
];

function BotaoHistorico({ abrir, novas, className }) {
  return (
    <button type="button" onClick={abrir} className={`botao relative min-h-10 shrink-0 px-3 ${className}`} aria-label="Abrir histórico de rolagens" title="Histórico de rolagens">
      <History className="size-5" />
      {novas > 0 && (
        <span className="absolute -right-1.5 -top-1.5 grid min-w-5 place-items-center rounded-full bg-rosa px-1 text-[11px] font-bold text-folha">{novas}</span>
      )}
    </button>
  );
}

export function BarraDados({ ultima, modo, setModo, rolarLivre, abrirHistorico, novasNoHistorico }) {
  const [expr, setExpr] = useState('');
  const numRef = useRef(null);
  useEffect(() => {
    const n = numRef.current;
    if (!n || !ultima) return;
    n.classList.remove('anim-tremor');
    void n.offsetWidth;
    n.classList.add('anim-tremor');
  }, [ultima]);

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-verde-borda bg-folha/95 px-4 pb-[calc(0.625rem+env(safe-area-inset-bottom))] pt-2.5 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-5 gap-y-2">
        <div className="flex min-w-0 flex-[1_1_260px] items-center gap-3" aria-live="polite">
          <span ref={numRef} className={`min-w-[2.4ch] text-center font-mono text-3xl font-semibold tabular-nums ${ultima?.classe === 'sucesso' ? 'text-verde' : ultima?.classe === 'falha' ? 'text-rosa' : ''}`}>
            {ultima ? ultima.num : <D20 className="mx-auto size-7 text-verde-borda" />}
          </span>
          <div className="min-w-0 flex-1">
            <div className={`truncate font-display text-lg leading-tight ${ultima?.classe === 'sucesso' ? 'text-verde' : ultima?.classe === 'falha' ? 'text-rosa' : ''}`}>
              {ultima ? ultima.veredito : 'Pronto para rolar'}
            </div>
            <div className="truncate text-xs text-tinta-2">{ultima ? ultima.contra : 'Toque no dado de uma perícia ou atributo'}</div>
          </div>
          <BotaoHistorico abrir={abrirHistorico} novas={novasNoHistorico} className="sm:hidden" />
        </div>
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <div className="flex overflow-hidden rounded-md border border-verde-borda" role="group" aria-label="Dado extra no d100">
            {MODOS.map((m) => (
              <button key={m.v} type="button" aria-pressed={modo === m.v} title={m.dica} onClick={() => setModo(m.v)}
                className={`min-h-10 px-2 text-xs sm:px-3 ${modo === m.v ? 'bg-verde-fundo font-semibold text-verde' : 'text-tinta-2 hover:text-tinta'}`}>
                {m.rotulo}
              </button>
            ))}
          </div>
          <form className="flex min-w-0 flex-1 gap-1.5 sm:flex-none" onSubmit={(e) => { e.preventDefault(); if (expr.trim()) rolarLivre(expr.trim()); }}>
            <input value={expr} onChange={(e) => setExpr(e.target.value)} placeholder="2d6+1" spellCheck={false} autoComplete="off"
              aria-label="Rolar dados livres, por exemplo 2d6+1"
              className="min-h-10 w-0 min-w-0 flex-1 rounded-md border border-linha-forte bg-papel px-2 font-mono text-sm sm:w-24 sm:flex-none" />
            <button type="submit" className="botao-primario min-h-10 px-3" aria-label="Rolar expressão"><D20 className="size-5" /><span className="hidden sm:inline">Rolar</span></button>
          </form>
          <BotaoHistorico abrir={abrirHistorico} novas={novasNoHistorico} className="hidden sm:inline-flex" />
        </div>
      </div>
    </div>
  );
}

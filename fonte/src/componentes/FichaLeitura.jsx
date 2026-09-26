// Ficha de um jogador, só para leitura, no painel do mestre. O React escapa todo
// texto, então nada que chega da rede vira HTML.
import { X } from 'lucide-react';
import { COR } from './base.jsx';
import { BarraValor } from '../secoes/Secoes.jsx';
import { fracTexto } from '../lib/modelo.js';

function Corpo({ s }) {
  const cor = COR[s.cor] || COR.neutro;
  switch (s.tipo) {
    case 'atributos':
      return (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(70px,1fr))] gap-1.5">
          {s.itens.map((it) => (
            <li key={it.id} className={`flex flex-col items-center rounded-md border ${cor.borda} ${cor.fundo} px-1 py-1.5`}>
              <span className="rotulo text-[10px] [overflow-wrap:anywhere]">{it.rotulo}</span>
              <span className="font-mono text-lg font-semibold [overflow-wrap:anywhere]">{it.valor || '—'}</span>
              {it.fracoes && <span className="font-mono text-[10px] text-tinta-2">{fracTexto(it.valor)}</span>}
              {it.maximo !== null && (
                <>
                  <span className="font-mono text-[10px] text-tinta-2">máx {it.maximo}</span>
                  <BarraValor valor={it.valor} max={it.maximo} cor={cor.barra} className="mt-0.5" />
                </>
              )}
            </li>
          ))}
        </ul>
      );
    case 'pericias':
      return (
        <ul className="grid gap-x-4 sm:grid-cols-2">
          {s.itens.map((it) => (
            <li key={it.id} className="flex min-h-7 items-center gap-2 border-b border-linha text-sm">
              <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">{it.rotulo}</span>
              <span className="font-mono font-semibold">{it.valor}</span>
              <span className="w-12 text-right font-mono text-[10px] text-tinta-2">{fracTexto(it.valor)}</span>
            </li>
          ))}
        </ul>
      );
    case 'itens': {
      const itens = s.itens.filter((it) => it.nome.trim());
      if (!itens.length) return <p className="text-sm text-tinta-2">Nenhum item.</p>;
      return (
        <ul>
          {itens.map((it) => (
            <li key={it.id} className="flex justify-between gap-2 border-b border-linha py-1 text-sm">
              <span>{it.nome}</span>{it.qtd.trim() && <span className="font-mono text-tinta-2">{it.qtd}</span>}
            </li>
          ))}
        </ul>
      );
    }
    case 'texto':
      return s.texto.trim() ? <p className="whitespace-pre-wrap text-sm">{s.texto}</p> : <p className="text-sm text-tinta-2">—</p>;
    case 'marcadores':
      return (
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          {s.itens.map((it) => (
            <div key={it.id} className="flex items-center gap-2">
              <span className="text-xs font-semibold text-tinta-2">{it.rotulo}</span>
              <div className="flex">
                {it.marcados.map((m, k) => (
                  <span key={k} className={`-mr-px grid h-5 w-4 place-items-center border ${COR[it.cor].borda} ${m ? COR[it.cor].fundo : 'bg-folha'}`}>
                    {m && <X className={`size-3 ${COR[it.cor].tinta}`} strokeWidth={3} />}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      );
    case 'campos':
      return (
        <dl className="flex flex-wrap gap-x-6 gap-y-1">
          {s.itens.map((it) => (
            <div key={it.id} className="min-w-0">
              <dt className="rotulo text-[10px]">{it.rotulo}</dt>
              <dd className="text-sm [overflow-wrap:anywhere]">{it.valor || '—'}</dd>
            </div>
          ))}
        </dl>
      );
    default:
      return null;
  }
}

export function FichaLeitura({ ficha }) {
  if (!ficha.secoes.length) return <p className="text-sm text-tinta-2">Ficha em branco por enquanto.</p>;
  return (
    <div className="flex flex-col gap-4">
      {ficha.secoes.map((s) => {
        const caixa = s.tipo === 'texto' && s.cor !== 'neutro';
        return (
          <section key={s.id} className={`flex flex-col gap-1.5 ${caixa ? `rounded-md border ${COR[s.cor].borda} ${COR[s.cor].fundo} p-2.5` : ''}`}>
            {s.titulo && <h4 className={caixa ? 'text-sm font-semibold' : `font-display text-sm uppercase tracking-wider ${(COR[s.cor] || COR.neutro).tinta}`}>{s.titulo}</h4>}
            <Corpo s={s} />
          </section>
        );
      })}
    </div>
  );
}

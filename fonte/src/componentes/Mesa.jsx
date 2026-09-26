// Quem está na sala e como está: PV, PM, SAN (ou o que tiver máximo) e marcadores.
import { Users } from 'lucide-react';
import { PontoOnline } from './base.jsx';
import { BarraValor } from '../secoes/Secoes.jsx';

// Cor por nome de status, para o olho achar rápido. O resto fica verde.
function corDoContador(rotulo) {
  const r = rotulo.trim().toLowerCase();
  if (/^(pv|vida|hp|pontos de vida)$/.test(r)) return 'bg-rosa';
  if (/^(san|sanidade)$/.test(r)) return 'bg-ambar';
  return 'bg-verde';
}

export function CartaoMembro({ m }) {
  return (
    <li className="flex flex-col gap-2.5 rounded-lg border border-linha bg-folha p-3">
      <div className="flex items-center gap-2">
        <PontoOnline online={m.online} />
        <span className={`min-w-0 flex-1 truncate font-display text-base ${m.nome ? 'text-verde' : 'italic text-tinta-2'}`}>{m.nome || 'Sem nome'}</span>
        {m.voce && <span className="rounded bg-verde-fundo px-1.5 py-0.5 text-[11px] font-semibold text-verde">você</span>}
      </div>
      {m.contadores.length > 0 && (
        <dl className="grid grid-cols-[auto_1fr_auto] items-center gap-x-2 gap-y-1.5">
          {m.contadores.map((c, i) => (
            <div key={i} className="contents">
              <dt className="rotulo w-10 truncate">{c.rotulo}</dt>
              <dd className="min-w-0">{c.max ? <BarraValor valor={c.valor} max={c.max} cor={corDoContador(c.rotulo)} /> : null}</dd>
              <dd className="text-right font-mono text-sm tabular-nums">
                <span className="font-semibold">{c.valor || '—'}</span>
                {c.max && <span className="text-tinta-2">/{c.max}</span>}
              </dd>
            </div>
          ))}
        </dl>
      )}
      {m.marcadores.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {m.marcadores.map((mk, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-16 truncate text-xs text-tinta-2">{mk.rotulo}</span>
              <div className="flex flex-wrap gap-0.5" aria-label={`${mk.rotulo}: ${mk.marcados} de ${mk.total}`} role="img">
                {Array.from({ length: mk.total }, (_, k) => (
                  <span key={k} className={`h-2.5 w-2 rounded-[2px] ${k < mk.marcados ? (mk.cor === 'rosa' ? 'bg-rosa' : 'bg-verde') : 'bg-linha'}`} />
                ))}
              </div>
              <span className="font-mono text-[11px] text-tinta-2">{mk.marcados}/{mk.total}</span>
            </div>
          ))}
        </div>
      )}
      {!m.contadores.length && !m.marcadores.length && (
        <p className="text-xs text-tinta-2">Sem status na ficha ainda.</p>
      )}
    </li>
  );
}

export function Mesa({ membros, codigo, className = '' }) {
  return (
    <section className={`flex flex-col gap-3 ${className}`} aria-labelledby="t-mesa">
      <h2 id="t-mesa" className="flex items-center gap-2 font-display text-lg uppercase tracking-[0.06em] text-verde">
        <Users className="size-5" /> Mesa
        {codigo && <span className="ml-auto font-mono text-sm tracking-wider text-tinta-2">{codigo}</span>}
      </h2>
      {membros.length ? (
        <ul className="flex flex-col gap-2">{membros.map((m) => <CartaoMembro key={m.cid} m={m} />)}</ul>
      ) : (
        <p className="text-sm text-tinta-2">Ninguém na sala ainda. Quem entrar aparece aqui, com PV, PM, SAN e marcadores.</p>
      )}
    </section>
  );
}

// O corpo de cada tipo de seção. Todas leem e mudam a ficha pelo contexto.
import { useLayoutEffect, useRef } from 'react';
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';
import { Minus, Plus, Settings2, X } from 'lucide-react';
import { useFichaCtx } from '../componentes/contexto.js';
import { Arrastavel } from '../componentes/Arrastavel.jsx';
import { COR, D20 } from '../componentes/base.jsx';
import { TIPOS, fracTexto, inteiro } from '../lib/modelo.js';

const idItem = (s, it) => `i:${s.id}:${it.id}`;

function BotaoRemover({ rotulo, onClick }) {
  return (
    <button type="button" onClick={onClick} aria-label={`Remover ${rotulo || 'item'}`} title="Remover"
      className="inline-grid size-8 shrink-0 place-items-center rounded-md text-tinta-2 hover:bg-rosa-fundo hover:text-rosa">
      <X className="size-4" />
    </button>
  );
}

function BotaoAdicionar({ secao }) {
  const { adicionarItem } = useFichaCtx();
  const cor = COR[secao.cor];
  return (
    <button type="button" onClick={() => adicionarItem(secao)}
      className={`inline-flex min-h-11 items-center gap-2 self-start rounded-md border border-dashed ${cor.borda} px-4 font-medium ${cor.tinta} hover:border-solid hover:bg-verde-fundo`}>
      <Plus className="size-4" /> {TIPOS[secao.tipo].add}
    </button>
  );
}

function BotaoRolar({ rotulo, onClick, className = '' }) {
  return (
    <button type="button" onClick={onClick} aria-label={`Rolar ${rotulo}`} title={`Rolar ${rotulo}`}
      className={`inline-grid place-items-center rounded-md text-verde transition-colors hover:bg-verde hover:text-sobre-verde active:scale-95 ${className}`}>
      <D20 className="size-5" />
    </button>
  );
}

// Lista ordenável dos itens de uma seção. O id da seção vai nos dados, para o
// arrasto saber de onde saiu e para onde foi.
function ListaItens({ secao, className, children }) {
  return (
    <SortableContext items={secao.itens.map((it) => idItem(secao, it))} strategy={rectSortingStrategy}>
      <ul className={className}>{children}</ul>
    </SortableContext>
  );
}

function Item({ secao, it, className, children }) {
  const { editando } = useFichaCtx();
  if (!editando) return <li className={className}>{children(null)}</li>;
  return (
    <Arrastavel as="li" id={idItem(secao, it)} dados={{ tipo: 'item', secao: secao.id, tipoSecao: secao.tipo }} className={className}>
      {(alca) => children(alca)}
    </Arrastavel>
  );
}

// ---------------------------------------------------------------- atributos
export function Atributos({ secao }) {
  const { editando, mudarItem, removerItem, rolarAtributo, abrirOpcoes } = useFichaCtx();
  const cor = COR[secao.cor];
  return (
    <>
      <ListaItens secao={secao} className={`grid gap-2 ${editando ? 'grid-cols-[repeat(auto-fill,minmax(118px,1fr))]' : 'grid-cols-[repeat(auto-fill,minmax(92px,1fr))]'}`}>
        {secao.itens.map((it) => (
          <Item key={it.id} secao={secao} it={it} className={`relative flex flex-col items-center gap-0.5 rounded-lg border ${cor.borda} ${cor.fundo} px-2 pb-2.5 pt-2`}>
            {(alca) => (
              <>
                {editando ? (
                  <>
                    <div className="flex w-full items-center justify-between">
                      {alca(`Arrastar ${it.rotulo}`)}
                      <button type="button" className="inline-grid size-8 place-items-center rounded-md text-tinta-2 hover:bg-folha hover:text-tinta" onClick={() => abrirOpcoes(secao, it)} aria-label={`Opções de ${it.rotulo}`} title="Opções">
                        <Settings2 className="size-4" />
                      </button>
                      <BotaoRemover rotulo={it.rotulo} onClick={() => removerItem(secao, it)} />
                    </div>
                    <input className="campo rounded-md border-linha bg-folha text-center text-xs font-medium uppercase tracking-wider" value={it.rotulo}
                      onChange={(e) => mudarItem(secao, it, (x) => { x.rotulo = e.target.value; })} aria-label="Nome do atributo" />
                  </>
                ) : (
                  <div className="flex min-h-8 w-full items-center justify-center">
                    <span className="rotulo px-6 text-center [overflow-wrap:anywhere]">{it.rotulo}</span>
                    {it.rolavel && <BotaoRolar rotulo={it.rotulo} onClick={() => rolarAtributo(it)} className="absolute right-1 top-1 size-8" />}
                  </div>
                )}
                <input className="campo text-center font-mono text-2xl font-semibold" value={it.valor}
                  inputMode={it.texto ? 'text' : 'numeric'} aria-label={it.rotulo}
                  onChange={(e) => mudarItem(secao, it, (x) => { x.valor = e.target.value; })} />
                {it.fracoes && <span className="font-mono text-[11px] tabular-nums text-tinta-2" title="Metade · quinto">{fracTexto(it.valor)}</span>}
                {it.maximo !== null && (
                  <>
                    <label className="flex items-center gap-1 font-mono text-[11px] text-tinta-2">
                      máx
                      <input className="campo w-12 px-1 py-0 text-[11px]" inputMode="numeric" value={it.maximo} aria-label={`${it.rotulo} máximo`}
                        onChange={(e) => mudarItem(secao, it, (x) => { x.maximo = e.target.value; })} />
                    </label>
                    <BarraValor valor={it.valor} max={it.maximo} cor={cor.barra} />
                    <div className="mt-1 flex gap-1.5">
                      {[-1, 1].map((d) => (
                        <button key={d} type="button" aria-label={`${d < 0 ? 'Diminuir' : 'Aumentar'} ${it.rotulo}`}
                          onClick={() => mudarItem(secao, it, (x) => { x.valor = String((inteiro(x.valor) ?? 0) + d); })}
                          className={`inline-grid size-9 place-items-center rounded-md border ${cor.borda} bg-folha text-tinta hover:border-verde active:scale-95`}>
                          {d < 0 ? <Minus className="size-4" /> : <Plus className="size-4" />}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
          </Item>
        ))}
      </ListaItens>
      {editando && <BotaoAdicionar secao={secao} />}
    </>
  );
}

export function BarraValor({ valor, max, cor = 'bg-verde', className = '' }) {
  const v = inteiro(valor);
  const m = inteiro(max);
  if (v === null || !m || m <= 0) return null;
  const p = Math.max(0, Math.min(100, (v / m) * 100));
  return (
    <div className={`h-1.5 w-full overflow-hidden rounded-full bg-linha ${className}`} role="meter" aria-valuemin={0} aria-valuemax={m} aria-valuenow={v}>
      <div className={`h-full rounded-full ${p <= 25 ? 'bg-rosa' : cor} transition-[width]`} style={{ width: `${p}%` }} />
    </div>
  );
}

// ---------------------------------------------------------------- perícias
export function Pericias({ secao }) {
  const { editando, mudarItem, removerItem, rolarPericia } = useFichaCtx();
  const cor = COR[secao.cor];
  return (
    <>
      <ListaItens secao={secao} className="grid gap-x-8 sm:grid-cols-2">
        {secao.itens.map((it) => (
          <Item key={it.id} secao={secao} it={it} className="flex min-h-12 items-center gap-1 border-b border-linha bg-papel">
            {(alca) => (
              <>
                {alca && alca(`Arrastar ${it.rotulo}`)}
                {editando ? (
                  <input className="campo flex-1 text-sm" value={it.rotulo} aria-label="Nome da perícia"
                    onChange={(e) => mudarItem(secao, it, (x) => { x.rotulo = e.target.value; })} />
                ) : (
                  <span className="min-w-0 flex-1 px-1.5 text-sm [overflow-wrap:anywhere]">{it.rotulo}</span>
                )}
                <input className={`campo h-10 w-14 shrink-0 rounded-md ${cor.fundo} text-center font-mono font-semibold`} value={it.valor} inputMode="numeric"
                  aria-label={`Valor de ${it.rotulo}`} onChange={(e) => mudarItem(secao, it, (x) => { x.valor = e.target.value; })} />
                <span className="w-14 shrink-0 text-center font-mono text-[11px] tabular-nums text-tinta-2" title="Metade · quinto">{fracTexto(it.valor)}</span>
                {editando
                  ? <BotaoRemover rotulo={it.rotulo} onClick={() => removerItem(secao, it)} />
                  : <BotaoRolar rotulo={it.rotulo} onClick={() => rolarPericia(it)} className="size-10 shrink-0" />}
              </>
            )}
          </Item>
        ))}
      </ListaItens>
      {editando && <BotaoAdicionar secao={secao} />}
    </>
  );
}

// ---------------------------------------------------------------- itens
export function Itens({ secao }) {
  const { mudarItem, removerItem } = useFichaCtx();
  const cor = COR[secao.cor];
  return (
    <>
      <ListaItens secao={secao} className="flex flex-col">
        {secao.itens.map((it) => (
          <Item key={it.id} secao={secao} it={it} className="flex min-h-11 items-center gap-1 border-b border-linha bg-papel">
            {(alca) => (
              <>
                {alca ? alca(`Arrastar ${it.nome || 'item'}`) : <span className={`mx-3 size-1.5 shrink-0 rotate-45 ${cor.barra}`} aria-hidden="true" />}
                <input className="campo flex-1" value={it.nome} placeholder="Nome do item" aria-label="Item"
                  onChange={(e) => mudarItem(secao, it, (x) => { x.nome = e.target.value; })} />
                <input className="campo w-14 shrink-0 text-center font-mono" value={it.qtd} placeholder="qtd" inputMode="numeric" aria-label={`Quantidade de ${it.nome || 'item'}`}
                  onChange={(e) => mudarItem(secao, it, (x) => { x.qtd = e.target.value; })} />
                <BotaoRemover rotulo={it.nome} onClick={() => removerItem(secao, it)} />
              </>
            )}
          </Item>
        ))}
      </ListaItens>
      {/* Itens entram e saem durante o jogo: adicionar vale nos dois modos. */}
      <BotaoAdicionar secao={secao} />
    </>
  );
}

// ---------------------------------------------------------------- texto
export function Texto({ secao }) {
  const { mudarSecao } = useFichaCtx();
  const ref = useRef(null);
  useLayoutEffect(() => {
    const t = ref.current;
    if (!t) return;
    t.style.height = 'auto';
    t.style.height = `${t.scrollHeight + 2}px`;
  }, [secao.texto]);
  const destacado = secao.cor !== 'neutro';
  return (
    <textarea ref={ref} value={secao.texto} rows={2} placeholder="Escreva aqui…" aria-label={secao.titulo || 'Texto'}
      onChange={(e) => mudarSecao(secao, (s) => { s.texto = e.target.value; })}
      className={`min-h-16 w-full resize-none overflow-hidden rounded-md border px-3 py-2 leading-relaxed focus:outline-2 focus:outline-verde ${destacado ? 'border-transparent bg-transparent px-0 hover:border-linha' : 'border-linha bg-folha'}`} />
  );
}

// ---------------------------------------------------------------- marcadores
export function Marcadores({ secao }) {
  const { editando, mudarItem, removerItem } = useFichaCtx();
  return (
    <>
      <ListaItens secao={secao} className="flex flex-wrap gap-x-10 gap-y-4">
        {secao.itens.map((it) => {
          const c = COR[it.cor];
          return (
            <Item key={it.id} secao={secao} it={it} className="flex flex-wrap items-center gap-2 bg-papel">
              {(alca) => (
                <>
                  {alca && alca(`Arrastar ${it.rotulo}`)}
                  {editando ? (
                    <>
                      <input className="campo w-32 border-linha bg-folha text-sm font-semibold" value={it.rotulo} aria-label="Nome do marcador"
                        onChange={(e) => mudarItem(secao, it, (x) => { x.rotulo = e.target.value; })} />
                      <label className="flex items-center gap-1 text-xs text-tinta-2">
                        caixas
                        <input type="number" min={1} max={40} className="campo w-14 border-linha bg-folha text-center font-mono" defaultValue={it.total} key={it.total}
                          aria-label={`Número de caixas de ${it.rotulo}`}
                          onBlur={(e) => mudarItem(secao, it, (x) => {
                            const n = Math.max(1, Math.min(40, inteiro(e.target.value) || 1));
                            x.total = n;
                            x.marcados = Array.from({ length: n }, (_, i) => !!x.marcados[i]);
                          }, true)}
                          onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }} />
                      </label>
                      <div className="flex" role="group" aria-label="Cor do marcador">
                        {['verde', 'rosa'].map((k) => (
                          <button key={k} type="button" aria-pressed={it.cor === k} aria-label={`Cor ${k}`} title={`Cor ${k}`}
                            onClick={() => mudarItem(secao, it, (x) => { x.cor = k; }, true)}
                            className="inline-grid size-8 place-items-center rounded-full">
                            <span className={`size-4 rounded-full border ${COR[k].borda} ${COR[k].fundo} ${it.cor === k ? 'ring-2 ring-tinta ring-offset-2 ring-offset-papel' : ''}`} />
                          </button>
                        ))}
                      </div>
                      <BotaoRemover rotulo={it.rotulo} onClick={() => removerItem(secao, it)} />
                    </>
                  ) : (
                    <span className="min-w-16 text-sm font-semibold text-tinta-2">{it.rotulo}</span>
                  )}
                  <div className="flex flex-wrap" role="group" aria-label={it.rotulo}>
                    {it.marcados.map((m, k) => (
                      <button key={k} type="button" aria-pressed={m} aria-label={`${it.rotulo} ${k + 1}`}
                        onClick={() => mudarItem(secao, it, (x) => { x.marcados[k] = !x.marcados[k]; })}
                        className={`-mr-px grid h-9 w-7 place-items-center border ${c.borda} ${m ? c.fundo : 'bg-folha'} first:rounded-l-md last:rounded-r-md hover:bg-verde-fundo`}>
                        {m && <X className={`size-5 ${c.tinta}`} strokeWidth={2.5} />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </Item>
          );
        })}
      </ListaItens>
      {editando && <BotaoAdicionar secao={secao} />}
    </>
  );
}

// ---------------------------------------------------------------- campos
export function Campos({ secao }) {
  const { editando, mudarItem, removerItem } = useFichaCtx();
  return (
    <>
      <ListaItens secao={secao} className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-x-5 gap-y-3">
        {secao.itens.map((it) => (
          <Item key={it.id} secao={secao} it={it} className="flex flex-col gap-0.5 bg-papel">
            {(alca) => (
              <>
                {editando ? (
                  <div className="flex items-center gap-1">
                    {alca(`Arrastar ${it.rotulo}`)}
                    <input className="campo flex-1 text-xs font-medium uppercase tracking-wider" value={it.rotulo} aria-label="Nome do campo"
                      onChange={(e) => mudarItem(secao, it, (x) => { x.rotulo = e.target.value; })} />
                    <BotaoRemover rotulo={it.rotulo} onClick={() => removerItem(secao, it)} />
                  </div>
                ) : (
                  <span className="rotulo px-1.5">{it.rotulo}</span>
                )}
                <input className="campo rounded-none border-b-linha-forte text-base" value={it.valor} aria-label={it.rotulo}
                  onChange={(e) => mudarItem(secao, it, (x) => { x.valor = e.target.value; })} />
              </>
            )}
          </Item>
        ))}
      </ListaItens>
      {editando && <BotaoAdicionar secao={secao} />}
    </>
  );
}

export const CORPOS = { atributos: Atributos, pericias: Pericias, itens: Itens, texto: Texto, marcadores: Marcadores, campos: Campos };

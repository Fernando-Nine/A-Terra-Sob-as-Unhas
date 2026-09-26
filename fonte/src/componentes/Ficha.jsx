// A ficha editável. Um DndContext só para tudo: seções se reordenam entre si e
// itens podem ir para outra seção do mesmo tipo.
import { useMemo, useState } from 'react';
import {
  DndContext, KeyboardSensor, PointerSensor, closestCenter, pointerWithin, useSensor, useSensors,
} from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { ChevronDown, ChevronUp, Copy, Trash2 } from 'lucide-react';
import { FichaCtx, useFichaCtx } from './contexto.js';
import { Arrastavel } from './Arrastavel.jsx';
import { COR, Dialogo } from './base.jsx';
import { CORPOS } from '../secoes/Secoes.jsx';
import {
  CORES, NOME_COR, ORDEM_NOVAS, TIPOS, copiarSecao, nomeDoItem, normalizarItem, novaSecao,
} from '../lib/modelo.js';

const idSecao = (s) => `s:${s.id}`;

// Colisão: item só cai em item/seção do mesmo tipo; seção só cai em seção.
function colisao(args) {
  const ativo = args.active.data.current;
  if (!ativo) return closestCenter(args);
  const alvos = args.droppableContainers.filter((c) => {
    const d = c.data.current;
    if (!d) return false;
    if (ativo.tipo === 'secao') return d.tipo === 'secao';
    return d.tipoSecao === ativo.tipoSecao && (d.tipo === 'item' || d.tipo === 'secao');
  });
  if (ativo.tipo === 'item') {
    const itens = alvos.filter((c) => c.data.current.tipo === 'item');
    const sob = pointerWithin({ ...args, droppableContainers: itens });
    if (sob.length) return sob;
    const secoes = pointerWithin({ ...args, droppableContainers: alvos.filter((c) => c.data.current.tipo === 'secao') });
    if (secoes.length) return secoes;
    return closestCenter({ ...args, droppableContainers: itens });
  }
  return closestCenter({ ...args, droppableContainers: alvos });
}

export function Ficha({ ficha, atualizar, editando, rolarD100, rolarExpressao, avisar }) {
  const [opcoes, setOpcoes] = useState(null); // { secao, item }
  const sensores = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const ctx = useMemo(() => {
    const achar = (f, s) => f.secoes.find((x) => x.id === s.id);
    return {
      editando,
      mudarSecao: (s, fn, desf = false) => atualizar((f) => { const x = achar(f, s); if (x) fn(x); }, desf),
      mudarItem: (s, it, fn, desf = false) => atualizar((f) => {
        const x = achar(f, s)?.itens.find((i) => i.id === it.id);
        if (x) fn(x);
      }, desf),
      adicionarItem: (s) => atualizar((f) => {
        const x = achar(f, s);
        if (x) x.itens.push(normalizarItem(x.tipo, TIPOS[x.tipo].novoItem()));
      }, true),
      removerItem: (s, it) => {
        atualizar((f) => { const x = achar(f, s); if (x) x.itens = x.itens.filter((i) => i.id !== it.id); }, true);
        const nome = nomeDoItem(s.tipo, it);
        avisar(`${nome ? `“${nome}”` : 'Item'} removido`, true);
      },
      rolarAtributo: (it) => (it.texto ? rolarExpressao(it.valor, it.rotulo) : rolarD100(it.rotulo || 'Atributo', it.valor)),
      rolarPericia: (it) => rolarD100(it.rotulo || 'Perícia', it.valor),
      abrirOpcoes: (s, it) => setOpcoes({ secao: s, item: it }),
    };
  }, [editando, atualizar, rolarD100, rolarExpressao, avisar]);

  function aoSoltar({ active, over }) {
    if (!over || active.id === over.id) return;
    const a = active.data.current;
    const o = over.data.current;
    if (!a || !o) return;
    if (a.tipo === 'secao') {
      atualizar((f) => {
        const de = f.secoes.findIndex((s) => idSecao(s) === active.id);
        const para = f.secoes.findIndex((s) => idSecao(s) === over.id);
        if (de < 0 || para < 0) return;
        f.secoes = arrayMove(f.secoes, de, para);
      }, true);
      return;
    }
    const [, secDe, itemId] = String(active.id).split(':');
    const secPara = o.tipo === 'item' ? String(over.id).split(':')[1] : String(over.id).slice(2);
    atualizar((f) => {
      const origem = f.secoes.find((s) => s.id === secDe);
      const destino = f.secoes.find((s) => s.id === secPara);
      if (!origem || !destino || origem.tipo !== destino.tipo) return;
      const de = origem.itens.findIndex((i) => i.id === itemId);
      if (de < 0) return;
      let para = o.tipo === 'item' ? destino.itens.findIndex((i) => `i:${destino.id}:${i.id}` === over.id) : destino.itens.length;
      if (origem === destino) {
        if (para < 0) para = destino.itens.length - 1;
        origem.itens = arrayMove(origem.itens, de, para);
      } else {
        const [item] = origem.itens.splice(de, 1);
        destino.itens.splice(para < 0 ? destino.itens.length : para, 0, item);
      }
    }, true);
  }

  return (
    <FichaCtx.Provider value={ctx}>
      <DndContext sensors={sensores} collisionDetection={colisao} onDragEnd={aoSoltar}>
        <SortableContext items={ficha.secoes.map(idSecao)} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-8">
            {ficha.secoes.map((s, i) => (
              <Secao key={s.id} secao={s} indice={i} total={ficha.secoes.length} atualizar={atualizar} avisar={avisar} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      {editando && <NovaSecao atualizar={atualizar} />}
      <DialogoOpcoes estado={opcoes} fechar={() => setOpcoes(null)} atualizar={atualizar} />
    </FichaCtx.Provider>
  );
}

function Secao({ secao, indice, total, atualizar, avisar }) {
  const { editando } = useFichaCtx();
  const Corpo = CORPOS[secao.tipo];
  const cor = COR[secao.cor];
  const caixa = secao.tipo === 'texto' && secao.cor !== 'neutro';
  const base = `flex min-w-0 flex-col gap-3 ${caixa ? `rounded-lg border ${cor.borda} ${cor.fundo} p-4` : ''}`;

  if (!editando) {
    return (
      <section className={base} aria-label={secao.titulo || TIPOS[secao.tipo].nome}>
        {secao.titulo && (caixa
          ? <h2 className="text-sm font-semibold text-tinta">{secao.titulo}</h2>
          : <h2 className={`titulo-secao ${cor.tinta}`}>{secao.titulo}</h2>)}
        <Corpo secao={secao} />
      </section>
    );
  }

  const mover = (d) => atualizar((f) => {
    const i = f.secoes.findIndex((s) => s.id === secao.id);
    if (i + d < 0 || i + d >= f.secoes.length) return;
    f.secoes = arrayMove(f.secoes, i, i + d);
  }, true);

  return (
    <Arrastavel as="section" id={idSecao(secao)} dados={{ tipo: 'secao', tipoSecao: secao.tipo }}
      className={`${base} rounded-xl bg-papel outline-1 outline-offset-8 outline-linha-forte outline-dashed`}>
      {(alca) => (
        <>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {alca(`Arrastar a seção ${secao.titulo}`)}
            <input className={`campo min-w-40 flex-1 border-b-linha-forte titulo-secao ${cor.tinta} rounded-none`} value={secao.titulo}
              placeholder="Sem título" aria-label="Título da seção"
              onChange={(e) => atualizar((f) => { const s = f.secoes.find((x) => x.id === secao.id); if (s) s.titulo = e.target.value; })} />
            <div className="flex flex-wrap items-center gap-0.5">
              <span className="rotulo mr-1 rounded bg-linha/60 px-1.5 py-0.5">{TIPOS[secao.tipo].nome}</span>
              <div className="flex" role="group" aria-label="Cor da seção">
                {CORES.map((c) => (
                  <button key={c} type="button" aria-pressed={secao.cor === c} aria-label={`Cor: ${NOME_COR[c]}`} title={`Cor: ${NOME_COR[c]}`}
                    onClick={() => atualizar((f) => { const s = f.secoes.find((x) => x.id === secao.id); if (s) s.cor = c; }, true)}
                    className="inline-grid size-8 place-items-center rounded-full">
                    <span className={`size-4 rounded-full border ${COR[c].borda} ${COR[c].fundo} ${secao.cor === c ? 'ring-2 ring-tinta ring-offset-2 ring-offset-papel' : ''}`} />
                  </button>
                ))}
              </div>
              <button type="button" className="botao-icone size-8" onClick={() => mover(-1)} disabled={indice === 0} aria-label="Subir seção" title="Subir"><ChevronUp className="size-4" /></button>
              <button type="button" className="botao-icone size-8" onClick={() => mover(1)} disabled={indice === total - 1} aria-label="Descer seção" title="Descer"><ChevronDown className="size-4" /></button>
              <button type="button" className="botao-icone size-8" title="Duplicar" aria-label="Duplicar seção"
                onClick={() => { atualizar((f) => { const i = f.secoes.findIndex((s) => s.id === secao.id); f.secoes.splice(i + 1, 0, copiarSecao(f.secoes[i])); }, true); avisar('Seção duplicada', true); }}>
                <Copy className="size-4" />
              </button>
              <button type="button" className="botao-icone size-8 hover:bg-rosa-fundo hover:text-rosa" title="Excluir" aria-label="Excluir seção"
                onClick={() => { atualizar((f) => { f.secoes = f.secoes.filter((s) => s.id !== secao.id); }, true); avisar(`Seção ${secao.titulo ? `“${secao.titulo}” ` : ''}excluída`, true); }}>
                <Trash2 className="size-4" />
              </button>
            </div>
          </div>
          <Corpo secao={secao} />
        </>
      )}
    </Arrastavel>
  );
}

function NovaSecao({ atualizar }) {
  return (
    <div className="mt-8 flex flex-col gap-3 rounded-xl border-2 border-dashed border-linha-forte p-4">
      <h2 className="rotulo">Adicionar seção</h2>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-2">
        {ORDEM_NOVAS.map((t) => (
          <button key={t} type="button" onClick={() => atualizar((f) => { f.secoes.push(novaSecao(t)); }, true)}
            className="flex min-h-14 flex-col items-start rounded-lg border border-verde-borda bg-folha px-3 py-2 text-left transition-colors hover:bg-verde-fundo">
            <span className="font-semibold text-verde">+ {TIPOS[t].nome}</span>
            <span className="text-xs text-tinta-2">{TIPOS[t].descricao}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function DialogoOpcoes({ estado, fechar, atualizar }) {
  const it = estado?.item;
  const [rascunho, setRascunho] = useState(null);
  const atual = rascunho && it && rascunho.id === it.id ? rascunho : it && {
    id: it.id, fracoes: it.fracoes, rolavel: it.rolavel, maximo: it.maximo !== null, texto: it.texto,
  };
  const opcao = (chave, rotulo) => (
    <label className="flex min-h-11 cursor-pointer items-center gap-3">
      <input type="checkbox" className="size-5 accent-verde" checked={!!atual?.[chave]}
        onChange={(e) => setRascunho({ ...atual, [chave]: e.target.checked })} />
      {rotulo}
    </label>
  );
  const aplicar = () => {
    const r = atual;
    atualizar((f) => {
      const x = f.secoes.find((s) => s.id === estado.secao.id)?.itens.find((i) => i.id === it.id);
      if (!x) return;
      x.fracoes = r.fracoes; x.rolavel = r.rolavel; x.texto = r.texto;
      if (r.maximo) { if (x.maximo === null) x.maximo = x.valor; } else x.maximo = null;
    }, true);
    setRascunho(null);
    fechar();
  };
  return (
    <Dialogo aberto={!!estado} fechar={() => { setRascunho(null); fechar(); }} titulo={`Opções de ${it?.rotulo || 'atributo'}`}>
      <div className="flex flex-col">
        {opcao('fracoes', 'Mostrar metade e quinto')}
        {opcao('rolavel', 'Mostrar o dado para rolar')}
        {opcao('maximo', 'Tem máximo, com barra e botões − e +')}
        {opcao('texto', 'Valor em texto (ex.: +1d4)')}
        <p className="mt-1 text-sm text-tinta-2">Com valor em texto, o dado rola a expressão escrita no valor. Atributos com máximo aparecem no status da mesa.</p>
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" className="botao" onClick={() => { setRascunho(null); fechar(); }}>Cancelar</button>
        <button type="button" className="botao-primario" onClick={aplicar}>Aplicar</button>
      </div>
    </Dialogo>
  );
}

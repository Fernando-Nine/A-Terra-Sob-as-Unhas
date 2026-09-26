// A página do jogador: a ficha, a barra de dados, a mesa e o histórico.
import { useCallback, useEffect, useState } from 'react';
import { Check, Pencil, Undo2, Users, X } from 'lucide-react';
import { useFicha, lerLocal, gravarLocal } from './lib/useFicha.js';
import { useSala, limparCodigo } from './lib/sala.js';
import { useDados } from './lib/useDados.js';
import { useAviso } from './lib/useAviso.js';
import { fichaVazia, normalizar } from './lib/modelo.js';
import { Ficha } from './componentes/Ficha.jsx';
import { BarraDados } from './componentes/BarraDados.jsx';
import { JanelaHistorico } from './componentes/Historico.jsx';
import { Mesa } from './componentes/Mesa.jsx';
import { BotaoSala, DialogoSala } from './componentes/Sala.jsx';
import { MenuArquivo } from './componentes/MenuArquivo.jsx';
import { Aviso } from './componentes/base.jsx';

const CHAVE_EDITANDO = 'terra-sob-as-unhas:editando';
const CHAVE_SALA = 'terra-sob-as-unhas:sala';
const TEXTO_SALVO = { nova: 'Ficha nova', salvando: 'Salvando…', salvo: 'Salvo neste aparelho', erro: 'Não consegui salvar aqui: exporte uma cópia' };

export function PaginaFicha() {
  const { ficha, atualizar, desfazer, podeDesfazer, salvo } = useFicha();
  const { aviso, avisar, limpar } = useAviso();
  const [editando, setEditando] = useState(() => !ficha.secoes.length || lerLocal(CHAVE_EDITANDO) === '1');
  const [codigo, setCodigo] = useState(() => limparCodigo(new URLSearchParams(location.search).get('sala')) || lerLocal(CHAVE_SALA, ''));
  const [dialogoSala, setDialogoSala] = useState(false);
  const [historicoAberto, setHistoricoAberto] = useState(false);
  const [mesaAberta, setMesaAberta] = useState(false);

  const sala = useSala({ codigo, papel: 'jogador', ficha });
  const dados = useDados({ registrar: sala.registrarRolagem, historico: sala.historico, historicoAberto, avisar });

  useEffect(() => { if (codigo) gravarLocal(CHAVE_SALA, codigo); }, [codigo]);
  useEffect(() => { gravarLocal(CHAVE_EDITANDO, editando ? '1' : '0'); }, [editando]);
  useEffect(() => { document.title = ficha.titulo ? `${ficha.titulo} · A Terra Sob as Unhas` : 'A Terra Sob as Unhas'; }, [ficha.titulo]);

  const voltar = useCallback(() => { limpar(); if (desfazer()) avisar('Desfeito'); }, [desfazer, avisar, limpar]);

  useEffect(() => {
    const tecla = (e) => {
      if (e.target.closest?.('input, textarea')) return;
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z') { e.preventDefault(); voltar(); }
    };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [voltar]);

  const entrar = (c) => { setCodigo(c); setDialogoSala(false); avisar(`Você entrou na sala ${c}`); };
  const sair = () => {
    sala.sair();
    setCodigo('');
    gravarLocal(CHAVE_SALA, null);
    setDialogoSala(false);
    avisar('Você saiu da sala');
  };

  const exportar = () => {
    const base = (ficha.titulo || 'ficha').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'ficha';
    const url = URL.createObjectURL(new Blob([JSON.stringify(ficha, null, 2)], { type: 'application/json' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: `${base}.json` });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    avisar('Ficha exportada');
  };
  const importar = async (arquivo) => {
    let dados = null;
    try { dados = JSON.parse(await arquivo.text()); } catch { /* tratado abaixo */ }
    if (!dados || !Array.isArray(dados.secoes)) { avisar('Esse arquivo não é uma ficha exportada daqui'); return; }
    atualizar(() => normalizar(dados), true);
    avisar('Ficha importada', true);
  };
  const emBranco = () => { atualizar(() => fichaVazia(), true); setEditando(true); avisar('Ficha em branco', true); };

  const emSala = !!codigo;
  const vazia = !ficha.secoes.length;

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-linha bg-papel/90 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-2">
          <div className="min-w-0 flex-1">
            <div className="hidden sm:block">
              <div className="truncate font-display text-sm text-verde">A Terra Sob as Unhas</div>
              <div className="truncate text-xs text-tinta-2" aria-live="polite">{TEXTO_SALVO[salvo]}</div>
            </div>
          </div>
          <BotaoSala codigo={codigo} conexao={sala.conexao} onClick={() => setDialogoSala(true)} />
          {emSala && (
            <button type="button" className="botao-icone relative lg:hidden" onClick={() => setMesaAberta(true)} aria-label="Ver a mesa" title="Mesa">
              <Users className="size-5" />
              {sala.membros.length > 0 && <span className="absolute right-0.5 top-0.5 grid min-w-4 place-items-center rounded-full bg-verde px-1 text-[10px] font-bold text-sobre-verde">{sala.membros.length}</span>}
            </button>
          )}
          {(editando || podeDesfazer) && (
            <button type="button" className="botao-icone" onClick={voltar} disabled={!podeDesfazer} aria-label="Desfazer" title="Desfazer (Ctrl+Z)"><Undo2 className="size-5" /></button>
          )}
          <button type="button" aria-pressed={editando} onClick={() => setEditando((e) => !e)}
            className={editando ? 'botao-primario min-h-10 px-3' : 'botao min-h-10 px-3'}>
            {editando ? <Check className="size-4" /> : <Pencil className="size-4" />}
            <span>{editando ? 'Concluir' : 'Editar'}</span>
          </button>
          <MenuArquivo exportar={exportar} importar={importar} emBranco={emBranco} />
        </div>
      </header>

      <div className={`mx-auto grid gap-10 px-4 pb-44 pt-6 ${emSala ? 'max-w-6xl lg:grid-cols-[minmax(0,1fr)_300px]' : 'max-w-4xl'}`}>
        <main className="flex min-w-0 flex-col gap-6">
          {editando ? (
            <input className="campo rounded-none border-b-linha-forte border-dashed px-0 font-display text-3xl text-verde sm:text-4xl" value={ficha.titulo}
              placeholder="Nome da personagem" aria-label="Nome da personagem"
              onChange={(e) => atualizar((f) => { f.titulo = e.target.value; })} />
          ) : (
            <h1 className={`font-display text-3xl sm:text-4xl ${ficha.titulo ? 'text-verde' : 'italic text-tinta-2'}`}>{ficha.titulo || 'Personagem sem nome'}</h1>
          )}
          {vazia && (
            <p className="max-w-prose text-tinta-2">
              {editando
                ? 'Ficha em branco. Dê um nome à personagem e escolha abaixo o que ela precisa: status, atributos, perícias, equipamento, textos, marcadores ou campos livres.'
                : <>Ficha em branco. Toque em <b>Editar</b> para montar a sua.</>}
            </p>
          )}
          <Ficha ficha={ficha} atualizar={atualizar} editando={editando} rolarD100={dados.rolarD100} rolarExpressao={dados.rolarExpressao} avisar={avisar} />
        </main>

        {emSala && (
          <aside className="hidden lg:block">
            <div className="sticky top-20"><Mesa membros={sala.membros} codigo={codigo} /></div>
          </aside>
        )}
      </div>

      {emSala && mesaAberta && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-label="Mesa">
          <button type="button" className="absolute inset-0 bg-tinta/40" aria-label="Fechar a mesa" onClick={() => setMesaAberta(false)} />
          <div className="absolute inset-y-0 right-0 flex w-[min(360px,90vw)] flex-col gap-3 overflow-y-auto bg-papel p-4 pt-[calc(1rem+env(safe-area-inset-top))] shadow-2xl">
            <button type="button" className="botao-icone self-end" onClick={() => setMesaAberta(false)} aria-label="Fechar"><X className="size-5" /></button>
            <Mesa membros={sala.membros} codigo={codigo} />
          </div>
        </div>
      )}

      <div className="pointer-events-none fixed inset-x-0 bottom-36 z-50 flex justify-center px-4 sm:bottom-24">
        <Aviso aviso={aviso} desfazer={voltar} />
      </div>

      <BarraDados ultima={dados.ultima} modo={dados.modo} setModo={dados.setModo}
        rolarLivre={(e) => dados.rolarExpressao(e, '')} abrirHistorico={() => setHistoricoAberto((a) => !a)} novasNoHistorico={dados.novas} />
      <JanelaHistorico aberta={historicoAberto} fechar={() => setHistoricoAberto(false)} historico={sala.historico} meuCid={sala.cid} emSala={emSala} />
      <DialogoSala aberto={dialogoSala} fechar={() => setDialogoSala(false)} codigo={codigo} conexao={sala.conexao} entrar={entrar} sair={sair} />
    </>
  );
}

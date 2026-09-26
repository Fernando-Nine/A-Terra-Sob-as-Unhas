// Botão da sala na barra do topo e o diálogo de entrar/sair.
import { useState } from 'react';
import { Check, Copy, DoorOpen, LogOut, Radio } from 'lucide-react';
import { Dialogo } from './base.jsx';
import { TEXTO_CONEXAO, limparCodigo } from '../lib/sala.js';

const COR_CONEXAO = {
  conectado: 'bg-verde',
  conectando: 'bg-tinta-2',
  reconectando: 'bg-rosa',
  'sem-conexao': 'bg-rosa',
};

export function BotaoSala({ codigo, conexao, onClick }) {
  return (
    <button type="button" onClick={onClick}
      className={`inline-flex min-h-10 items-center gap-2 rounded-md border px-3 text-sm transition-colors ${codigo ? 'border-verde-borda bg-verde-fundo text-verde hover:border-verde' : 'border-linha-forte bg-folha hover:border-verde hover:text-verde'}`}
      title={codigo ? `Sala ${codigo} · ${TEXTO_CONEXAO[conexao]}` : 'Entrar numa sala'}>
      {codigo ? (
        <>
          <span className={`size-2 rounded-full ${COR_CONEXAO[conexao] || 'bg-tinta-2'} ${conexao === 'conectado' ? 'ring-3 ring-verde/20' : ''}`} />
          <span className="font-mono font-semibold tracking-wider">{codigo}</span>
        </>
      ) : (
        <><Radio className="size-4" /><span>Sala</span></>
      )}
    </button>
  );
}

export function DialogoSala({ aberto, fechar, codigo, conexao, entrar, sair }) {
  const [digitado, setDigitado] = useState('');
  const [copiado, setCopiado] = useState(false);
  const link = codigo ? `${location.origin}${location.pathname}?sala=${codigo}${new URLSearchParams(location.search).get('broker') ? `&broker=${encodeURIComponent(new URLSearchParams(location.search).get('broker'))}` : ''}` : '';
  const copiar = async () => {
    try { await navigator.clipboard.writeText(link); setCopiado(true); setTimeout(() => setCopiado(false), 2000); } catch { /* sem permissão: o link está visível para copiar à mão */ }
  };

  return (
    <Dialogo aberto={aberto} fechar={fechar} titulo={codigo ? `Sala ${codigo}` : 'Entrar numa sala'}>
      {codigo ? (
        <>
          <p className={`flex items-center gap-2 font-medium ${conexao === 'conectado' ? 'text-verde' : conexao === 'conectando' ? 'text-tinta-2' : 'text-rosa'}`}>
            <span className={`size-2.5 rounded-full ${COR_CONEXAO[conexao]}`} />
            {conexao === 'conectado' ? 'Conectado. A mesa vê seu status e suas rolagens; o mestre vê sua ficha.' : TEXTO_CONEXAO[conexao]}
          </p>
          <div className="flex flex-col gap-1">
            <span className="rotulo">Chame mais gente com este link</span>
            <div className="flex gap-2">
              <input readOnly value={link} onFocus={(e) => e.target.select()} className="min-h-11 min-w-0 flex-1 rounded-md border border-linha-forte bg-papel px-2 font-mono text-xs" aria-label="Link da sala" />
              <button type="button" className="botao px-3" onClick={copiar}>{copiado ? <Check className="size-4" /> : <Copy className="size-4" />}{copiado ? 'Copiado' : 'Copiar'}</button>
            </div>
          </div>
          <div className="flex flex-wrap justify-between gap-2">
            <button type="button" className="botao text-rosa hover:border-rosa hover:text-rosa" onClick={() => { sair(); }}>
              <LogOut className="size-4" /> Sair da sala
            </button>
            <button type="button" className="botao-primario" onClick={fechar}>Continuar jogando</button>
          </div>
        </>
      ) : (
        <>
          <p className="text-sm text-tinta-2">Digite o código que o mestre passou. A mesa vai ver seu PV, PM, SAN, marcadores e rolagens; o mestre vê a ficha inteira.</p>
          <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); const c = limparCodigo(digitado); if (c) { entrar(c); setDigitado(''); } }}>
            <input autoFocus value={digitado} onChange={(e) => setDigitado(e.target.value)} placeholder="Código, ex.: K7PX2M"
              autoComplete="off" autoCapitalize="characters" spellCheck={false} aria-label="Código da sala"
              className="min-h-11 min-w-0 flex-1 rounded-md border border-linha-forte bg-papel px-3 font-mono text-base uppercase tracking-widest placeholder:font-sans placeholder:normal-case placeholder:tracking-normal" />
            <button type="submit" className="botao-primario"><DoorOpen className="size-4" /> Entrar</button>
          </form>
          <p className="text-sm text-tinta-2">É o mestre? <a className="font-medium text-verde underline underline-offset-2" href="mestre.html">Abrir o painel do mestre</a></p>
        </>
      )}
    </Dialogo>
  );
}

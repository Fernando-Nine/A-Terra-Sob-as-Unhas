// Pecas pequenas usadas no app inteiro.
import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

// Classes completas (o Tailwind so gera o que aparece escrito por inteiro).
export const COR = {
  verde: { borda: 'border-verde-borda', fundo: 'bg-verde-fundo', tinta: 'text-verde', barra: 'bg-verde' },
  rosa: { borda: 'border-rosa-borda', fundo: 'bg-rosa-fundo', tinta: 'text-rosa', barra: 'bg-rosa' },
  neutro: { borda: 'border-linha-forte', fundo: 'bg-folha', tinta: 'text-verde', barra: 'bg-verde' },
};

// O d20: o simbolo de "rolar" no app inteiro.
export function D20({ className = 'size-5' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" strokeLinecap="round" className={className} aria-hidden="true">
      <path d="M12 2.5 20.5 7.3v9.4L12 21.5l-8.5-4.8V7.3Z" />
      <path d="M12 7 16.6 15H7.4Z" />
      <path d="M12 2.5V7M20.5 7.3 16.6 15M3.5 7.3 7.4 15M7.4 15l-3.9 1.7M16.6 15l3.9 1.7M7.4 15 12 21.5 16.6 15" />
    </svg>
  );
}

export function PontoOnline({ online, className = '' }) {
  return (
    <span
      className={`inline-block size-2.5 shrink-0 rounded-full ${online ? 'bg-verde ring-3 ring-verde-fundo' : 'bg-linha-forte'} ${className}`}
      title={online ? 'Online' : 'Offline'}
    />
  );
}

// <dialog> nativo: foco preso, Esc fecha, fundo escurecido — de graca.
export function Dialogo({ aberto, fechar, titulo, children, largura = 'max-w-md' }) {
  const ref = useRef(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (aberto && !d.open) d.showModal();
    if (!aberto && d.open) d.close();
  }, [aberto]);
  return (
    <dialog
      ref={ref}
      onClose={fechar}
      onClick={(e) => { if (e.target === ref.current) fechar(); }}
      className={`m-auto w-[calc(100vw-2rem)] ${largura} rounded-xl border border-linha-forte bg-folha p-0 text-tinta shadow-2xl`}
      aria-label={titulo}
    >
      {aberto && (
        <div className="flex flex-col gap-4 p-5">
          <div className="flex items-start justify-between gap-4">
            <h2 className="font-display text-xl text-verde">{titulo}</h2>
            <button type="button" className="botao-icone -mr-2 -mt-2" onClick={fechar} aria-label="Fechar"><X className="size-5" /></button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  );
}

export function Aviso({ aviso, desfazer }) {
  if (!aviso) return null;
  return (
    <div role="status" className="pointer-events-auto flex max-w-[calc(100vw-2rem)] items-center gap-3 rounded-lg bg-tinta py-1.5 pl-4 pr-1.5 text-sm text-papel shadow-xl">
      <span>{aviso.texto}</span>
      {aviso.desfazivel && (
        <button type="button" onClick={desfazer} className="min-h-9 rounded-md px-3 font-semibold underline underline-offset-2 hover:bg-white/10">Desfazer</button>
      )}
    </div>
  );
}

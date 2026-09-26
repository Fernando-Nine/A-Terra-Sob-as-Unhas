// Menu "⋮": exportar, importar e começar em branco.
import { useEffect, useRef, useState } from 'react';
import { Download, FilePlus2, MoreVertical, Upload } from 'lucide-react';

export function MenuArquivo({ exportar, importar, emBranco }) {
  const [aberto, setAberto] = useState(false);
  const raiz = useRef(null);
  const arquivo = useRef(null);
  useEffect(() => {
    if (!aberto) return undefined;
    const fora = (e) => { if (!raiz.current?.contains(e.target)) setAberto(false); };
    const esc = (e) => { if (e.key === 'Escape') setAberto(false); };
    document.addEventListener('pointerdown', fora);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('pointerdown', fora); document.removeEventListener('keydown', esc); };
  }, [aberto]);

  const item = 'flex min-h-11 w-full items-center gap-3 rounded-md px-3 text-left hover:bg-verde-fundo';
  return (
    <div ref={raiz} className="relative">
      <button type="button" className="botao-icone" aria-label="Mais opções" aria-haspopup="menu" aria-expanded={aberto} onClick={() => setAberto((a) => !a)}>
        <MoreVertical className="size-5" />
      </button>
      {aberto && (
        <div role="menu" className="absolute right-0 top-[calc(100%+6px)] z-50 flex w-64 flex-col rounded-lg border border-linha-forte bg-folha p-1 shadow-xl">
          <button type="button" role="menuitem" className={item} onClick={() => { setAberto(false); exportar(); }}><Download className="size-4 text-tinta-2" /> Exportar ficha (.json)</button>
          <button type="button" role="menuitem" className={item} onClick={() => { setAberto(false); arquivo.current?.click(); }}><Upload className="size-4 text-tinta-2" /> Importar ficha…</button>
          <button type="button" role="menuitem" className={item} onClick={() => { setAberto(false); emBranco(); }}><FilePlus2 className="size-4 text-tinta-2" /> Começar ficha em branco</button>
        </div>
      )}
      <input ref={arquivo} type="file" accept="application/json,.json" hidden aria-hidden="true"
        onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) importar(f); }} />
    </div>
  );
}

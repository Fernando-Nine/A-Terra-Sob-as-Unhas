import { useCallback, useRef, useState } from 'react';

// Aviso curto no rodapé; com "desfazivel", mostra o botão Desfazer.
export function useAviso() {
  const [aviso, setAviso] = useState(null);
  const timer = useRef(null);
  const avisar = useCallback((texto, desfazivel = false) => {
    clearTimeout(timer.current);
    setAviso({ texto, desfazivel, id: Date.now() });
    timer.current = setTimeout(() => setAviso(null), desfazivel ? 6000 : 3000);
  }, []);
  const limpar = useCallback(() => { clearTimeout(timer.current); setAviso(null); }, []);
  return { aviso, avisar, limpar };
}

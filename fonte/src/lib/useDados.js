// Estado das rolagens de uma página: modo do d100, último resultado e o aviso
// de "novas no histórico" enquanto a janela está fechada.
import { useCallback, useEffect, useRef, useState } from 'react';
import { rolarD100 as d100, rolarExpressao as expressao } from './dados.js';

export function useDados({ registrar, historico, historicoAberto, avisar }) {
  const [modo, setModo] = useState(0);
  const [ultima, setUltima] = useState(null);
  const [vistas, setVistas] = useState(0);
  const primeiro = useRef(true);

  const aplicar = useCallback((r) => { setUltima(r); registrar(r); }, [registrar]);

  const rolarD100 = useCallback((nome, valor) => {
    const r = d100(nome, valor, modo);
    if (!r) { avisar(`“${nome}” não tem um número para rolar contra`); return; }
    aplicar(r);
  }, [modo, aplicar, avisar]);

  const rolarExpressao = useCallback((expr, nome) => {
    const r = expressao(expr, nome);
    if (!r) { avisar(`“${expr || '—'}” não é uma rolagem. Tente algo como 1d6+1d4`); return; }
    aplicar(r);
  }, [aplicar, avisar]);

  // Conta rolagens que chegaram com a janela fechada (as dos outros).
  useEffect(() => {
    if (primeiro.current) { primeiro.current = false; setVistas(historico.length ? historico[0].t : 0); return; }
    if (historicoAberto && historico.length) setVistas(historico[0].t);
  }, [historico, historicoAberto]);
  const novas = historicoAberto ? 0 : historico.filter((r) => r.t > vistas).length;

  return { modo, setModo, ultima, rolarD100, rolarExpressao, novas };
}

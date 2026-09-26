// Estado da ficha: carrega do navegador, salva sozinho e guarda uma pilha de
// "desfazer" para as mudancas de estrutura (adicionar, excluir, mover…).
import { useCallback, useEffect, useRef, useState } from 'react';
import { fichaVazia, normalizar } from './modelo.js';

export const CHAVE_FICHA = 'terra-sob-as-unhas:ficha:v1';

export function lerLocal(chave, padrao = null) {
  try { const v = localStorage.getItem(chave); return v === null ? padrao : v; } catch { return padrao; }
}
export function gravarLocal(chave, valor) {
  try {
    if (valor === null) localStorage.removeItem(chave); else localStorage.setItem(chave, valor);
    return true;
  } catch { return false; }
}

function carregar() {
  const bruto = lerLocal(CHAVE_FICHA);
  if (bruto) {
    try {
      const o = JSON.parse(bruto);
      if (o && Array.isArray(o.secoes)) return normalizar(o);
    } catch { /* arquivo estragado: comeca em branco */ }
  }
  return fichaVazia();
}

export function useFicha() {
  const [ficha, setFicha] = useState(carregar);
  const [salvo, setSalvo] = useState(() => (lerLocal(CHAVE_FICHA) ? 'salvo' : 'nova'));
  const [tamPilha, setTamPilha] = useState(0);
  const atual = useRef(ficha);
  const pilha = useRef([]);

  // fn recebe uma copia e pode muda-la a vontade.
  const atualizar = useCallback((fn, desfazivel = false) => {
    const antes = atual.current;
    const nova = structuredClone(antes);
    const resultado = fn(nova);
    const final = resultado && typeof resultado === 'object' ? resultado : nova;
    if (desfazivel) {
      pilha.current.push(antes);
      if (pilha.current.length > 80) pilha.current.shift();
      setTamPilha(pilha.current.length);
    }
    atual.current = final;
    setFicha(final);
  }, []);

  const desfazer = useCallback(() => {
    const anterior = pilha.current.pop();
    if (!anterior) return false;
    setTamPilha(pilha.current.length);
    atual.current = anterior;
    setFicha(anterior);
    return true;
  }, []);

  useEffect(() => {
    setSalvo((s) => (s === 'nova' && !ficha.secoes.length && !ficha.titulo ? s : 'salvando'));
    const tm = setTimeout(() => {
      setSalvo(gravarLocal(CHAVE_FICHA, JSON.stringify(ficha)) ? 'salvo' : 'erro');
    }, 300);
    return () => clearTimeout(tm);
  }, [ficha]);

  useEffect(() => {
    const agora = () => gravarLocal(CHAVE_FICHA, JSON.stringify(atual.current));
    window.addEventListener('pagehide', agora);
    return () => window.removeEventListener('pagehide', agora);
  }, []);

  return { ficha, atualizar, desfazer, podeDesfazer: tamPilha > 0, salvo };
}

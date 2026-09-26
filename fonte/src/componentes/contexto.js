import { createContext, useContext } from 'react';

// O que qualquer parte da ficha precisa: modo de edicao, como mudar o estado e como rolar.
export const FichaCtx = createContext(null);
export const useFichaCtx = () => useContext(FichaCtx);

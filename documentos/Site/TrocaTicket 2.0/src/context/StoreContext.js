import { createContext, useContext } from 'react';

// As páginas usam este contexto para acessar os mesmos dados.
export const StoreContext = createContext(null);
export function useStore() {
  return useContext(StoreContext);
}

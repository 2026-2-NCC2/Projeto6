import { useRef, useState } from 'react';
import { criarChave } from '../services/orders';

// Gravações com Idempotency-Key (atendimento e administração). Se a API não respondeu, a ação
// pode ter sido registrada: a próxima tentativa reusa a mesma chave e não grava em dobro.
// Com resposta (sucesso ou erro), a chave é descartada.
export default function useGravacao() {
  const chaves = useRef(new Map());
  const [ocupado, setOcupado] = useState('');
  async function gravar(nome, acao) {
    if (ocupado) return null;
    if (!chaves.current.has(nome)) chaves.current.set(nome, criarChave());
    setOcupado(nome);
    try {
      const resposta = await acao(chaves.current.get(nome));
      chaves.current.delete(nome);
      return { resposta };
    } catch (error) {
      if (!error.semResposta) chaves.current.delete(nome);
      return { erro: error.message };
    } finally {
      setOcupado('');
    }
  }
  return { gravar, ocupado };
}

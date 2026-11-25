// Fonte única dos perfis do site: nomes exibidos, página inicial de cada perfil e
// regras de normalização. Sem dependências, para poder ser testada com node --test.

// Identificadores internos (iguais aos do banco e da API). Não renomear.
export const PERFIS = ['comprador', 'organizador', 'fornecedor', 'admin'];

// Nomes exibidos na interface. O perfil "comprador" aparece como "Usuário".
export const roleNames = {
  comprador: 'Usuário',
  organizador: 'Organizador',
  fornecedor: 'Fornecedor',
  admin: 'Administrador',
};

// Página inicial de cada perfil (logotipo, troca de perfil e redirecionamentos).
export const destinations = {
  comprador: '/',
  organizador: '/organizador',
  fornecedor: '/fornecedor',
  admin: '/admin',
};

// Aceita os apelidos antigos ("participante", "usuario") e devolve o identificador interno.
export function normalizarPerfil(perfil) {
  const valor = String(perfil || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
  if (valor === 'participante' || valor === 'usuario') return 'comprador';
  if (valor === 'administrador') return 'admin';
  return PERFIS.includes(valor) ? valor : '';
}

// Visitante (sem perfil) vai para a homepage pública; cada perfil vai para a sua página inicial.
export function inicioDoPerfil(perfil) {
  return destinations[normalizarPerfil(perfil)] || '/';
}

// Nome do perfil para exibição; perfil desconhecido aparece como "Usuário".
export function nomeDoPerfil(perfil) {
  return roleNames[normalizarPerfil(perfil)] || roleNames.comprador;
}

// A troca rápida de perfil existe só no modo demonstração (sem conta autenticada) e
// aceita apenas os perfis conhecidos. Uma conta real nunca troca de perfil pelo site.
export function podeTrocarPerfilDemo({ autenticado, destino }) {
  return !autenticado && PERFIS.includes(normalizarPerfil(destino));
}

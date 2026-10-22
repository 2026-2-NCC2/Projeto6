// Somente contas fictícias criadas pelo seed acadêmico. Não são credenciais MySQL.
export const senhaInicialDemo = 'Demo-Academica-2026!';
export const contasDemo = [
  { id: 'ana', perfil: 'Participante', email: 'ana.demo@example.com' },
  { id: 'bruna', perfil: 'Outra participante', email: 'bruna.demo@example.com' },
  { id: 'caio', perfil: 'Destinatário de transferência', email: 'caio.demo@example.com' },
  { id: 'organizador', perfil: 'Organizador', email: 'organizador.demo@example.com' },
  { id: 'fornecedor', perfil: 'Fornecedor', email: 'fornecedor.demo@example.com' },
  { id: 'admin', perfil: 'Administrador', email: 'admin.demo@example.com' },
];

export function buscarContaDemo(id) {
  return contasDemo.find((conta) => conta.id === id) || null;
}

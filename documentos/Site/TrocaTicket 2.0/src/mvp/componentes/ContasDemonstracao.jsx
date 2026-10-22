import { Link } from 'react-router';
import { useI18n } from '../../i18n';
import { contasDemo, senhaInicialDemo } from '../contasDemo';

export default function ContasDemonstracao({ somenteNavegador = false }) {
  const { t } = useI18n();
  return (
    <section
      id="contas-demonstracao"
      className={`workspace mvp-demo-accounts${somenteNavegador ? ' demo-browser-accounts' : ''}`}
      aria-labelledby="demo-accounts-title"
    >
      <div className="panel">
        <p className="mvp-demo-tag">{t('Acesso para testes')}</p>
        <h2 id="demo-accounts-title">{t('Experimente cada perfil')}</h2>
        <p>{t('Escolha uma conta fictícia para conhecer o sistema sem precisar se cadastrar.')}</p>
        <div className="mvp-note">
          <strong>
            {t(
              somenteNavegador
                ? 'Senha fictícia para preencher o formulário:'
                : 'Senha inicial das contas de demonstração:',
            )}
          </strong>{' '}
          <code>{senhaInicialDemo}</code>
          <p>
            {t(
              somenteNavegador
                ? 'O login é simulado no navegador. Não existe autenticação nem conexão com banco de dados nesta versão pública.'
                : 'Esta é a senha do site, diferente da senha do MySQL.',
            )}
          </p>
        </div>
        <div className="mvp-demo-grid">
          {contasDemo.map((conta) => (
            <article className="mvp-demo-account" key={conta.id}>
              <h3>{t(conta.perfil)}</h3>
              <code>{conta.email}</code>
              <Link
                className="button outline"
                to={`/entrar?demo=${conta.id}`}
                aria-label={t('Usar conta de {perfil}', { perfil: t(conta.perfil) })}
              >
                {t('Usar esta conta')}
              </Link>
            </article>
          ))}
        </div>
        <p className="muted">
          {t(
            somenteNavegador
              ? 'O botão preenche o login e seleciona um perfil de demonstração. Nenhuma senha é armazenada ou enviada.'
              : 'O botão preenche o login. Senhas já alteradas no perfil continuam valendo.',
          )}
        </p>
        <p className="muted">
          {t(
            somenteNavegador
              ? 'Os perfis compartilham os dados fictícios salvos neste navegador. Não são contas independentes nem permitem transações entre usuários reais.'
              : 'Use sessões separadas do navegador para testar usuários simultâneos.',
          )}
        </p>
      </div>
    </section>
  );
}

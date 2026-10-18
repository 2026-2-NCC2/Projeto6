import React, { lazy, Suspense } from 'react';
import IntegratedApp from './mvp/IntegratedApp';
import { useI18n } from './i18n';
import './styles/mvp.css';
const LegacyApp = lazy(() => import('./LegacyApp'));

// O frontend anterior continua disponível de forma explícita, sem fallback da API.
export default function App() {
  const { t } = useI18n();
  return import.meta.env.VITE_APP_MODE === 'demo' ? (
    <Suspense fallback={<p role="status">{t('Carregando…')}</p>}>
      <LegacyApp />
    </Suspense>
  ) : (
    <IntegratedApp />
  );
}

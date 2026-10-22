import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, HashRouter } from 'react-router';
import App from './App';
import './styles.css';
import './workspace.css';
import './appearance.css';
import './accessibility.css';
import { StoreProvider } from './context/Store';
import PreferencesProvider from './accessibility/PreferencesProvider';
const Router = import.meta.env.VITE_GITHUB_PAGES === 'true' ? HashRouter : BrowserRouter;
createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Router>
      <PreferencesProvider>
        <StoreProvider>
          <App />
        </StoreProvider>
      </PreferencesProvider>
    </Router>
  </React.StrictMode>,
);

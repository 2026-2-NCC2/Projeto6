import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import App from './App';
import './styles.css';
import './workspace.css';
import './moderation.css';
import './shared.css';
import './forms.css';
import './report.css';
import './home.css';
import { StoreProvider } from './context/Store';
createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <StoreProvider>
        <App />
        TESTE
      </StoreProvider>
    </BrowserRouter>
  </React.StrictMode>,
);

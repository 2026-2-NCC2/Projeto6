import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import App from './App';
import './styles.css';
import './workspace.css';
import './appearance.css';
import './accessibility.css';
import { StoreProvider } from './context/Store';
import PreferencesProvider from './accessibility/PreferencesProvider';
createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <PreferencesProvider>
        <StoreProvider>
          <App />
        </StoreProvider>
      </PreferencesProvider>
    </BrowserRouter>
  </React.StrictMode>,
);

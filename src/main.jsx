import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, HashRouter } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import App from './App';
import { ToastProvider } from './context/ToastContext';
import { I18nProvider, LanguageScope } from './context/I18nContext';
import { AuthProvider } from './context/AuthContext';
import { CatalogProvider } from './context/CatalogContext';
import '@fontsource-variable/inter-tight';
import '@fontsource/instrument-serif/400.css';
import '@fontsource/noto-sans-arabic/arabic-400.css';
import '@fontsource/noto-sans-arabic/arabic-600.css';
import './styles/globals.css';

const Router = import.meta.env.VITE_ROUTER === 'hash' ? HashRouter : BrowserRouter;

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Router>
      <MotionConfig reducedMotion="user">
        <ToastProvider>
          <I18nProvider>
            <AuthProvider>
              <CatalogProvider>
                <LanguageScope>
                  <App />
                </LanguageScope>
              </CatalogProvider>
            </AuthProvider>
          </I18nProvider>
        </ToastProvider>
      </MotionConfig>
    </Router>
  </React.StrictMode>,
);

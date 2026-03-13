import _ from 'lodash';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './app.jsx';
import logger from './utils/logger';

logger.debug('--- main.jsx START ---');
window._ = _;

// Сохраняем оригинальный hash ДО того, как React начнет рендерить компоненты
// Это нужно, чтобы сохранить параметры из hash, которые могут быть потеряны при нормализации HashRouter
const originalHash = window.location.hash;
if (originalHash && originalHash !== '#' && originalHash !== '#/') {
  // Сохраняем оригинальный hash в sessionStorage для извлечения параметров
  sessionStorage.setItem('originalHash', originalHash);
  logger.info('💾 [main.jsx] Сохранен оригинальный hash:', originalHash);
}

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
);
logger.debug('--- main.jsx END ---');

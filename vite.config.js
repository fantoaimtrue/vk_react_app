import react from '@vitejs/plugin-react';
import process from 'node:process';
import { defineConfig, loadEnv } from 'vite';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Загружаем переменные окружения на основе текущего режима
  const env = loadEnv(mode, process.cwd(), '');
  
  // Определяем целевой URL для API прокси
  const apiTarget = process.env.VITE_API_TARGET || env.VITE_API_TARGET || 'http://localhost:8000';
  
  console.log('🚀 [Vite] Proxy target:', apiTarget);
  console.log('🚀 [Vite] Use DB API:', env.VITE_USE_DB_API || process.env.VITE_USE_DB_API);

  return {
    plugins: [react()],
    server: {
      host: true, // Разрешаем доступ из сети
      port: 5174, // Меняем порт на 5174
      watch: {
        ignored: ['**/backend/**', '**/node_modules/**', '**/.git/**']
      },
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
          secure: false, // Отключаем проверку SSL-сертификата
          timeout: 10000, // Таймаут 10 секунд
          configure: (proxy, options) => {
            void options;
            proxy.on('error', (err, req, res) => {
              void req;
              void res;
              console.log('❌ [Vite Proxy] Ошибка прокси:', err.message);
            });
            proxy.on('proxyReq', (proxyReq, req, _res) => {
              void proxyReq;
              void _res;
              console.log('📡 [Vite Proxy] Запрос:', req.method, req.url, '->', apiTarget);
            });
            proxy.on('proxyRes', (proxyRes, req, _res) => {
              void _res;
              if (proxyRes.statusCode >= 500) {
                console.log('⚠️  [Vite Proxy] Ошибка сервера:', proxyRes.statusCode, req.url);
              }
            });
          },
        },
      },
      hmr: {
        overlay: false,
      },
      // Отключаем проверку origin для решения проблемы 403 Forbidden
      allowedHosts: [
        '.serveo.net', // Разрешаем любой поддомен serveo.net
        'localhost',
        '127.0.0.1'
      ],
    }
  };
})

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Разрешаем доступ из сети
    port: 5174, // Меняем порт на 5174
    watch: {
      ignored: ['**/backend/**', '**/node_modules/**', '**/.git/**']
    },
    proxy: {
      '/api': {
        target: 'http://backend:8000', // Указываем имя сервиса Docker
        changeOrigin: true,
        secure: false, // Отключаем проверку SSL-сертификата
      },
    },
    hmr: {
      overlay: false,
    },
    // Отключаем проверку origin для решения проблемы 403 Forbidden - это было неверно.
    // Правильная настройка - allowedHosts.
    allowedHosts: [
      '.serveo.net' // Разрешаем любой поддомен serveo.net
    ],
  }
})

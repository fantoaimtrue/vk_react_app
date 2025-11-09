# ---- Этап 1: Сборка React-приложения ----
FROM node:18-alpine AS build

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем package.json и package-lock.json
COPY package*.json ./

# Устанавливаем зависимости
RUN npm install

# Копируем остальные файлы приложения
COPY . .

# Собираем приложение для продакшена
RUN npm run build

# ---- Этап 2: Настройка Nginx ----
FROM nginx:1.25-alpine

# Копируем собранные файлы из этапа сборки
COPY --from=build /app/dist /usr/share/nginx/html

# Копируем статические файлы Django из backend контейнера
COPY --from=babkimanki_backend /app/staticfiles /usr/share/nginx/html/static

# Копируем конфигурацию Nginx с SSL
COPY nginx-ssl-with-backend.conf /etc/nginx/conf.d/default.conf

# SSL сертификаты будут монтироваться через volume в docker-compose

# Открываем порты 80 и 443
EXPOSE 80 443

# Запускаем Nginx
CMD ["nginx", "-g", "daemon off;"] 
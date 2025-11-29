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

# ---- Этап 2: Копирование в финальный образ ----
FROM busybox:latest

# Копируем собранные файлы
COPY --from=build /app/dist /dist

# Команда которая копирует файлы в volume при запуске
CMD ["sh", "-c", "cp -r /dist/* /usr/share/nginx/html/ && echo 'Frontend files copied' && tail -f /dev/null"]

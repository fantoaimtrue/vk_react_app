# ---- Этап 1: Сборка React-приложения ----
FROM node:18-alpine AS build

# Устанавливаем рабочую директорию
WORKDIR /app

# Настраиваем npm для более быстрой установки
RUN npm config set registry https://registry.npmjs.org/ && \
    npm config set fetch-retries 3 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000

# Копируем package.json и package-lock.json
COPY package*.json ./

# Устанавливаем зависимости (npm ci быстрее и надежнее для продакшена)
# Используем --legacy-peer-deps если есть проблемы с зависимостями
RUN npm ci --legacy-peer-deps --prefer-offline --no-audit --progress=false || \
    npm install --legacy-peer-deps --prefer-offline --no-audit --progress=false

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

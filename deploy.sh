#!/bin/bash
# Скрипт для деплоя приложения

cd /root/vk_react_app

echo "🚀 Начинаем деплой..."
echo ""

echo "1️⃣ Пересобираем frontend..."
docker-compose -f docker-compose.yml -f docker-compose.prod.yml build frontend

echo ""
echo "2️⃣ Пересобираем backend..."
docker-compose -f docker-compose.yml -f docker-compose.prod.yml build backend

echo ""
echo "3️⃣ Перезапускаем все сервисы..."
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

echo ""
echo "4️⃣ Проверяем статус контейнеров..."
docker-compose ps

echo ""
echo "5️⃣ Проверяем логи frontend..."
docker-compose logs --tail 10 frontend

echo ""
echo "6️⃣ Проверяем логи backend..."
docker-compose logs --tail 10 backend

echo ""
echo "✅ Деплой завершен!"
echo ""
echo "Проверьте статус контейнеров выше. Все должно быть 'Up'."



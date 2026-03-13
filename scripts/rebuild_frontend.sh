#!/bin/bash
# Скрипт для пересборки frontend с исправлениями

cd "$(dirname "$0")/.."

echo "🔄 Останавливаем frontend..."
docker-compose -f docker-compose.yml -f docker-compose.prod.yml stop frontend

echo "🔨 Пересобираем frontend..."
docker-compose -f docker-compose.yml -f docker-compose.prod.yml build --no-cache frontend

echo "🚀 Запускаем frontend..."
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d frontend

echo "✅ Проверяем статус..."
docker-compose ps frontend

echo "📋 Последние логи frontend:"
docker-compose logs frontend | tail -10

echo ""
echo "✅ Frontend пересобран и запущен!"
echo "Проверьте логи выше на наличие ошибок."



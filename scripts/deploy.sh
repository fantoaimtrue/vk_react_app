#!/bin/bash
# Скрипт для деплоя приложения в продакшен

set -e

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

cd "$(dirname "$0")/.."

echo -e "${BLUE}🚀 Начинаем деплой в продакшен...${NC}"
echo ""

# Проверка наличия .env файла
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  Файл .env не найден${NC}"
    echo -e "${YELLOW}Создайте .env на основе .env.example:${NC}"
    echo "  cp .env.example .env"
    echo "  # Затем отредактируйте .env и заполните все необходимые переменные"
    exit 1
fi

echo -e "${GREEN}1️⃣ Пересобираем frontend...${NC}"
docker-compose -f docker-compose.yml -f docker-compose.prod.yml build --no-cache frontend

echo ""
echo -e "${GREEN}2️⃣ Пересобираем backend...${NC}"
docker-compose -f docker-compose.yml -f docker-compose.prod.yml build --no-cache backend

echo ""
echo -e "${GREEN}3️⃣ Останавливаем старые контейнеры...${NC}"
docker-compose -f docker-compose.yml -f docker-compose.prod.yml down --remove-orphans

echo ""
echo -e "${GREEN}4️⃣ Запускаем все сервисы...${NC}"
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

echo ""
echo -e "${GREEN}🧹 Очищаем неиспользуемые образы...${NC}"
docker image prune -f

echo ""
echo -e "${GREEN}5️⃣ Ждем запуска сервисов (10 секунд)...${NC}"
sleep 10

echo ""
echo -e "${GREEN}6️⃣ Проверяем статус контейнеров...${NC}"
docker-compose -f docker-compose.yml -f docker-compose.prod.yml ps

echo ""
echo -e "${GREEN}7️⃣ Проверяем логи frontend...${NC}"
docker-compose -f docker-compose.yml -f docker-compose.prod.yml logs --tail 20 frontend

echo ""
echo -e "${GREEN}8️⃣ Проверяем логи backend...${NC}"
docker-compose -f docker-compose.yml -f docker-compose.prod.yml logs --tail 20 backend

echo ""
echo -e "${GREEN}9️⃣ Проверяем логи nginx...${NC}"
docker-compose -f docker-compose.yml -f docker-compose.prod.yml logs --tail 10 nginx

echo ""
echo -e "${GREEN}✅ Деплой завершен!${NC}"
echo ""
echo -e "${BLUE}📋 Полезные команды:${NC}"
echo "  Просмотр всех логов: docker-compose -f docker-compose.yml -f docker-compose.prod.yml logs -f"
echo "  Остановка: docker-compose -f docker-compose.yml -f docker-compose.prod.yml down"
echo "  Перезапуск: docker-compose -f docker-compose.yml -f docker-compose.prod.yml restart"
echo ""
echo -e "${YELLOW}⚠️  Убедитесь, что все контейнеры имеют статус 'Up'${NC}"



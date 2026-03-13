#!/bin/bash
# Скрипт для смены домена и настройки SSL

set -e

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Переходим в корень проекта
cd "$(dirname "$0")/.."

# Проверка аргументов
if [ -z "$1" ]; then
    echo -e "${RED}❌ Ошибка: Укажите новый домен${NC}"
    echo "Использование: ./scripts/change-domain.sh example.com"
    echo "Пример: ./scripts/change-domain.sh utkavalyutka.ru"
    exit 1
fi

NEW_DOMAIN=$1
NEW_DOMAIN_WWW="www.$NEW_DOMAIN"
OLD_DOMAIN="yourdomain.com"
OLD_DOMAIN_WWW="www.yourdomain.com"

echo -e "${GREEN}🔄 Начинаем смену домена...${NC}"
echo "Старый домен: $OLD_DOMAIN"
echo "Новый домен: $NEW_DOMAIN"
echo ""

# Функция для замены в файле
replace_in_file() {
    local file=$1
    if [ -f "$file" ]; then
        sed -i "s/$OLD_DOMAIN/$NEW_DOMAIN/g" "$file"
        sed -i "s/$OLD_DOMAIN_WWW/$NEW_DOMAIN_WWW/g" "$file"
        echo -e "${GREEN}✅ Обновлен: $file${NC}"
    fi
}

# Список файлов для обновления
echo -e "${YELLOW}📝 Обновляем файлы конфигурации...${NC}"

# Docker Compose файлы
replace_in_file "docker-compose.yml"
replace_in_file "docker-compose.prod.yml"

# Nginx конфигурации
replace_in_file "nginx.conf"

# HTML файлы
replace_in_file "index.html"

# JavaScript файлы (если есть)
find src -type f \( -name "*.js" -o -name "*.jsx" \) -exec sed -i "s/$OLD_DOMAIN/$NEW_DOMAIN/g" {} \;

# Обновляем .env файл (если существует)
if [ -f ".env" ]; then
    if grep -q "ALLOWED_HOSTS" .env; then
        sed -i "s/ALLOWED_HOSTS=.*/ALLOWED_HOSTS=$NEW_DOMAIN,$NEW_DOMAIN_WWW/g" .env
        echo -e "${GREEN}✅ Обновлен .env (ALLOWED_HOSTS)${NC}"
    else
        echo "ALLOWED_HOSTS=$NEW_DOMAIN,$NEW_DOMAIN_WWW" >> .env
        echo -e "${GREEN}✅ Добавлен ALLOWED_HOSTS в .env${NC}"
    fi
fi

# Обновляем email в certbot (опционально)
read -p "Изменить email для SSL сертификатов? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    read -p "Введите новый email: " NEW_EMAIL
    sed -i "s/admin@yourdomain.com/$NEW_EMAIL/g" docker-compose.yml
    echo -e "${GREEN}✅ Email обновлен${NC}"
fi

echo ""
echo -e "${GREEN}✅ Домен успешно изменен!${NC}"
echo ""
echo -e "${YELLOW}📋 Следующие шаги:${NC}"
echo "1. Обновите DNS записи для домена $NEW_DOMAIN:"
echo "   - A запись: @ -> IP сервера"
echo "   - A запись: www -> IP сервера"
echo ""
echo "2. Проверьте, что домен указывает на сервер:"
echo "   dig $NEW_DOMAIN"
echo "   nslookup $NEW_DOMAIN"
echo ""
echo "3. Удалите старые SSL сертификаты (если нужно):"
echo "   rm -rf data/certbot/conf/live/yourdomain.com*"
echo ""
echo "4. Запустите деплой для получения новых SSL сертификатов:"
echo "   ./scripts/deploy.sh"
echo ""
echo -e "${GREEN}Готово!${NC}"

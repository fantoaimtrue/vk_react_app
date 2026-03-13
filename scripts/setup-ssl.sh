#!/bin/bash
# Скрипт для настройки SSL сертификата для нового домена

set -e

# Цвета
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Переходим в корень проекта
cd "$(dirname "$0")/.."

# Проверка аргументов
if [ -z "$1" ]; then
    echo -e "${RED}❌ Ошибка: Укажите домен${NC}"
    echo "Использование: ./setup-ssl.sh example.com [email@example.com]"
    exit 1
fi

DOMAIN=$1
DOMAIN_WWW="www.$DOMAIN"
EMAIL=${2:-"admin@$DOMAIN"}

echo -e "${BLUE}🔒 Настройка SSL для домена: $DOMAIN${NC}"
echo -e "${BLUE}📧 Email для уведомлений: $EMAIL${NC}"
echo ""

# Проверка DNS
echo -e "${YELLOW}🔍 Проверяем DNS записи...${NC}"
if ! dig +short $DOMAIN | grep -q .; then
    echo -e "${RED}❌ Ошибка: Домен $DOMAIN не разрешается в DNS${NC}"
    echo "Убедитесь, что:"
    echo "  - A запись для $DOMAIN указывает на IP сервера"
    echo "  - A запись для www.$DOMAIN указывает на IP сервера"
    exit 1
fi
echo -e "${GREEN}✅ DNS записи настроены${NC}"
echo ""

# Остановка nginx для получения сертификата
echo -e "${YELLOW}🛑 Останавливаем nginx...${NC}"
docker-compose -f docker-compose.yml -f docker-compose.prod.yml stop nginx || true

# Обновление docker-compose.yml для нового домена
echo -e "${YELLOW}📝 Обновляем конфигурацию...${NC}"
sed -i "s/-d yourdomain.com -d www.yourdomain.com/-d $DOMAIN -d $DOMAIN_WWW/g" docker-compose.yml
sed -i "s/admin@yourdomain.com/$EMAIL/g" docker-compose.yml

# Создаем резервную копию текущей конфигурации
echo -e "${YELLOW}📝 Создаем резервную копию nginx.conf...${NC}"
cp nginx.conf nginx.conf.backup

# Создаем временную конфигурацию nginx только с HTTP для получения сертификата
echo -e "${YELLOW}📝 Создаем временную конфигурацию nginx (только HTTP)...${NC}"
cat > nginx.conf << EOF
server {
    listen 80;
    server_name $DOMAIN $DOMAIN_WWW;

    # Обработка запросов для верификации домена Certbot
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
        default_type text/plain;
        allow all;
    }

    # Временно отдаем простой ответ для остальных запросов
    location / {
        return 200 "SSL setup in progress...";
        add_header Content-Type text/plain;
    }
}
EOF

# Запуск nginx для получения сертификата
echo -e "${YELLOW}🚀 Запускаем nginx...${NC}"
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d nginx

# Ждем запуска nginx
echo -e "${YELLOW}⏳ Ждем запуска nginx (10 секунд)...${NC}"
sleep 10

# Убеждаемся, что директория для challenge файлов существует
echo -e "${YELLOW}📁 Создаем директорию для challenge файлов...${NC}"
mkdir -p ./data/certbot/www/.well-known/acme-challenge
chmod -R 755 ./data/certbot/www

# Проверяем, что nginx работает и может обслуживать challenge файлы
echo -e "${YELLOW}🔍 Проверяем работу nginx...${NC}"
TEST_FILE="nginx-test-$(date +%s)"
echo "test" > ./data/certbot/www/.well-known/acme-challenge/$TEST_FILE
sleep 2

if curl -f -s -H "Host: $DOMAIN" http://localhost/.well-known/acme-challenge/$TEST_FILE > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Nginx правильно обслуживает challenge файлы${NC}"
    rm -f ./data/certbot/www/.well-known/acme-challenge/$TEST_FILE
else
    echo -e "${YELLOW}⚠️  Проверка локально не прошла, но продолжаем...${NC}"
    echo -e "${YELLOW}⚠️  Убедитесь, что домен $DOMAIN указывает на IP этого сервера${NC}"
    sleep 5
fi

# Проверяем доступность домена извне
echo -e "${YELLOW}🔍 Проверяем доступность домена извне...${NC}"
SERVER_IP=$(curl -s ifconfig.me || curl -s icanhazip.com || echo "unknown")
DOMAIN_IP=$(dig +short $DOMAIN | head -1)

if [ "$DOMAIN_IP" != "" ] && [ "$SERVER_IP" != "unknown" ]; then
    if [ "$DOMAIN_IP" = "$SERVER_IP" ]; then
        echo -e "${GREEN}✅ Домен $DOMAIN указывает на IP сервера ($SERVER_IP)${NC}"
    else
        echo -e "${RED}⚠️  ВНИМАНИЕ: Домен $DOMAIN указывает на $DOMAIN_IP, а сервер имеет IP $SERVER_IP${NC}"
        echo -e "${YELLOW}   Это может быть причиной проблемы. Продолжаем попытку...${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Не удалось проверить IP. Продолжаем...${NC}"
fi

# Получение SSL сертификата
echo -e "${YELLOW}📜 Получаем SSL сертификат от Let's Encrypt...${NC}"
docker-compose -f docker-compose.yml -f docker-compose.prod.yml run --rm certbot \
    certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email $EMAIL \
    --agree-tos \
    --no-eff-email \
    --force-renewal \
    -d $DOMAIN \
    -d $DOMAIN_WWW

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ SSL сертификат успешно получен!${NC}"
else
    echo -e "${RED}❌ Ошибка при получении сертификата${NC}"
    echo "Проверьте:"
    echo "  1. Домен указывает на IP сервера"
    echo "  2. Порты 80 и 443 открыты"
    echo "  3. Nginx запущен и доступен"
    exit 1
fi

# Восстанавливаем полную конфигурацию nginx с SSL
echo -e "${YELLOW}📝 Восстанавливаем полную конфигурацию nginx с SSL...${NC}"

# Проверяем, какой путь использовал certbot
CERT_PATH=$(ls -1 ./data/certbot/conf/live/ 2>/dev/null | grep $DOMAIN | head -1 || echo "$DOMAIN")

# Восстанавливаем из резервной копии
if [ -f nginx.conf.backup ]; then
    cp nginx.conf.backup nginx.conf
    # Обновляем домен и пути к сертификатам
    sed -i "s/server_name yourdomain.com www.yourdomain.com;/server_name $DOMAIN $DOMAIN_WWW;/g" nginx.conf
    sed -i "s/server_name utkaminiapp.ru www.utkaminiapp.ru;/server_name $DOMAIN $DOMAIN_WWW;/g" nginx.conf
    sed -i "s|ssl_certificate /etc/letsencrypt/live/.*/fullchain.pem|ssl_certificate /etc/letsencrypt/live/$CERT_PATH/fullchain.pem|g" nginx.conf
    sed -i "s|ssl_certificate_key /etc/letsencrypt/live/.*/privkey.pem|ssl_certificate_key /etc/letsencrypt/live/$CERT_PATH/privkey.pem|g" nginx.conf
    rm -f nginx.conf.backup nginx.conf.temp
else
    echo -e "${RED}⚠️  Резервная копия не найдена, создаем конфигурацию заново...${NC}"
    # Создаем полную конфигурацию
    cat > nginx.conf << EOF
server {
    listen 80;
    server_name $DOMAIN $DOMAIN_WWW;

    # Обработка запросов для верификации домена Certbot
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    # Перенаправление всех остальных HTTP запросов на HTTPS
    location / {
        return 301 https://\$host\$request_uri;
    }
}

server {
    listen 443 ssl;
    http2 on;
    server_name $DOMAIN $DOMAIN_WWW;

    # SSL сертификаты
    ssl_certificate /etc/letsencrypt/live/$CERT_PATH/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$CERT_PATH/privkey.pem;
    
    # Современные SSL настройки безопасности
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384';
    ssl_prefer_server_ciphers off;
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_session_tickets off;
    
    # OCSP Stapling
    ssl_stapling on;
    ssl_stapling_verify on;
    
    # HSTS (HTTP Strict Transport Security)
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Проксирование запросов к админ-панели на бэкенд
    location /admin {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Pragma "no-cache";
        add_header Expires "0";
        
        proxy_pass http://backend:8000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header X-Forwarded-Host \$host;
        proxy_set_header X-Forwarded-Port \$server_port;
        
        proxy_buffering off;
        proxy_cache off;
    }

    # Проксирование запросов к API на бэкенд
    location /api {
        proxy_pass http://backend:8000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header X-Forwarded-Host \$host;
        proxy_set_header X-Forwarded-Port \$server_port;
    }

    # Раздача статических файлов Django (для админки)
    location /static/ {
        alias /var/www/static/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Корень сайта, где лежат собранные файлы фронтенда
    location / {
        root   /usr/share/nginx/html;
        index  index.html;
        try_files \$uri \$uri/ /index.html;
    }
}
EOF
fi

# Перезапуск nginx
echo -e "${YELLOW}🔄 Перезапускаем nginx...${NC}"
docker-compose -f docker-compose.yml -f docker-compose.prod.yml restart nginx

echo ""
echo -e "${GREEN}✅ SSL настроен успешно!${NC}"
echo ""
echo -e "${BLUE}📋 Проверьте работу:${NC}"
echo "  - HTTP: http://$DOMAIN (должен редиректить на HTTPS)"
echo "  - HTTPS: https://$DOMAIN"
echo ""
echo -e "${YELLOW}💡 Для автоматического обновления сертификатов добавьте в crontab:${NC}"
echo "  0 3 * * * cd /root/vk_react_app && docker-compose -f docker-compose.yml -f docker-compose.prod.yml run --rm certbot renew && docker-compose -f docker-compose.yml -f docker-compose.prod.yml restart nginx"


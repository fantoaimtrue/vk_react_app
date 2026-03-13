# 🚀 Инструкция по деплою в продакшен

## Предварительные требования

- Сервер с Ubuntu/Debian
- Docker и Docker Compose установлены
- Домен настроен и указывает на IP сервера
- Порты 80 и 443 открыты в firewall

## Шаг 1: Подготовка сервера

```bash
# Обновите систему
sudo apt update && sudo apt upgrade -y

# Установите Docker (если не установлен)
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Установите Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

## Шаг 2: Клонирование проекта

```bash
cd /root
git clone <your-repo-url> vk_react_app
cd vk_react_app
```

## Шаг 3: Настройка переменных окружения

```bash
# Создайте .env файл
cat > .env << EOF
DJANGO_SECRET_KEY=$(python3 -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())')
DJANGO_DEBUG=False
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com

VK_APP_ACCESS_TOKEN=your-vk-access-token-here
VK_APP_ID=53875526
VK_GROUP_ID=230927358

DB_NAME=babkimanki_db
DB_USER=babkimanki_user
DB_PASSWORD=$(openssl rand -base64 32)
DB_HOST=db
DB_PORT=5432
EOF

# Отредактируйте .env и замените yourdomain.com на ваш домен
nano .env
```

## Шаг 4: Настройка домена

```bash
# Обновите домен во всех конфигурационных файлах
./scripts/change-domain.sh yourdomain.com
```

## Шаг 5: Первый деплой

```bash
# Запустите деплой
./scripts/deploy.sh
```

## Шаг 6: Настройка SSL

```bash
# Получите SSL сертификат
./scripts/setup-ssl.sh yourdomain.com your@email.com
```

## Шаг 7: Проверка

```bash
# Проверьте статус контейнеров
docker-compose -f docker-compose.yml -f docker-compose.prod.yml ps

# Проверьте логи
docker-compose -f docker-compose.yml -f docker-compose.prod.yml logs -f
```

## Обновление приложения

```bash
# Получите последние изменения
git pull

# Запустите деплой
./scripts/deploy.sh
```

## Автоматическое обновление SSL

Добавьте в crontab для автоматического обновления сертификатов:

```bash
crontab -e

# Добавьте строку:
0 3 * * * cd /root/vk_react_app && docker-compose -f docker-compose.yml -f docker-compose.prod.yml run --rm certbot renew && docker-compose -f docker-compose.yml -f docker-compose.prod.yml restart nginx
```

## Полезные команды

```bash
# Просмотр логов
docker-compose -f docker-compose.yml -f docker-compose.prod.yml logs -f

# Остановка
docker-compose -f docker-compose.yml -f docker-compose.prod.yml down

# Перезапуск
docker-compose -f docker-compose.yml -f docker-compose.prod.yml restart

# Пересборка frontend
./scripts/rebuild_frontend.sh

# Проверка статуса
docker-compose -f docker-compose.yml -f docker-compose.prod.yml ps
```

## Устранение проблем

### Контейнеры не запускаются
```bash
# Проверьте логи
docker-compose -f docker-compose.yml -f docker-compose.prod.yml logs

# Проверьте .env файл
cat .env
```

### SSL не работает
```bash
# Проверьте DNS записи
dig yourdomain.com

# Перезапустите nginx
docker-compose -f docker-compose.yml -f docker-compose.prod.yml restart nginx
```

### Backend не отвечает
```bash
# Проверьте подключение к БД
docker-compose -f docker-compose.yml -f docker-compose.prod.yml exec backend python manage.py dbshell

# Примените миграции вручную
docker-compose -f docker-compose.yml -f docker-compose.prod.yml exec backend python manage.py migrate
```



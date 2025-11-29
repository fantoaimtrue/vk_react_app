# 🐒 БАБКИМАНКИ - VK Mini App

> **Поиск и сравнение МФО с системой офферов**
> 
> _"дает займ, когда отказали банки"_

[![Production Status](https://img.shields.io/badge/status-production-green.svg)](https://bodyexp.ru)
[![Django](https://img.shields.io/badge/Django-5.2.4-green.svg)](https://www.djangoproject.com/)
[![React](https://img.shields.io/badge/React-18.2.0-blue.svg)](https://reactjs.org/)
[![VK Bridge](https://img.shields.io/badge/VK%20Bridge-2.15.7-blue.svg)](https://vk.com/dev/vk_bridge)

---

## 🌐 Демо

- **🔗 Продакшен**: https://bodyexp.ru
- **📊 API**: https://bodyexp.ru/api/mfos/
- **🎨 База знаний**: https://bodyexp.ru/kb

---

## 🚀 Быстрый старт

### Требования

- Node.js 18+
- Python 3.11+
- Docker и Docker Compose
- npm или yarn

### Локальная разработка

```bash
# 1. Клонируйте репозиторий
git clone <repository-url>
cd vk_react_app

# 2. Установите зависимости Frontend
npm install

# 3. Установите зависимости Backend
cd backend
python -m venv venv
source venv/bin/activate  # Linux/Mac
# или venv\Scripts\activate  # Windows
pip install -r requirements.txt

# 4. Создайте .env файл
cp .env.example .env
# Отредактируйте .env и добавьте свои ключи

# 5. Примените миграции
python manage.py migrate

# 6. Создайте суперпользователя (опционально)
python manage.py createsuperuser

# 7. Запустите Backend
python manage.py runserver 8000

# 8. В новом терминале запустите Frontend
cd ..
npm run dev
```

Frontend будет доступен на http://localhost:5174

Backend API на http://localhost:8000/api/

### Docker запуск

```bash
# Для разработки
npm run start:dev

# Для продакшена
npm run start:prod

# Остановить контейнеры
npm run stop
```

---

## 📁 Структура проекта

```
vk_react_app/
├── src/                          # React Frontend
│   ├── components/               # Переиспользуемые компоненты
│   │   ├── MFOCard.jsx          # Карточка МФО
│   │   ├── NotificationSubscriptionModal.jsx
│   │   ├── LoanCalculator.jsx   # Калькулятор займа
│   │   └── ...
│   ├── pages/                    # Страницы приложения
│   │   ├── MFOHome.jsx          # Главная страница
│   │   ├── MFODetail.jsx        # Детали МФО
│   │   ├── KnowledgeBase.jsx    # База знаний
│   │   └── ...
│   ├── hooks/                    # Кастомные React хуки
│   │   ├── usePushNotifications.js
│   │   ├── useUTMTracker.js
│   │   ├── useArbitrageTracker.js
│   │   └── useMFOs.js
│   ├── styles/                   # Глобальные стили
│   │   ├── colors.css           # Цветовая палитра
│   │   ├── typography.css       # Типографика
│   │   └── components.css       # Компонентные стили
│   ├── App.jsx                   # Главный компонент
│   └── main.jsx                  # Точка входа
│
├── backend/                      # Django Backend
│   ├── api/                      # REST API приложение
│   │   ├── models.py            # Модели данных
│   │   ├── views.py             # API views
│   │   ├── urls.py              # URL маршруты
│   │   ├── serializers.py       # (в views.py)
│   │   └── services.py          # Бизнес-логика
│   ├── backend/                  # Настройки Django
│   │   ├── settings.py          # Конфигурация
│   │   ├── urls.py              # Главные URL
│   │   └── wsgi.py              # WSGI приложение
│   └── manage.py                 # Django CLI
│
├── public/                       # Статические файлы
│   └── logo.png
├── docker-compose.yml            # Docker конфигурация
├── docker-compose.prod.yml       # Продакшен настройки
├── Dockerfile                    # Frontend Dockerfile
├── nginx-ssl-with-backend.conf   # Nginx конфигурация
├── vite.config.js                # Vite конфигурация
├── package.json                  # NPM зависимости
└── README.md                     # Этот файл
```

---

## 🛠 Технологии

### Frontend
- **React 18.2** - UI библиотека
- **Vite 4.5** - Сборщик и dev сервер
- **React Router 6** - Маршрутизация
- **VK Bridge 2.15** - Интеграция с VK
- **Axios** - HTTP клиент

### Backend
- **Django 5.2** - Web фреймворк
- **Django REST Framework 3.16** - REST API
- **Gunicorn** - WSGI сервер для продакшена
- **Pandas** - Обработка Excel файлов
- **Requests** - HTTP клиент

### Infrastructure
- **Docker & Docker Compose** - Контейнеризация
- **Nginx** - Reverse proxy и статика
- **Let's Encrypt** - SSL сертификаты
- **SQLite** - База данных (рекомендуется PostgreSQL для продакшена)

---

## 🎯 Основные функции

### 1. **Каталог МФО**
- Поиск и фильтрация микрофинансовых организаций
- Сравнение условий (сумма, срок, процент)
- Сортировка по шансу одобрения
- Детальная информация о каждом МФО

### 2. **VK Mini App интеграция**
- Авторизация через VK
- Push-уведомления
- Получение данных пользователя
- Адаптация под VK интерфейс

### 3. **UTM трекинг**
- Автоматическое отслеживание UTM параметров
- Аналитика переходов
- Сегментация пользователей
- Интеграция с VK рекламой

### 4. **Арбитражная система (leads.tech)**
- Автоматическая передача лидов
- Динамические партнерские ссылки
- Отслеживание конверсий
- Детальная аналитика

### 5. **База знаний**
- Статьи о МФО и займах
- Советы по получению займа
- Навигация по категориям

### 6. **Админ-панель**
- Управление МФО через Django Admin
- Загрузка МФО из Excel
- Управление пользователями
- Статистика и аналитика

---

## 📊 API Endpoints

### МФО
```
GET    /api/mfos/              # Список всех МФО
GET    /api/mfos/<id>/         # Детали конкретного МФО
POST   /api/mfos/upload/       # Загрузка МФО из Excel (admin)
GET    /api/mfos/template/     # Скачать шаблон Excel
```

### Пользователи
```
POST   /api/users/register/    # Регистрация пользователя
POST   /api/users/allow-notifications/  # Подписка на уведомления
GET    /api/users/status/      # Статус пользователя
GET    /api/users/stats/       # Статистика пользователей
```

### UTM трекинг
```
POST   /api/utm-track/         # Отправка UTM данных
GET    /api/utm-stats/         # Статистика UTM
```

### Арбитраж
```
POST   /api/arbitrage/send-to-leads-tech/  # Отправка в leads.tech
```

### Офферы
```
GET    /api/offers/            # Список офферов с UTM
```

---

## 🔧 Конфигурация

### Переменные окружения (.env)

```env
# Django Settings
DJANGO_SECRET_KEY=your-secret-key-here
DJANGO_DEBUG=False
ALLOWED_HOSTS=bodyexp.ru,www.bodyexp.ru,localhost

# VK Mini App
VK_APP_ACCESS_TOKEN=your-vk-access-token
VK_APP_ID=53875526

# Database (если используется PostgreSQL)
DB_NAME=babkimanki_db
DB_USER=babkimanki_user
DB_PASSWORD=your-password
DB_HOST=db
DB_PORT=5432
```

**⚠️ ВАЖНО**: Никогда не коммитьте .env файл в Git!

### Vite конфигурация

```javascript
// vite.config.js
export default defineConfig({
  server: {
    port: 5174,
    proxy: {
      '/api': 'http://backend:8000'
    }
  }
})
```

---

## 🎨 Дизайн

Проект использует цветовую палитру в стиле Сбербанка:

```css
/* Основные цвета */
--sber-dark-green: #007855;   /* Тёмно-зелёный */
--sber-bright-green: #21A038; /* Яркий зелёный */
--sber-lime: #A1D900;         /* Лаймовый */
--sber-orange: #ED713C;       /* Оранжевый */

/* Градиент фона */
background: linear-gradient(90deg, #007855 0%, #21A038 100%);
```

---

## 🎮 VK Mini-App Deployment

Приложение полностью совместимо с VK Mini Apps и может быть развернуто как на собственном хостинге, так и на бесплатном CDN-хостинге ВКонтакте.

### VK Hosting (Бесплатно)

VK предоставляет бесплатный CDN-хостинг для мини-приложений. Это идеально подходит для статических файлов frontend.

**⚠️ Ограничения VK Hosting**:
- Только хранение файлов, без вычислительных мощностей
- Backend должен размещаться отдельно (на собственном сервере)
- Ограничения на размер файлов и частоту обновлений

#### Подготовка к деплою на VK:

1. **Установите VK deployment tools**:
```bash
npm install
```

2. **Настройте vk-hosting-config.json**:
Файл уже создан с правильными настройками:
```json
{
  "app_id": 53875526,
  "endpoints": {
    "mobile": "index.html",
    "web": "index.html",
    "mvk": "index.html"
  },
  "static_path": "dist"
}
```

3. **Соберите production версию**:
```bash
npm run build
```

4. **Деплой на VK Hosting**:
```bash
npm run deploy
```
При первом запуске потребуется аутентификация в VK.

5. **Проверьте приложение**:
Откройте https://vk.com/app53875526

### Локальная разработка с VK Tunnel

Для тестирования мини-приложения в VK во время разработки используйте VK Tunnel:

```bash
# В одном терминале: запустите dev сервер
npm run dev

# В другом терминале: запустите туннель
npm run tunnel
```

VK Tunnel создаст публичный URL, который можно использовать в настройках приложения VK для тестирования.

**Альтернатива**: Из-за технических работ с VK Tunnel (с 2 октября 2025) можно использовать ngrok или serveo.net:
```bash
# Используя ngrok
ngrok http 5174

# Используя serveo
ssh -R 80:localhost:5174 serveo.net
```

---

## 🚀 Деплой на собственном хостинге

### Подготовка

1. Создайте `.env` файл:
```bash
cp .env.example .env
```

2. Сгенерируйте SECRET_KEY:
```bash
python -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())'
```

3. Заполните `.env` файл

### Запуск на сервере

```bash
# 1. Соберите и запустите контейнеры
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up --build -d

# 2. Получите SSL сертификат (первый раз)
docker-compose run --rm certbot certonly \
  --webroot --webroot-path=/var/www/certbot \
  --email admin@bodyexp.ru \
  --agree-tos \
  -d bodyexp.ru -d www.bodyexp.ru

# 3. Перезапустите nginx
docker-compose restart frontend
```

### Обновление

```bash
# 1. Получите последние изменения
git pull origin main

# 2. Пересоберите контейнеры
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up --build -d

# 3. Примените миграции (если есть)
docker-compose exec backend python manage.py migrate

# 4. Соберите статику
docker-compose exec backend python manage.py collectstatic --no-input
```

---

## 🔐 Безопасность

### Важные правила:
1. ✅ Никогда не коммитьте `.env` файл
2. ✅ Используйте сильный SECRET_KEY (50+ символов)
3. ✅ DEBUG=False на продакшене
4. ✅ Регулярно обновляйте зависимости
5. ✅ Проверяйте логи на подозрительную активность

### Проверка безопасности:
```bash
# Frontend
npm audit

# Backend
pip list --outdated
```

Подробнее: [SECURITY_GUIDE.md](./SECURITY_GUIDE.md)

---

## 📚 Документация

- [VK Notifications](./VK_NOTIFICATIONS_README.md) - Система push-уведомлений
- [Leads.tech Integration](./LEADS_TECH_INTEGRATION.md) - Интеграция с арбитражем
- [Security Guide](./SECURITY_GUIDE.md) - Руководство по безопасности
- [Production Status](./backend/FINAL_PRODUCTION_STATUS.md) - Статус продакшена
- [Project Review](./PROJECT_REVIEW.md) - Полное ревью проекта

---

## 🐛 Отладка

### Логи

```bash
# Frontend (Docker)
docker logs babkymanki-full -f

# Backend (Docker)
docker logs <backend-container-id> -f

# Backend (systemd)
journalctl -u babkymanki-backend -f

# Nginx
docker exec babkymanki-full tail -f /var/log/nginx/access.log
docker exec babkymanki-full tail -f /var/log/nginx/error.log
```

### Типичные проблемы

#### 1. "Cannot connect to backend"
```bash
# Проверьте, что backend запущен
docker ps | grep backend
# или
systemctl status babkymanki-backend
```

#### 2. "VK Bridge is not available"
- Убедитесь, что приложение открыто в VK
- Проверьте, что VK Bridge скрипт загружен
- Откройте консоль браузера для деталей

#### 3. "CORS error"
- Проверьте CORS_ALLOWED_ORIGINS в settings.py
- Убедитесь, что домен добавлен в ALLOWED_HOSTS

---

## 🤝 Разработка

### Добавление нового МФО

**Через Django Admin**:
1. Перейдите на https://bodyexp.ru/admin/
2. Войдите как администратор
3. Добавьте новое МФО

**Через Excel**:
1. Скачайте шаблон: https://bodyexp.ru/api/mfos/template/
2. Заполните данные
3. Загрузите через /upload (доступно только admin)

### Кастомные хуки

Проект использует кастомные React хуки:

```javascript
// Push-уведомления
import { usePushNotifications } from './hooks/usePushNotifications';

// UTM трекинг
import { useUTMTracker } from './hooks/useUTMTracker';

// Арбитраж
import { useArbitrageTracker } from './hooks/useArbitrageTracker';

// Получение МФО
import { useMFOs } from './hooks/useMFOs';
```

### Стили

Стили организованы в модули:
- `styles/colors.css` - Цветовая палитра
- `styles/typography.css` - Шрифты и типографика
- `styles/components.css` - Общие компоненты

---

## 📝 TODO

- [ ] Перейти на PostgreSQL
- [ ] Добавить unit тесты
- [ ] Настроить CI/CD
- [ ] Добавить rate limiting
- [ ] Создать мобильное приложение
- [ ] Добавить систему отзывов
- [ ] Интегрировать платежную систему

---

## 📄 Лицензия

Proprietary - Все права защищены © 2025 БАБКИМАНКИ

---

## 👥 Команда

Разработано с ❤️ командой БАБКИМАНКИ

---

## 📞 Контакты

- **Сайт**: https://bodyexp.ru
- **VK Бот**: https://vk.me/babkimonkey
- **Email**: admin@bodyexp.ru

---

## 🙏 Благодарности

- VK за VK Bridge API
- Django и React сообщества
- Команда разработчиков

---

**Версия**: 1.0.0  
**Последнее обновление**: 8 ноября 2025


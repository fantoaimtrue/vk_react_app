# 🐒 БАБКИМАНКИ - VK Mini App

> **Поиск и сравнение МФО с системой офферов**
> 
> _"дает займ, когда отказали банки"_

[![Production Status](https://img.shields.io/badge/status-production-green.svg)](https://yourdomain.com)
[![Django](https://img.shields.io/badge/Django-5.2.4-green.svg)](https://www.djangoproject.com/)
[![React](https://img.shields.io/badge/React-18.2.0-blue.svg)](https://reactjs.org/)
[![VK Bridge](https://img.shields.io/badge/VK%20Bridge-2.15.7-blue.svg)](https://vk.com/dev/vk_bridge)

---

## 🌐 Демо

- **🔗 Продакшен**: https://yourdomain.com
- **📊 API**: https://yourdomain.com/api/mfos/
- **🎨 База знаний**: https://yourdomain.com/kb

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
│   │   ├── Header.jsx           # Шапка приложения
│   │   ├── Footer.jsx           # Подвал приложения
│   │   ├── HelpModal.jsx        # Модальное окно помощи
│   │   └── ...
│   ├── pages/                    # Страницы приложения
│   │   ├── MFOHomeWithUTM.jsx   # Главная страница (с UTM)
│   │   ├── MFODetail.jsx        # Детали МФО
│   │   ├── KnowledgeBase.jsx    # База знаний
│   │   └── ...
│   ├── hooks/                    # Кастомные React хуки
│   ├── App.jsx                   # Главный компонент
│   └── main.jsx                  # Точка входа
│
├── backend/                      # Django Backend
│   ├── api/                      # REST API приложение
│   ├── backend/                  # Настройки Django
│   └── manage.py                 # Django CLI
│
├── scripts/                      # Вспомогательные скрипты
│   ├── deploy.sh                # Скрипт деплоя
│   ├── change-domain.sh         # Смена домена
│   ├── setup-ssl.sh             # Настройка SSL
│   └── rebuild_frontend.sh      # Пересборка фронтенда
│
├── docs/                         # Документация и отчеты
│   ├── DEPLOY.md                # Инструкция по деплою
│   ├── VK_COMPLIANCE_REPORT.md  # Отчет о соответствии VK
│   └── ...
│
├── public/                       # Статические файлы
├── docker-compose.yml            # Docker конфигурация
├── nginx.conf                    # Nginx конфигурация
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
- **Framer Motion** - Анимации

### Backend
- **Django 5.2** - Web фреймворк
- **Django REST Framework 3.16** - REST API
- **Gunicorn** - WSGI сервер для продакшена

### Infrastructure
- **Docker & Docker Compose** - Контейнеризация
- **Nginx** - Reverse proxy и статика
- **Let's Encrypt** - SSL сертификаты
- **SQLite** - База данных

---

## 🎮 VK Mini-App Deployment

### VK Hosting (Бесплатно)

1. **Соберите production версию**:
```bash
npm run build
```

2. **Деплой на VK Hosting**:
```bash
npm run deploy
```

### Локальная разработка с VK Tunnel

```bash
# В одном терминале: запустите dev сервер
npm run dev

# В другом терминале: запустите туннель
npm run tunnel
```

---

## 🚀 Деплой на собственном хостинге

### Быстрый старт

1. **Создайте `.env` файл** (на основе `.env.example`).

2. **Обновите домен в конфигурации**:
```bash
./script./scripts/change-domain.sh yourdomain.com
```

3. **Запустите деплой**:
```bash
./script./scripts/deploy.sh
```

4. **Настройте SSL** (первый раз):
```bash
./script./scripts/setup-ssl.sh yourdomain.com your@email.com
```

---

## 📚 Документация

- [Инструкция по деплою](./docs/DEPLOY.md)
- [Отчет о соответствии VK](./docs/VK_COMPLIANCE_REPORT.md)
- [Аудит проекта](./docs/AUDIT_REPORT.md)

---

## 📄 Лицензия

Proprietary - Все права защищены © 2025 БАБКИМАНКИ

---

## 👥 Команда

Разработано с ❤️ командой БАБКИМАНКИ

---

**Версия**: 1.0.0  
**Последнее обновление**: 21 декабря 2025

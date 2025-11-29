# 🚀 ИНСТРУКЦИИ ПО ДЕПЛОЮ

**Дата**: 22 ноября 2025  
**Изменения**: Возврат к исходной логике открытия ссылок

---

## 📋 ЧТО ИЗМЕНЕНО

### Frontend (`src/pages/MFOHomeWithUTM.jsx`)
- ✅ Ссылка открывается **сразу** при клике (до всех await операций)
- ✅ Асинхронные операции выполняются параллельно через `Promise.all()`
- ✅ Это исходное решение для iOS Safari

---

## 🚀 КОМАНДЫ ДЛЯ ДЕПЛОЯ

### Вариант 1: Использовать скрипт (рекомендуется)
```bash
cd /root/vk_react_app
./deploy.sh
```

### Вариант 2: Вручную
```bash
cd /root/vk_react_app

# Пересборка frontend
docker-compose -f docker-compose.yml -f docker-compose.prod.yml build frontend

# Пересборка backend (если были изменения)
docker-compose -f docker-compose.yml -f docker-compose.prod.yml build backend

# Перезапуск всех сервисов
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Проверка статуса
docker-compose ps
```

### Вариант 3: Быстрый деплой (только frontend)
```bash
cd /root/vk_react_app
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build frontend
```

---

## 🔍 ПРОВЕРКА ПОСЛЕ ДЕПЛОЯ

### 1. Проверка статуса контейнеров
```bash
docker-compose ps
```
Все контейнеры должны быть в статусе `Up`.

### 2. Проверка логов
```bash
# Frontend
docker-compose logs frontend --tail 20

# Backend
docker-compose logs backend --tail 20

# Nginx
docker-compose logs nginx --tail 20
```

### 3. Проверка в браузере
1. Откройте приложение
2. Кликните на любой оффер
3. Ссылка должна открыться **сразу** при клике
4. Проверьте консоль (F12) - не должно быть ошибок

---

## ⚠️ ВОЗМОЖНЫЕ ПРОБЛЕМЫ

### Frontend не собирается
```bash
# Очистка кеша и пересборка
docker-compose -f docker-compose.yml -f docker-compose.prod.yml build --no-cache frontend
```

### Контейнеры не запускаются
```bash
# Проверка логов
docker-compose logs

# Перезапуск
docker-compose -f docker-compose.yml -f docker-compose.prod.yml restart
```

### Проблемы с портами
```bash
# Проверка занятых портов
netstat -tulpn | grep -E "80|443|8000"

# Остановка всех контейнеров
docker-compose down

# Запуск заново
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

---

## 📊 ОЖИДАЕМОЕ ВРЕМЯ

- Frontend сборка: **1-2 минуты**
- Backend сборка: **30-60 секунд**
- Перезапуск: **10-20 секунд**

**Общее время**: **2-3 минуты**

---

## ✅ РЕЗУЛЬТАТ

После успешного деплоя:
- ✅ Frontend пересобран с новой логикой
- ✅ Ссылки открываются сразу при клике
- ✅ Асинхронные операции не блокируют открытие
- ✅ Работает на iOS и Android

---

**Дата**: 22 ноября 2025  
**Статус**: Готово к деплою



# 🔄 ПЕРЕСБОРКА FRONTEND

**Дата**: 22 ноября 2025  
**Причина**: Исправления для открытия офферов  
**Статус**: Требуется пересборка

---

## ✅ ИЗМЕНЕНИЯ В КОДЕ

### Файл: `src/pages/MFOHomeWithUTM.jsx`

1. **Улучшена функция `openLink`:**
   - Убрана синхронная проверка `linkOpened`
   - Добавлена последовательность попыток: VK Bridge → window.open → location.href
   - Улучшена обработка ошибок

2. **Добавлена повторная попытка открытия:**
   - После успешной отправки данных в leads.tech
   - Ссылка открывается еще раз через 100ms

---

## 🚀 КОМАНДЫ ДЛЯ ПЕРЕСБОРКИ

### Вариант 1: Полная пересборка (рекомендуется)
```bash
cd /root/vk_react_app
docker-compose -f docker-compose.yml -f docker-compose.prod.yml stop frontend
docker-compose -f docker-compose.yml -f docker-compose.prod.yml build --no-cache frontend
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d frontend
```

### Вариант 2: Быстрая пересборка
```bash
cd /root/vk_react_app
docker-compose -f docker-compose.yml -f docker-compose.prod.yml build frontend
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d frontend
```

### Вариант 3: Перезапуск с пересборкой
```bash
cd /root/vk_react_app
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build frontend
```

---

## 🔍 ПРОВЕРКА

### После пересборки проверьте:

1. **Статус контейнера:**
```bash
docker-compose ps frontend
```

2. **Логи frontend:**
```bash
docker-compose logs frontend | tail -20
```

3. **Проверка в браузере:**
   - Откройте приложение
   - Кликните на оффер
   - Проверьте консоль (F12) - должны быть логи:
     - `🔗 [MFOClick] Пытаемся открыть ссылку`
     - `✅ [MFOClick] Ссылка открыта через...`
     - `🔗 [MFOClick] Повторная попытка открыть ссылку после отправки данных`

---

## ⏱️ ВРЕМЯ СБОРКИ

Ожидаемое время: **1-2 минуты**

---

**Дата**: 22 ноября 2025



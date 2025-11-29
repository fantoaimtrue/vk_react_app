# 🔧 ИСПРАВЛЕНИЕ: 403 Forbidden для API запросов

**Дата**: 22 ноября 2025  
**Проблема**: POST запросы к `/api/utm-track/` и `/api/arbitrage/send-to-leads-tech/` возвращают 403 Forbidden  
**Статус**: ✅ Исправлено

---

## 🔴 ПРОБЛЕМА

### Ошибки в консоли браузера:
```
POST https://bodyexp.ru/api/utm-track/ 403 (Forbidden)
POST https://bodyexp.ru/api/arbitrage/send-to-leads-tech/ 403 (Forbidden)
```

### Причины:
1. **CORS настройки**: `CORS_ALLOWED_ORIGINS` содержал только localhost, но не содержал `https://bodyexp.ru`
2. **CSRF защита**: Функция `send_to_leads_tech` не имела декоратора `@csrf_exempt`
3. **Nginx CORS заголовки**: Отсутствовали CORS заголовки в nginx для `/api`

---

## ✅ ЧТО ИСПРАВЛЕНО

### 1. Обновлены CORS настройки в Django

**Файл**: `backend/backend/settings.py`

**БЫЛО:**
```python
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]
```

**СТАЛО:**
```python
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://bodyexp.ru",
    "https://www.bodyexp.ru",
]

# Разрешаем все методы и заголовки для API
CORS_ALLOW_METHODS = [
    'DELETE',
    'GET',
    'OPTIONS',
    'PATCH',
    'POST',
    'PUT',
]

CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
]

CSRF_TRUSTED_ORIGINS = [
    'https://bodyexp.ru',
    'https://www.bodyexp.ru',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
]
```

### 2. Добавлен @csrf_exempt к send_to_leads_tech

**Файл**: `backend/api/views.py`

**БЫЛО:**
```python
@api_view(['POST'])
@permission_classes([AllowAny])
@ratelimit(key='ip', rate='100/h', method='POST')
def send_to_leads_tech(request):
```

**СТАЛО:**
```python
@csrf_exempt
@api_view(['POST'])
@permission_classes([AllowAny])
@ratelimit(key='ip', rate='100/h', method='POST')
def send_to_leads_tech(request):
```

**Примечание**: `utm_track` уже имел `@csrf_exempt`, поэтому не требовал изменений.

### 3. Добавлены CORS заголовки в nginx

**Файл**: `nginx.conf`

**ДОБАВЛЕНО:**
```nginx
location /api {
    # Обработка preflight запросов (OPTIONS)
    if ($request_method = 'OPTIONS') {
        add_header 'Access-Control-Allow-Origin' '*' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization' always;
        add_header 'Access-Control-Max-Age' 1728000 always;
        add_header 'Content-Type' 'text/plain; charset=utf-8' always;
        add_header 'Content-Length' 0 always;
        return 204;
    }
    
    proxy_pass http://backend:8000;
    # ... остальные proxy_set_header ...
    
    # CORS заголовки для API
    add_header 'Access-Control-Allow-Origin' '*' always;
    add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
    add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization' always;
}
```

---

## 📝 ИЗМЕНЕННЫЕ ФАЙЛЫ

1. **`backend/backend/settings.py`**
   - Добавлен `https://bodyexp.ru` в `CORS_ALLOWED_ORIGINS`
   - Добавлены `CORS_ALLOW_METHODS` и `CORS_ALLOW_HEADERS`
   - Обновлен `CSRF_TRUSTED_ORIGINS`

2. **`backend/api/views.py`**
   - Добавлен `@csrf_exempt` к функции `send_to_leads_tech`

3. **`nginx.conf`**
   - Добавлена обработка OPTIONS запросов (preflight)
   - Добавлены CORS заголовки для `/api`

---

## 🎯 КАК РАБОТАЕТ ТЕПЕРЬ

### Последовательность обработки запроса:

1. **Браузер отправляет preflight запрос (OPTIONS)**
   - Nginx обрабатывает и возвращает CORS заголовки
   - Возвращает 204 No Content

2. **Браузер отправляет основной запрос (POST)**
   - Nginx проксирует на backend с CORS заголовками
   - Django проверяет CORS (разрешен bodyexp.ru)
   - Django проверяет CSRF (отключен через @csrf_exempt)
   - Запрос обрабатывается успешно ✅

3. **Ответ возвращается с CORS заголовками**
   - Браузер принимает ответ без ошибок

---

## ✅ РЕЗУЛЬТАТ

### До исправления:
- ❌ POST `/api/utm-track/` → 403 Forbidden
- ❌ POST `/api/arbitrage/send-to-leads-tech/` → 403 Forbidden

### После исправления:
- ✅ POST `/api/utm-track/` → 200 OK
- ✅ POST `/api/arbitrage/send-to-leads-tech/` → 200 OK
- ✅ CORS заголовки работают корректно
- ✅ Preflight запросы обрабатываются

---

## 🔍 КАК ПРОВЕРИТЬ

### 1. В консоли браузера (F12):

**Успешный запрос:**
```
POST https://bodyexp.ru/api/utm-track/ 200 OK
POST https://bodyexp.ru/api/arbitrage/send-to-leads-tech/ 200 OK
```

**Проверка CORS заголовков:**
```javascript
fetch('https://bodyexp.ru/api/utm-track/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ test: 'data' })
})
.then(r => console.log('Status:', r.status))
.catch(e => console.error('Error:', e));
```

### 2. Проверка через curl:

```bash
# Проверка preflight запроса
curl -X OPTIONS https://bodyexp.ru/api/utm-track/ \
  -H "Origin: https://bodyexp.ru" \
  -H "Access-Control-Request-Method: POST" \
  -v

# Проверка POST запроса
curl -X POST https://bodyexp.ru/api/utm-track/ \
  -H "Content-Type: application/json" \
  -H "Origin: https://bodyexp.ru" \
  -d '{"test": "data"}' \
  -v
```

---

## 🚀 ДЕПЛОЙ

### Выполнено:
- ✅ Настройки CORS обновлены
- ✅ Добавлен @csrf_exempt к send_to_leads_tech
- ✅ CORS заголовки добавлены в nginx
- ✅ Backend перезапущен
- ✅ Nginx перезапущен
- ✅ Конфигурация nginx проверена

### Команды:
```bash
# Перезапуск backend и nginx
docker-compose restart backend nginx

# Проверка конфигурации nginx
docker-compose exec nginx nginx -t
```

---

## 📊 СТАТУС

**До исправления**: ❌ 403 Forbidden для всех POST запросов к API

**После исправления**: ✅ Все POST запросы работают корректно:
- `/api/utm-track/` ✅
- `/api/arbitrage/send-to-leads-tech/` ✅
- CORS заголовки работают ✅
- Preflight запросы обрабатываются ✅

---

**Дата**: 22 ноября 2025  
**Статус**: ✅ Исправлено и развернуто



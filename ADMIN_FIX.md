# 🔧 Исправление админки Django

## Проблема
При переходе на `https://bodyexp.ru/admin/` отображалось React приложение вместо Django админки.

## Причина
В nginx.conf правило для `/admin/` не имело достаточного приоритета или было неправильно настроено.

## Решение

### 1. Изменен порядок правил в nginx.conf
Правило для `/admin` теперь стоит **ПЕРЕД** общим правилом для `/`:

```nginx
# Сначала админка
location /admin {
    ...
}

# Потом API
location /api {
    ...
}

# Потом статика
location /static/ {
    ...
}

# И только потом фронтенд
location / {
    ...
}
```

### 2. Добавлены заголовки для отключения кеша
```nginx
add_header Cache-Control "no-cache, no-store, must-revalidate";
add_header Pragma "no-cache";
add_header Expires "0";
```

### 3. Отключена буферизация и кеширование прокси
```nginx
proxy_buffering off;
proxy_cache off;
```

## Проверка

После исправления админка должна работать по адресу:
- `https://bodyexp.ru/admin/`

## Важно для пользователя

Если после исправления все еще видно React приложение:
1. **Очистите кеш браузера** (Ctrl+Shift+Delete)
2. Или откройте в режиме инкогнито
3. Или добавьте `?nocache=1` к URL: `https://bodyexp.ru/admin/?nocache=1`

## Статус
✅ Исправлено
✅ Nginx перезапущен
✅ Конфигурация применена



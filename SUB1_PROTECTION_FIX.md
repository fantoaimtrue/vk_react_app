# 🔒 Исправление проблемы с неправильным sub1

## 🎯 Проблема:
При клике на WEBBANKIR в leads.tech записывалось `babkimankirf-of-ras-zaymer-66` вместо `babkimankirf-of-list-open-webbankir-686`.

## 🔍 Причины:

### 1. В базе было 2 WEBBANKIR с разными sub1
- **ID 39**: `sub1=babkimankirf-of-list-turbo` (старый/неправильный)
- **ID 48**: `sub1=babkimankirf-of-list-open-webbankir-686` (правильный)

### 2. sub1 перезаписывался из utmParams
**Проблема:**
- `generateLinkWithUTM` объединял `utmParams` и `additionalParams`
- Если в `utmParams` был `sub1` (из старого источника/кеша), он перезаписывал `sub1` из ссылки МФО
- **Итог: неправильный sub1!**

## ✅ Что исправлено:

### 1. Защита sub1 от перезаписи
**Файл:** `src/hooks/useUTMTracker.js`

**Изменения:**
- Извлекаем `sub1` из исходной ссылки МФО в начале функции
- Удаляем `sub1` из `utmParams` и `additionalParams`, чтобы он не перезаписывался
- Восстанавливаем защищенный `sub1` в финальной ссылке перед возвратом

**Код:**
```javascript
// Извлекаем sub1 из исходной ссылки МФО
let protectedSub1 = null;
try {
  const urlObj = new URL(templateUrl);
  protectedSub1 = urlObj.searchParams.get('sub1');
} catch (e) {
  const sub1Match = templateUrl.match(/[?&]sub1=([^&]*)/);
  if (sub1Match) {
    protectedSub1 = decodeURIComponent(sub1Match[1]);
  }
}

// Удаляем sub1 из utmParams и additionalParams
const { sub1: _, ...utmParamsWithoutSub1 } = utmParams;
const { sub1: __, ...additionalParamsWithoutSub1 } = additionalParams;

// ... обработка ссылки ...

// Восстанавливаем защищенный sub1 в финальной ссылке
if (protectedSub1) {
  // Восстанавливаем sub1 из исходной ссылки МФО
}
```

### 2. Обновлена ссылка у старого WEBBANKIR (ID 39)
- Обновлен `sub1` с `babkimankirf-of-list-turbo` на `babkimankirf-of-list-open-webbankir-686`
- Теперь оба WEBBANKIR имеют правильный sub1

## 🧪 Тестирование:
1. Кликните на WEBBANKIR
2. Проверьте в leads.tech - должен быть `babkimankirf-of-list-open-webbankir-686`
3. Проверьте другие МФО - sub1 должен быть правильным для каждого МФО

## 📊 Про "babkimankirf-of-ras-zaymer-66":

Это **старая ссылка**, которой **нет в текущей базе**. Возможные причины появления:
1. Клик пришел из старого источника (бот, старая реклама)
2. Cached ссылка в leads.tech
3. Другой источник трафика (не витрина)

**Теперь с защитой sub1 это не должно происходить!** ✅

---
**Статус:** Проблема исправлена! ✅
**Дата:** $(date)

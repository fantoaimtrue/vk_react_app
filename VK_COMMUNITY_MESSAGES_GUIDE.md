# 📬 Руководство по работе с сообщениями от сообщества VK

## Обзор

Это руководство описывает, как реализовать запрос разрешения на отправку сообщений от имени сообщества в VK Mini App.

## Как это работает

### 1. VK API метод `messages.allowMessagesFromGroup`

Согласно документации VK, для получения разрешения на отправку сообщений от имени сообщества используется метод API `messages.allowMessagesFromGroup`, который требует:

- **Токен пользователя** с правами `messages`
- **ID сообщества** (group_id)
- **VK User ID** пользователя

### 2. Реализация в нашем проекте

Мы реализовали систему, которая:

1. **Запрашивает токен пользователя** через `VKWebAppGetAuthToken` с правами `messages`
2. **Вызывает VK API метод** `messages.allowMessagesFromGroup` через backend
3. **Сохраняет статус разрешения** в базе данных в поле `messages_allowed`

## Установка и настройка

### 1. Создание миграции

После добавления поля `messages_allowed` в модель `VKUser`, необходимо создать миграцию:

```bash
cd /root/vk_react_app/backend
python manage.py makemigrations api --name add_messages_allowed_field
python manage.py migrate
```

### 2. Настройка переменных окружения

Убедитесь, что в `.env` файле указан `VK_GROUP_ID`:

```env
VK_GROUP_ID=230927358
```

Или в `backend/backend/settings.py` уже установлено значение по умолчанию.

### 3. Настройка приложения VK

Убедитесь, что ваше VK Mini App имеет следующие настройки:

1. **Права доступа**: В настройках приложения должен быть включен доступ к `messages`
2. **Сообщество**: Приложение должно быть привязано к сообществу с ID, указанным в `VK_GROUP_ID`

## Использование

### 1. Базовое использование хука

```javascript
import { useCommunityMessages } from './hooks/useCommunityMessages';

function MyComponent() {
  const {
    showModal,
    isLoading,
    handleAllowMessages,
    handleClose,
    messagesAllowed,
    requestPermission,
  } = useCommunityMessages();

  return (
    <div>
      {messagesAllowed ? (
        <p>✅ Разрешение на сообщения получено</p>
      ) : (
        <button onClick={requestPermission}>
          Разрешить сообщения от сообщества
        </button>
      )}

      {showModal && (
        <div className="modal">
          <h2>Разрешить сообщения от сообщества?</h2>
          <button onClick={handleAllowMessages} disabled={isLoading}>
            {isLoading ? 'Загрузка...' : 'Разрешить'}
          </button>
          <button onClick={handleClose}>Отмена</button>
        </div>
      )}
    </div>
  );
}
```

### 2. Интеграция в App.jsx

```javascript
import { useCommunityMessages } from './hooks/useCommunityMessages';

function App() {
  const {
    showModal: showMessagesModal,
    isLoading: isMessagesLoading,
    handleAllowMessages,
    handleClose: handleCloseMessages,
    messagesAllowed,
  } = useCommunityMessages();

  return (
    <div>
      {/* Ваш основной контент */}
      
      {/* Модальное окно для запроса разрешения на сообщения */}
      {showMessagesModal && (
        <NotificationSubscriptionModal
          isLoading={isMessagesLoading}
          onSubscribe={handleAllowMessages}
          onClose={handleCloseMessages}
        />
      )}
    </div>
  );
}
```

## API Endpoints

### POST `/api/users/allow-messages/`

Запрос разрешения на отправку сообщений от имени сообщества.

**Параметры:**

```json
{
  "vk_user_id": 123456789,
  "allowed": true,
  "access_token": "user_access_token_with_messages_scope" // опционально
}
```

**Ответ:**

```json
{
  "success": true,
  "message": "Сообщения от сообщества разрешены",
  "messages_allowed": true
}
```

### GET `/api/users/status/?vk_user_id=123456789`

Получение статуса пользователя, включая `messages_allowed`.

**Ответ:**

```json
{
  "success": true,
  "user": {
    "id": 1,
    "vk_user_id": 123456789,
    "first_name": "Иван",
    "last_name": "Иванов",
    "notifications_allowed": true,
    "messages_allowed": true,
    ...
  }
}
```

## Процесс работы

1. **Пользователь инициализируется** - хук получает данные пользователя через `VKWebAppGetUserInfo`
2. **Проверка статуса** - хук проверяет статус `messages_allowed` в базе данных
3. **Запрос разрешения** - при вызове `handleAllowMessages`:
   - Запрашивается токен пользователя через `VKWebAppGetAuthToken` с правами `messages`
   - Токен отправляется на backend
   - Backend вызывает VK API метод `messages.allowMessagesFromGroup`
   - Статус сохраняется в базе данных
4. **Отправка сообщений** - после получения разрешения можно отправлять сообщения от имени сообщества через VK API

## Отправка сообщений от сообщества

После получения разрешения, вы можете отправлять сообщения от имени сообщества используя VK API метод `messages.send`:

```python
import requests

def send_community_message(user_id, message):
    """
    Отправка сообщения от имени сообщества пользователю
    """
    community_token = settings.VK_COMMUNITY_TOKEN  # Токен сообщества
    group_id = settings.VK_GROUP_ID
    
    params = {
        'access_token': community_token,
        'user_id': user_id,
        'message': message,
        'random_id': 0,  # Генерируйте случайное число
        'v': '5.131',
    }
    
    response = requests.post(
        'https://api.vk.com/method/messages.send',
        params=params,
        timeout=10
    )
    
    return response.json()
```

## Важные замечания

1. **Токен пользователя**: Для запроса разрешения нужен токен пользователя с правами `messages`, который получается через `VKWebAppGetAuthToken`
2. **Токен сообщества**: Для отправки сообщений нужен токен сообщества (community token), который получается через `VKWebAppGetCommunityToken` или настраивается в настройках сообщества
3. **Ограничения**: VK имеет ограничения на количество сообщений, которые можно отправить от имени сообщества (обычно 20 сообщений в день для новых сообществ)
4. **Права доступа**: Убедитесь, что приложение имеет необходимые права доступа в настройках VK

## Troubleshooting

### Ошибка: "Access denied"

- Убедитесь, что приложение имеет права доступа `messages` в настройках VK
- Проверьте, что токен пользователя получен с правильными правами

### Ошибка: "User not found"

- Убедитесь, что пользователь зарегистрирован в базе данных через `/api/users/register/`

### Ошибка: "Invalid group_id"

- Проверьте, что `VK_GROUP_ID` в настройках соответствует реальному ID сообщества
- Убедитесь, что приложение привязано к этому сообществу

## Дополнительные ресурсы

- [VK API - messages.allowMessagesFromGroup](https://dev.vk.com/ru/method/messages.allowMessagesFromGroup)
- [VK Bridge - VKWebAppGetAuthToken](https://dev.vk.com/ru/bridge/VKWebAppGetAuthToken)
- [VK Bridge - VKWebAppGetCommunityToken](https://dev.vk.com/ru/bridge/VKWebAppGetCommunityToken)
- [VK API - messages.send](https://dev.vk.com/ru/method/messages.send)


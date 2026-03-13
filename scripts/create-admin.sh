#!/bin/bash

# Скрипт для создания суперпользователя Django

cd "$(dirname "$0")/.."

# Определяем команду Python
if command -v python3 &> /dev/null; then
  PYTHON_CMD="python3"
elif command -v python &> /dev/null; then
  PYTHON_CMD="python"
else
  echo "❌ Ошибка: Python не найден"
  exit 1
fi

# Проверяем наличие виртуального окружения
PYTHON_PATH="$PYTHON_CMD"
if [ -d "backend/venv" ]; then
  if [ -f "backend/venv/bin/python3" ]; then
    PYTHON_PATH="backend/venv/bin/python3"
  elif [ -f "backend/venv/bin/python" ]; then
    PYTHON_PATH="backend/venv/bin/python"
  fi
fi

echo "🔐 Создание суперпользователя для Django админки"
echo ""

# Проверяем наличие manage.py
if [ ! -f "backend/manage.py" ]; then
  echo "❌ Ошибка: файл backend/manage.py не найден"
  exit 1
fi

cd backend

echo "📝 Введите данные для суперпользователя:"
echo ""

# Запрашиваем данные
read -p "Имя пользователя (username) [admin]: " username
username=${username:-admin}

read -p "Email (опционально): " email

read -sp "Пароль: " password
echo ""

if [ -z "$password" ]; then
  echo "❌ Пароль не может быть пустым"
  exit 1
fi

read -sp "Повторите пароль: " password2
echo ""

if [ "$password" != "$password2" ]; then
  echo "❌ Пароли не совпадают"
  exit 1
fi

echo ""
echo "🚀 Создаю суперпользователя..."

# Создаем суперпользователя через Django shell
$PYTHON_PATH manage.py shell << EOF
from django.contrib.auth import get_user_model
User = get_user_model()

username = "$username"
password = "$password"
email = "$email" if "$email" else ""

try:
    user = User.objects.get(username=username)
    print(f"⚠️  Пользователь '{username}' уже существует. Обновляю пароль и права...")
    user.set_password(password)
    user.is_staff = True
    user.is_superuser = True
    if email:
        user.email = email
    user.save()
    print(f"✅ Пользователь '{username}' обновлен!")
except User.DoesNotExist:
    user = User.objects.create_superuser(username=username, password=password, email=email)
    print(f"✅ Суперпользователь '{username}' создан успешно!")
EOF

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Готово!"
  echo ""
  echo "📋 Данные для входа в админку:"
  echo "   URL: http://localhost:8000/admin/"
  echo "   Имя пользователя: $username"
  echo "   Пароль: (введенный вами)"
  echo ""
else
  echo "❌ Ошибка при создании суперпользователя"
  exit 1
fi



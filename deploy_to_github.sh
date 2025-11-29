#!/bin/bash
# Скрипт для автоматического деплоя в GitHub

set -e

echo "🚀 Начинаем деплой в GitHub..."

# Переходим в директорию проекта
cd "$(dirname "$0")"

# Проверяем статус git
echo "📊 Проверяем статус git..."
git status

# Пытаемся выполнить push через HTTPS
echo ""
echo "📤 Пытаемся выполнить push через HTTPS..."
if git push origin main 2>&1; then
    echo "✅ Успешно отправлено в GitHub!"
    exit 0
fi

# Если HTTPS не работает, пробуем SSH
echo ""
echo "📤 Пытаемся выполнить push через SSH..."
git remote set-url origin git@github.com:fantoaimtrue/vk_react_app.git
if git push origin main 2>&1; then
    echo "✅ Успешно отправлено в GitHub через SSH!"
    exit 0
fi

# Если оба метода не работают, выводим инструкции
echo ""
echo "⚠️  Автоматический push не удался. Требуется настройка авторизации."
echo ""
echo "Вариант 1: Добавить SSH ключ в GitHub"
echo "1. Скопируйте публичный ключ:"
cat ~/.ssh/id_ed25519.pub
echo ""
echo "2. Перейдите на https://github.com/settings/keys"
echo "3. Нажмите 'New SSH key'"
echo "4. Вставьте ключ выше"
echo "5. Запустите: git push origin main"
echo ""
echo "Вариант 2: Использовать Personal Access Token"
echo "1. Создайте токен на https://github.com/settings/tokens"
echo "2. Выберите права 'repo'"
echo "3. Установите переменную: export GITHUB_TOKEN=ваш_токен"
echo "4. Запустите этот скрипт снова"

exit 1


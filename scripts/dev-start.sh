#!/bin/bash

# Скрипт для быстрого запуска dev-режима
# Позволяет видеть изменения в реальном времени без деплоя в прод

# Функция для очистки при выходе
cleanup() {
  if [ -f "/tmp/backend_dev.pid" ]; then
    BACKEND_PID=$(cat /tmp/backend_dev.pid)
    if ps -p $BACKEND_PID > /dev/null 2>&1; then
      echo ""
      echo "🛑 Останавливаю Backend (PID: $BACKEND_PID)..."
      kill $BACKEND_PID 2>/dev/null || true
      sleep 1
      # Принудительно убиваем, если не остановился
      kill -9 $BACKEND_PID 2>/dev/null || true
      echo "✅ Backend остановлен"
    fi
    rm -f /tmp/backend_dev.pid
  fi
  exit 0
}

# Устанавливаем обработчик сигналов
trap cleanup SIGINT SIGTERM EXIT

cd "$(dirname "$0")/.."

# Определяем команду Python (python3 или python)
if command -v python3 &> /dev/null; then
  PYTHON_CMD="python3"
elif command -v python &> /dev/null; then
  PYTHON_CMD="python"
else
  echo "❌ Ошибка: Python не найден. Установите Python 3.11+"
  exit 1
fi

echo "🚀 Запуск dev-режима для быстрого просмотра изменений..."
echo ""
echo "📝 Варианты запуска:"
echo "1. Только Frontend (быстрый старт) - использует продакшен API ⚠️  требует работающий продакшн"
echo "2. Frontend + Backend (полная локальная разработка) ✅ РЕКОМЕНДУЕТСЯ для разработки"
echo "3. Frontend + VK Tunnel (для тестирования в VK)"
echo ""
read -p "Выберите вариант (1/2/3) [по умолчанию: 2]: " choice
choice=${choice:-2}

case $choice in
  1)
    echo ""
    echo "✅ Запускаю только Frontend..."
    echo "🌐 Приложение будет доступно на: http://localhost:5174"
    echo "📡 API запросы будут идти на продакшен: https://utkaminiapp.ru/api"
    echo ""
    echo "🔍 Проверяю доступность API..."
    if curl -s -o /dev/null -w "%{http_code}" --max-time 5 https://utkaminiapp.ru/api/mfos/ | grep -q "200\|404"; then
      echo "✅ API доступен"
    else
      echo "⚠️  Внимание: API может быть недоступен. Проверьте подключение к интернету."
      echo "   Если ошибка 500, убедитесь, что продакшен сервер работает."
    fi
    echo ""
    echo "💡 Изменения будут видны автоматически (Hot Reload)"
    echo "🛑 Для остановки нажмите Ctrl+C"
    echo ""
    VITE_API_TARGET=https://utkaminiapp.ru VITE_USE_DB_API=false npm run dev
    ;;
  2)
    echo ""
    echo "✅ Запускаю Frontend + Backend (локальная разработка)..."
    echo ""
    echo "🔍 Проверяю доступность локального Backend..."
    backend_running=false
    if curl -s -o /dev/null -w "%{http_code}" --max-time 2 http://localhost:8000/api/mfos/ 2>/dev/null | grep -q "200\|404\|500"; then
      echo "✅ Backend уже запущен и доступен"
      backend_running=true
    else
      echo "⚠️  Backend не запущен на http://localhost:8000"
      echo ""
      echo "💡 Я могу запустить Backend автоматически в фоновом режиме"
      echo "   Или вы можете запустить его вручную в отдельном терминале:"
      echo "   cd backend && $PYTHON_CMD manage.py runserver 8000"
      echo ""
      read -p "Запустить Backend автоматически? (y/n) [y]: " start_backend
      start_backend=${start_backend:-y}
      
      if [[ $start_backend == "y" ]]; then
        echo ""
        echo "🚀 Запускаю Backend..."
        
        # Проверяем наличие manage.py
        if [ ! -f "backend/manage.py" ]; then
          echo "❌ Ошибка: файл backend/manage.py не найден"
          echo "   Убедитесь, что вы находитесь в корне проекта"
          exit 1
        fi
        
        # Проверяем наличие виртуального окружения
        PYTHON_PATH="$PYTHON_CMD"
        if [ -d "backend/venv" ]; then
          echo "📦 Обнаружено виртуальное окружение в backend/venv"
          if [ -f "backend/venv/bin/python3" ]; then
            PYTHON_PATH="backend/venv/bin/python3"
          elif [ -f "backend/venv/bin/python" ]; then
            PYTHON_PATH="backend/venv/bin/python"
          else
            echo "⚠️  Виртуальное окружение найдено, но Python не найден внутри"
            echo "   Использую системный Python: $PYTHON_CMD"
          fi
        fi
        
        # Проверяем, что Python доступен
        if ! $PYTHON_PATH --version &> /dev/null; then
          echo "❌ Ошибка: Python недоступен по пути: $PYTHON_PATH"
          echo "   Попробуйте запустить Backend вручную"
          exit 1
        fi
        
        echo "🐍 Использую Python: $PYTHON_PATH"
        echo "🚀 Запускаю Backend..."
        
        # Запускаем бэкенд в фоне
        cd backend
        $PYTHON_PATH manage.py runserver 8000 > /tmp/backend.log 2>&1 &
        BACKEND_PID=$!
        cd ..
        
        echo "⏳ Жду запуска Backend (5 секунд)..."
        sleep 5
        
        # Проверяем, запустился ли бэкенд
        if curl -s -o /dev/null -w "%{http_code}" --max-time 2 http://localhost:8000/api/mfos/ 2>/dev/null | grep -q "200\|404\|500"; then
          echo "✅ Backend успешно запущен (PID: $BACKEND_PID)"
          echo "   Логи доступны в /tmp/backend.log"
          backend_running=true
          
          # Сохраняем PID для возможной остановки
          echo $BACKEND_PID > /tmp/backend_dev.pid
          echo "   Для остановки Backend: kill $BACKEND_PID"
        else
          echo "⚠️  Backend не запустился. Проверьте логи:"
          echo "   tail -f /tmp/backend.log"
          echo ""
          read -p "Продолжить запуск Frontend без Backend? (y/n) [n]: " continue_anyway
          continue_anyway=${continue_anyway:-n}
          if [[ $continue_anyway != "y" ]]; then
            echo "❌ Запуск отменен"
            kill $BACKEND_PID 2>/dev/null || true
            exit 1
          fi
        fi
      else
        echo ""
        read -p "Продолжить запуск Frontend без Backend? (y/n) [n]: " continue_anyway
        continue_anyway=${continue_anyway:-n}
        if [[ $continue_anyway != "y" ]]; then
          echo "❌ Запуск отменен"
          exit 1
        fi
      fi
    fi
    echo ""
    echo "🌐 Frontend будет доступно на: http://localhost:5174"
    echo "📡 API будет доступен на: http://localhost:8000/api"
    echo ""
    if [ "$backend_running" = true ]; then
      echo "✅ Backend работает - вы можете делать изменения в backend/ и они будут видны"
    fi
    echo "💡 Изменения во Frontend будут видны автоматически (Hot Reload)"
    echo "🛑 Для остановки нажмите Ctrl+C"
    if [ -f "/tmp/backend_dev.pid" ]; then
      echo "   Backend будет остановлен автоматически"
    fi
    echo ""
    VITE_API_TARGET=http://localhost:8000 VITE_USE_DB_API=true npm run dev
    ;;
  3)
    echo ""
    echo "✅ Запускаю Frontend + VK Tunnel..."
    echo ""
    echo "⚠️  Это создаст публичный URL для тестирования в VK"
    echo ""
    echo "💡 Откройте два терминала:"
    echo "   Терминал 1: VITE_API_TARGET=https://utkaminiapp.ru VITE_USE_DB_API=false npm run dev"
    echo "   Терминал 2: npm run tunnel"
    echo ""
    read -p "Запустить Frontend сейчас? (y/n) [y]: " start_frontend
    start_frontend=${start_frontend:-y}
    if [[ $start_frontend == "y" ]]; then
      VITE_API_TARGET=https://utkaminiapp.ru VITE_USE_DB_API=false npm run dev &
      echo ""
      echo "⏳ Запускаю VK Tunnel через 3 секунды..."
      sleep 3
      npm run tunnel
    else
      echo "Запустите вручную: npm run dev (в одном терминале) и npm run tunnel (в другом)"
    fi
    ;;
  *)
    echo "❌ Неверный выбор"
    exit 1
    ;;
esac



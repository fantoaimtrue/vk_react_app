/**
 * VK Mini App - Система подписки на уведомления
 * 
 * Этот код реализует полную систему подписки на push-уведомления
 * для VK Mini App с учетом мобильных устройств и обработки ошибок.
 */

import bridge from '@vkontakte/vk-bridge';

class VKNotificationsManager {
    constructor() {
        this.isSubscribed = false;
        this.userId = null;
        this.init();
    }

    /**
     * Инициализация системы уведомлений
     * Проверяет статус подписки при загрузке приложения
     */
    async init() {
        try {
            console.log('🔔 Инициализация системы уведомлений...');
            
            // Получаем информацию о пользователе
            const userInfo = await bridge.send('VKWebAppGetUserInfo');
            this.userId = userInfo.id;
            console.log('👤 Пользователь:', userInfo.first_name, userInfo.last_name);
            
            // Проверяем текущий статус подписки
            await this.checkNotificationStatus();
            
        } catch (error) {
            console.error('❌ Ошибка инициализации:', error);
            this.showError('Ошибка загрузки приложения');
        }
    }

    /**
     * Проверка текущего статуса подписки на уведомления
     * Использует VK Bridge для получения актуального статуса
     */
    async checkNotificationStatus() {
        try {
            console.log('🔍 Проверяем статус подписки...');
            
            // Проверяем разрешения через VK Bridge
            const result = await bridge.send('VKWebAppCheckAllowedNotifications');
            this.isSubscribed = result.result;
            
            console.log('📊 Статус подписки:', this.isSubscribed ? '✅ Разрешено' : '❌ Запрещено');
            
            // Если уведомления не разрешены, показываем окно подписки
            if (!this.isSubscribed) {
                this.showSubscriptionModal();
            } else {
                console.log('✅ Пользователь уже подписан на уведомления');
                this.showSuccess('Вы подписаны на уведомления!');
            }
            
        } catch (error) {
            console.error('❌ Ошибка проверки статуса:', error);
            
            // Если метод не поддерживается, показываем окно подписки
            this.showSubscriptionModal();
        }
    }

    /**
     * Показ модального окна с предложением подписаться
     * Создает красивое модальное окно с кнопками действий
     */
    showSubscriptionModal() {
        console.log('📱 Показываем окно подписки...');
        
        // Создаем HTML для модального окна
        const modalHTML = `
            <div id="notification-modal" class="notification-modal-overlay">
                <div class="notification-modal-content">
                    <div class="modal-icon">🔔</div>
                    <h2 class="modal-title">Не пропустите важные предложения!</h2>
                    <p class="modal-description">
                        Подпишитесь на уведомления, чтобы получать персональные предложения по займам с высоким шансом одобрения.
                    </p>
                    <div class="modal-actions">
                        <button id="subscribe-btn" class="btn-subscribe">
                            Подписаться на уведомления
                        </button>
                        <button id="skip-btn" class="btn-skip">
                            Позже
                        </button>
                    </div>
                    <button id="close-btn" class="btn-close">×</button>
                </div>
            </div>
        `;

        // Добавляем модальное окно в DOM
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // Добавляем стили
        this.addModalStyles();

        // Привязываем обработчики событий
        this.bindModalEvents();
    }

    /**
     * Привязка обработчиков событий для модального окна
     */
    bindModalEvents() {
        const modal = document.getElementById('notification-modal');
        const subscribeBtn = document.getElementById('subscribe-btn');
        const skipBtn = document.getElementById('skip-btn');
        const closeBtn = document.getElementById('close-btn');

        // Обработчик подписки
        subscribeBtn.addEventListener('click', () => {
            this.requestNotificationPermission();
        });

        // Обработчик пропуска
        skipBtn.addEventListener('click', () => {
            this.hideModal();
            this.showInfo('Вы всегда можете подписаться позже в настройках');
        });

        // Обработчик закрытия
        closeBtn.addEventListener('click', () => {
            this.hideModal();
        });

        // Закрытие по клику на фон
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.hideModal();
            }
        });
    }

    /**
     * Запрос разрешения на отправку уведомлений
     * Основной метод для подписки пользователя
     */
    async requestNotificationPermission() {
        try {
            console.log('🔔 Запрашиваем разрешение на уведомления...');
            
            // Показываем индикатор загрузки
            this.showLoading('Подписываем...');

            // Асинхронный вызов VK Bridge
            const result = await bridge.send('VKWebAppAllowNotifications');
            
            console.log('📱 Результат запроса:', result);

            // Обработка успешного результата
            if (result.result === true) {
                this.isSubscribed = true;
                this.hideModal();
                this.showSuccess('Спасибо за подписку! Теперь вы будете получать важные уведомления.');
                console.log('✅ Пользователь успешно подписался');
            } else {
                // Пользователь отказался
                this.hideModal();
                this.showInfo('Вы всегда можете подписаться позже в настройках');
                console.log('❌ Пользователь отказался от подписки');
            }

        } catch (error) {
            console.error('❌ Ошибка при запросе разрешения:', error);
            this.hideModal();
            
            // Обработка различных типов ошибок
            if (error.error_type === 'client_error') {
                this.showError('Уведомления не поддерживаются в вашей версии приложения');
            } else if (error.error_type === 'api_error') {
                this.showError('Ошибка API ВКонтакте. Попробуйте позже');
            } else {
                this.showError('Произошла ошибка. Попробуйте позже');
            }
        }
    }

    /**
     * Скрытие модального окна
     */
    hideModal() {
        const modal = document.getElementById('notification-modal');
        if (modal) {
            modal.remove();
        }
    }

    /**
     * Показ индикатора загрузки
     */
    showLoading(message) {
        const subscribeBtn = document.getElementById('subscribe-btn');
        if (subscribeBtn) {
            subscribeBtn.textContent = message;
            subscribeBtn.disabled = true;
        }
    }

    /**
     * Показ сообщения об успехе
     */
    showSuccess(message) {
        this.showToast(message, 'success');
    }

    /**
     * Показ информационного сообщения
     */
    showInfo(message) {
        this.showToast(message, 'info');
    }

    /**
     * Показ сообщения об ошибке
     */
    showError(message) {
        this.showToast(message, 'error');
    }

    /**
     * Универсальный метод для показа уведомлений
     */
    showToast(message, type = 'info') {
        // Создаем элемент уведомления
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        
        // Добавляем стили
        Object.assign(toast.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '12px 20px',
            borderRadius: '8px',
            color: 'white',
            fontWeight: '500',
            zIndex: '10000',
            maxWidth: '300px',
            wordWrap: 'break-word',
            animation: 'slideInRight 0.3s ease-out'
        });

        // Цвета в зависимости от типа
        const colors = {
            success: '#4CAF50',
            error: '#f44336',
            info: '#2196F3'
        };
        toast.style.backgroundColor = colors[type] || colors.info;

        // Добавляем в DOM
        document.body.appendChild(toast);

        // Автоматически скрываем через 4 секунды
        setTimeout(() => {
            toast.style.animation = 'slideOutRight 0.3s ease-in';
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }

    /**
     * Добавление CSS стилей для модального окна
     */
    addModalStyles() {
        const styles = `
            <style>
                .notification-modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.6);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    z-index: 1000;
                    padding: 20px;
                    backdrop-filter: blur(5px);
                }

                .notification-modal-content {
                    background: white;
                    border-radius: 16px;
                    padding: 24px;
                    max-width: 400px;
                    width: 100%;
                    position: relative;
                    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
                    animation: modalSlideIn 0.3s ease-out;
                }

                @keyframes modalSlideIn {
                    from {
                        opacity: 0;
                        transform: translateY(-20px) scale(0.95);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0) scale(1);
                    }
                }

                .modal-icon {
                    font-size: 48px;
                    text-align: center;
                    margin-bottom: 16px;
                    animation: bounce 2s infinite;
                }

                @keyframes bounce {
                    0%, 20%, 50%, 80%, 100% {
                        transform: translateY(0);
                    }
                    40% {
                        transform: translateY(-8px);
                    }
                    60% {
                        transform: translateY(-4px);
                    }
                }

                .modal-title {
                    font-size: 24px;
                    font-weight: 700;
                    text-align: center;
                    margin: 0 0 16px 0;
                    color: #333;
                }

                .modal-description {
                    font-size: 16px;
                    color: #666;
                    text-align: center;
                    margin: 0 0 24px 0;
                    line-height: 1.5;
                }

                .modal-actions {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }

                .btn-subscribe {
                    background: linear-gradient(135deg, #007bff, #0056b3);
                    color: white;
                    border: none;
                    border-radius: 12px;
                    padding: 16px 24px;
                    font-size: 16px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }

                .btn-subscribe:hover:not(:disabled) {
                    transform: translateY(-2px);
                    box-shadow: 0 6px 16px rgba(0, 123, 255, 0.4);
                }

                .btn-subscribe:disabled {
                    opacity: 0.7;
                    cursor: not-allowed;
                }

                .btn-skip {
                    background: transparent;
                    color: #666;
                    border: 2px solid #e0e0e0;
                    border-radius: 12px;
                    padding: 14px 24px;
                    font-size: 16px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }

                .btn-skip:hover {
                    background: #f8f9fa;
                    border-color: #d0d0d0;
                }

                .btn-close {
                    position: absolute;
                    top: 16px;
                    right: 16px;
                    background: none;
                    border: none;
                    font-size: 24px;
                    color: #999;
                    cursor: pointer;
                    width: 32px;
                    height: 32px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 50%;
                }

                .btn-close:hover {
                    background: #f0f0f0;
                    color: #666;
                }

                @keyframes slideInRight {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }

                @keyframes slideOutRight {
                    from {
                        transform: translateX(0);
                        opacity: 1;
                    }
                    to {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                }

                /* Адаптивность для мобильных устройств */
                @media (max-width: 480px) {
                    .notification-modal-content {
                        padding: 20px;
                        margin: 16px;
                    }
                    
                    .modal-title {
                        font-size: 20px;
                    }
                    
                    .modal-description {
                        font-size: 14px;
                    }
                    
                    .btn-subscribe, .btn-skip {
                        font-size: 15px;
                        padding: 14px 20px;
                    }
                }
            </style>
        `;

        document.head.insertAdjacentHTML('beforeend', styles);
    }
}

/**
 * Инициализация системы уведомлений
 * Создаем глобальный экземпляр менеджера уведомлений
 */
const notificationsManager = new VKNotificationsManager();

/**
 * Экспорт для использования в других модулях
 */
export default VKNotificationsManager;

/**
 * Пример использования:
 * 
 * // Автоматическая инициализация при загрузке страницы
 * // Система сама проверит статус подписки и покажет окно при необходимости
 * 
 * // Ручная проверка статуса
 * await notificationsManager.checkNotificationStatus();
 * 
 * // Ручная подписка
 * await notificationsManager.requestNotificationPermission();
 * 
 * // Проверка текущего статуса
 * console.log('Подписан:', notificationsManager.isSubscribed);
 */




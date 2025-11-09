/**
 * VK Mini App - Простая система подписки на уведомления
 * 
 * Готовый к использованию код для быстрого внедрения
 * в существующее VK Mini App приложение
 */

import bridge from '@vkontakte/vk-bridge';

/**
 * Простая функция для проверки и запроса подписки на уведомления
 * @param {Object} options - Настройки
 * @param {boolean} options.showModal - Показывать ли модальное окно (по умолчанию true)
 * @param {string} options.successMessage - Сообщение при успешной подписке
 * @param {string} options.skipMessage - Сообщение при отказе
 */
async function initVKNotifications(options = {}) {
    const {
        showModal = true,
        successMessage = 'Спасибо за подписку!',
        skipMessage = 'Вы всегда можете подписаться позже в настройках'
    } = options;

    try {
        console.log('🔔 Инициализация системы уведомлений...');

        // 1. Получаем информацию о пользователе
        const userInfo = await bridge.send('VKWebAppGetUserInfo');
        console.log('👤 Пользователь:', userInfo.first_name, userInfo.last_name);

        // 2. Проверяем текущий статус подписки
        let isSubscribed = false;
        try {
            const statusResult = await bridge.send('VKWebAppCheckAllowedNotifications');
            isSubscribed = statusResult.result;
            console.log('📊 Статус подписки:', isSubscribed ? '✅ Разрешено' : '❌ Запрещено');
        } catch (statusError) {
            console.log('⚠️ Не удалось проверить статус, предполагаем что не подписан');
        }

        // 3. Если не подписан и нужно показать модальное окно
        if (!isSubscribed && showModal) {
            const userChoice = await showSubscriptionModal();
            
            if (userChoice === 'subscribe') {
                // 4. Запрашиваем разрешение на уведомления
                await requestNotificationPermission(successMessage, skipMessage);
            } else {
                showToast(skipMessage, 'info');
            }
        } else if (isSubscribed) {
            console.log('✅ Пользователь уже подписан');
        }

    } catch (error) {
        console.error('❌ Ошибка инициализации:', error);
        showToast('Ошибка загрузки приложения', 'error');
    }
}

/**
 * Показ модального окна с предложением подписаться
 * @returns {Promise<string>} 'subscribe' или 'skip'
 */
function showSubscriptionModal() {
    return new Promise((resolve) => {
        // Создаем HTML модального окна
        const modalHTML = `
            <div id="vk-notification-modal" style="
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
            ">
                <div style="
                    background: white;
                    border-radius: 16px;
                    padding: 24px;
                    max-width: 400px;
                    width: 100%;
                    position: relative;
                    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
                    animation: slideIn 0.3s ease-out;
                ">
                    <div style="
                        font-size: 48px;
                        text-align: center;
                        margin-bottom: 16px;
                        animation: bounce 2s infinite;
                    ">🔔</div>
                    <h2 style="
                        font-size: 24px;
                        font-weight: 700;
                        text-align: center;
                        margin: 0 0 16px 0;
                        color: #333;
                    ">Не пропустите важные предложения!</h2>
                    <p style="
                        font-size: 16px;
                        color: #666;
                        text-align: center;
                        margin: 0 0 24px 0;
                        line-height: 1.5;
                    ">Подпишитесь на уведомления, чтобы получать персональные предложения по займам с высоким шансом одобрения.</p>
                    <div style="display: flex; flex-direction: column; gap: 12px;">
                        <button id="subscribe-btn" style="
                            background: linear-gradient(135deg, #007bff, #0056b3);
                            color: white;
                            border: none;
                            border-radius: 12px;
                            padding: 16px 24px;
                            font-size: 16px;
                            font-weight: 600;
                            cursor: pointer;
                            transition: all 0.2s ease;
                        ">Подписаться на уведомления</button>
                        <button id="skip-btn" style="
                            background: transparent;
                            color: #666;
                            border: 2px solid #e0e0e0;
                            border-radius: 12px;
                            padding: 14px 24px;
                            font-size: 16px;
                            cursor: pointer;
                            transition: all 0.2s ease;
                        ">Позже</button>
                    </div>
                    <button id="close-btn" style="
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
                    ">×</button>
                </div>
            </div>
            <style>
                @keyframes slideIn {
                    from { opacity: 0; transform: translateY(-20px) scale(0.95); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
                @keyframes bounce {
                    0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
                    40% { transform: translateY(-8px); }
                    60% { transform: translateY(-4px); }
                }
                #subscribe-btn:hover:not(:disabled) {
                    transform: translateY(-2px);
                    box-shadow: 0 6px 16px rgba(0, 123, 255, 0.4);
                }
                #skip-btn:hover {
                    background: #f8f9fa;
                    border-color: #d0d0d0;
                }
                #close-btn:hover {
                    background: #f0f0f0;
                    color: #666;
                }
            </style>
        `;

        // Добавляем модальное окно в DOM
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // Привязываем обработчики событий
        document.getElementById('subscribe-btn').onclick = () => {
            document.getElementById('vk-notification-modal').remove();
            resolve('subscribe');
        };

        document.getElementById('skip-btn').onclick = () => {
            document.getElementById('vk-notification-modal').remove();
            resolve('skip');
        };

        document.getElementById('close-btn').onclick = () => {
            document.getElementById('vk-notification-modal').remove();
            resolve('skip');
        };

        // Закрытие по клику на фон
        document.getElementById('vk-notification-modal').onclick = (e) => {
            if (e.target.id === 'vk-notification-modal') {
                document.getElementById('vk-notification-modal').remove();
                resolve('skip');
            }
        };
    });
}

/**
 * Запрос разрешения на отправку уведомлений
 * @param {string} successMessage - Сообщение при успехе
 * @param {string} skipMessage - Сообщение при отказе
 */
async function requestNotificationPermission(successMessage, skipMessage) {
    try {
        console.log('🔔 Запрашиваем разрешение на уведомления...');

        // Асинхронный вызов VK Bridge с обработкой результата
        const result = await bridge.send('VKWebAppAllowNotifications');
        
        console.log('📱 Результат запроса:', result);

        // Обработка успешного результата
        if (result.result === true) {
            console.log('✅ Пользователь успешно подписался');
            showToast(successMessage, 'success');
        } else {
            // Пользователь отказался
            console.log('❌ Пользователь отказался от подписки');
            showToast(skipMessage, 'info');
        }

    } catch (error) {
        console.error('❌ Ошибка при запросе разрешения:', error);
        
        // Обработка различных типов ошибок
        let errorMessage = 'Произошла ошибка. Попробуйте позже';
        
        if (error.error_type === 'client_error') {
            errorMessage = 'Уведомления не поддерживаются в вашей версии приложения';
        } else if (error.error_type === 'api_error') {
            errorMessage = 'Ошибка API ВКонтакте. Попробуйте позже';
        }
        
        showToast(errorMessage, 'error');
    }
}

/**
 * Показ уведомления пользователю
 * @param {string} message - Текст сообщения
 * @param {string} type - Тип уведомления ('success', 'error', 'info')
 */
function showToast(message, type = 'info') {
    // Создаем элемент уведомления
    const toast = document.createElement('div');
    toast.textContent = message;
    
    // Стили в зависимости от типа
    const colors = {
        success: '#4CAF50',
        error: '#f44336',
        info: '#2196F3'
    };
    
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
        backgroundColor: colors[type] || colors.info,
        animation: 'slideInRight 0.3s ease-out'
    });

    // Добавляем анимацию
    if (!document.getElementById('toast-animations')) {
        const style = document.createElement('style');
        style.id = 'toast-animations';
        style.textContent = `
            @keyframes slideInRight {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOutRight {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }

    // Добавляем в DOM
    document.body.appendChild(toast);

    // Автоматически скрываем через 4 секунды
    setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.3s ease-in';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

/**
 * Экспорт функций для использования
 */
export {
    initVKNotifications,
    requestNotificationPermission,
    showToast
};

/**
 * ПРИМЕРЫ ИСПОЛЬЗОВАНИЯ:
 * 
 * // 1. Автоматическая инициализация при загрузке страницы
 * document.addEventListener('DOMContentLoaded', () => {
 *     initVKNotifications();
 * });
 * 
 * // 2. Инициализация с кастомными сообщениями
 * initVKNotifications({
 *     successMessage: 'Спасибо! Теперь вы будете получать уведомления',
 *     skipMessage: 'Хорошо, подпишемся позже'
 * });
 * 
 * // 3. Только проверка статуса без показа модального окна
 * initVKNotifications({ showModal: false });
 * 
 * // 4. Ручной запрос подписки
 * requestNotificationPermission('Спасибо за подписку!', 'Можете подписаться позже');
 * 
 * // 5. Показ произвольного уведомления
 * showToast('Операция выполнена успешно!', 'success');
 */




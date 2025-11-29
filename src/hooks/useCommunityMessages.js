import bridge from '@vkontakte/vk-bridge';
import { useEffect, useState } from 'react';
import logger from '../utils/logger';

export const useCommunityMessages = (utmParams = {}) => {
    const [showModal, setShowModal] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [user, setUser] = useState(null);
    const [messagesAllowed, setMessagesAllowed] = useState(false);
    
    // Инициализация пользователя
    useEffect(() => {
        const initUser = async () => {
            try {
                const userData = await bridge.send('VKWebAppGetUserInfo');
                setUser(userData);
                logger.info('👤 Пользователь инициализирован для сообщений:', userData.id);
            } catch (error) {
                logger.error('Ошибка инициализации пользователя:', error);
            }
        };
        
        initUser();
    }, []);

    // Проверка статуса разрешения на сообщения
    useEffect(() => {
        if (!user) return;

        const checkMessagesPermission = async () => {
            try {
                logger.info('🔍 Проверяем статус разрешения на сообщения для пользователя:', user.id);
                
                // Проверяем статус в базе данных
                const response = await fetch(`/api/users/status/?vk_user_id=${user.id}`);
                
                if (response.ok) {
                    const data = await response.json();
                    const dbStatus = data.success && data.user && data.user.messages_allowed === true;
                    
                    logger.info('📊 Статус разрешения на сообщения в базе данных:', dbStatus);
                    setMessagesAllowed(dbStatus);
                } else {
                    logger.info('⚠️ Ошибка получения статуса разрешения на сообщения');
                }
            } catch (error) {
                logger.error('❌ Ошибка проверки разрешения на сообщения:', error);
            }
        };

        // Задержка для стабильности
        setTimeout(checkMessagesPermission, 500);
    }, [user]);

    // Запрос разрешения на отправку сообщений от имени сообщества
    const handleAllowMessages = async () => {
        if (!user) return;
        
        setIsLoading(true);
        try {
            logger.info('💬 Запрашиваем разрешение на отправку сообщений от сообщества...');
            
            // Согласно документации VK, для получения разрешения на отправку сообщений
            // от имени сообщества используется метод messages.allowMessagesFromGroup через VK API
            // Этот метод требует токен пользователя с правами messages
            
            // Получаем токен пользователя через VK Bridge
            try {
                const tokenResult = await bridge.send('VKWebAppGetAuthToken', {
                    app_id: parseInt(process.env.REACT_APP_VK_APP_ID || '53875526'),
                    scope: 'messages'
                });
                
                if (tokenResult && tokenResult.access_token) {
                    logger.info('✅ Токен пользователя получен');
                    
                    // Отправляем запрос на backend для обработки разрешения через VK API
                    const apiResponse = await fetch('/api/users/allow-messages/', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                            vk_user_id: user.id, 
                            allowed: true,
                            access_token: tokenResult.access_token
                        }),
                    });
                    
                    if (apiResponse.ok) {
                        const apiData = await apiResponse.json();
                        
                        if (apiData.success === true) {
                            setMessagesAllowed(true);
                            setShowModal(false);
                            logger.info('✅ Разрешение на сообщения от сообщества получено!');
                        } else {
                            logger.info('⚠️ Не удалось получить разрешение:', apiData.error);
                        }
                    } else {
                        logger.error('❌ Ошибка при запросе разрешения на сообщения');
                    }
                } else {
                    logger.error('❌ Не удалось получить токен пользователя');
                }
            } catch (tokenError) {
                logger.error('❌ Ошибка получения токена:', tokenError);
                
                // Fallback: просто сохраняем статус в базе данных
                // (пользователь может предоставить разрешение позже)
                try {
                    const apiResponse = await fetch('/api/users/allow-messages/', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                            vk_user_id: user.id, 
                            allowed: true 
                        }),
                    });
                    
                    if (apiResponse.ok) {
                        const apiData = await apiResponse.json();
                        if (apiData.success === true) {
                            setMessagesAllowed(true);
                            logger.info('✅ Статус разрешения сохранен в базе данных');
                        }
                    }
                } catch (fallbackError) {
                    logger.error('❌ Ошибка при сохранении статуса:', fallbackError);
                }
            }
        } catch (error) {
            logger.error('Ошибка запроса разрешения на сообщения:', error);
        } finally {
            setIsLoading(false);
            setShowModal(false);
        }
    };

    // Закрытие модального окна
    const handleClose = () => {
        setShowModal(false);
    };

    // Показать модальное окно для запроса разрешения
    const requestPermission = () => {
        setShowModal(true);
    };

    return {
        showModal,
        isLoading,
        handleAllowMessages,
        handleClose,
        messagesAllowed,
        requestPermission,
    };
};


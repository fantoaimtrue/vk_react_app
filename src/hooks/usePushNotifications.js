import bridge from '@vkontakte/vk-bridge';
import { useEffect, useState } from 'react';
import logger from '../utils/logger';

export const usePushNotifications = (utmParams = {}) => {
    const [showModal, setShowModal] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [user, setUser] = useState(null);
    const [promoApplied, setPromoApplied] = useState(false);
    
    // Детекция мобильного устройства
    const isMobile = () => {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
               window.innerWidth <= 768;
    };

    // Инициализация пользователя
    useEffect(() => {
        const initUser = async () => {
            try {
                const userData = await bridge.send('VKWebAppGetUserInfo');
                setUser(userData);
                
                // Регистрируем пользователя в базе данных с UTM параметрами
                try {
                    const response = await fetch('/api/users/register/', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                            user_data: userData,
                            utm_params: utmParams // Используем переданные UTM параметры
                        }),
                    });
                    
                    if (response.ok) {
                        const result = await response.json();
                        logger.info('✅ Пользователь зарегистрирован в базе:', result.user);
                    } else {
                        logger.info('⚠️ Пользователь уже существует в базе');
                    }
                } catch (registerError) {
                    logger.info('⚠️ Ошибка регистрации (возможно, пользователь уже существует):', registerError);
                }
                
                logger.info('👤 Пользователь инициализирован:', userData.id);
            } catch (error) {
                console.error('Ошибка инициализации пользователя:', error);
            }
        };
        
        initUser();
    }, []);

    // Проверка подписки с синхронизацией VK Bridge
    useEffect(() => {
        if (!user) return;

        const checkSubscription = async () => {
            try {
                logger.info('🔍 Проверяем статус подписки для пользователя:', user.id);
                logger.info('📱 Мобильное устройство:', isMobile());
                
                // Сначала проверяем VK Bridge для получения актуального статуса
                let vkStatus = false;
                let vkBridgeAvailable = false;
                
                try {
                    const vkResponse = await bridge.send('VKWebAppCheckAllowedNotifications');
                    vkStatus = vkResponse.result;
                    vkBridgeAvailable = true;
                    logger.info('📱 VK Bridge статус:', vkStatus);
                } catch (vkError) {
                    logger.info('⚠️ VK Bridge недоступен:', vkError);
                    // На мобильных устройствах VK Bridge может не работать
                    if (isMobile()) {
                        logger.info('📱 Мобильное устройство - VK Bridge может не работать');
                    }
                }
                
                // Проверяем статус в базе данных
                const response = await fetch(`/api/users/status/?vk_user_id=${user.id}`);
                logger.info('📡 Ответ от API:', response.status);
                
                if (response.ok) {
                    const data = await response.json();
                    const dbStatus = data.success && data.user && data.user.notifications_allowed === true;
                    
                    logger.info('📊 Статус в базе данных:', dbStatus);
                    logger.info('📊 VK Bridge статус:', vkStatus);
                    
                    // Специальная логика для мобильных устройств
                    if (isMobile() && !vkBridgeAvailable) {
                        logger.info('📱 Мобильное устройство - используем упрощенную логику');
                        // На мобильных устройствах показываем окно, если не подписан
                        if (!dbStatus) {
                            logger.info('❌ Мобильное устройство - пользователь НЕ подписан - показываем окно');
                            setPromoApplied(false);
                            setShowModal(true);
                        } else {
                            logger.info('✅ Мобильное устройство - пользователь ПОДПИСАН - окно НЕ показываем');
                            setPromoApplied(true);
                        }
                        return;
                    }
                    
                    // Синхронизируем статус: если VK Bridge доступен, обновляем базу
                    if (vkBridgeAvailable) {
                        if (vkStatus !== dbStatus) {
                            logger.info('🔄 Синхронизируем статус: VK Bridge отличается от базы');
                            await fetch('/api/users/allow-notifications/', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ 
                                    vk_user_id: user.id, 
                                    allowed: vkStatus 
                                }),
                            });
                            logger.info('✅ Статус обновлен в базе:', vkStatus);
                        }
                        
                        // Используем актуальный статус из VK Bridge
                        if (vkStatus) {
                            logger.info('✅ Пользователь ПОДПИСАН (VK Bridge) - окно НЕ показываем');
                            setPromoApplied(true); // Показываем промокод в header
                            return;
                        } else {
                            logger.info('❌ Пользователь НЕ подписан (VK Bridge) - показываем окно');
                            setPromoApplied(false);
                            setShowModal(true);
                        }
                    } else {
                        // Если VK Bridge недоступен, используем статус из базы
                        if (dbStatus) {
                            logger.info('✅ Пользователь ПОДПИСАН (база данных) - окно НЕ показываем');
                            setPromoApplied(true); // Показываем промокод в header
                            return;
                        } else {
                            logger.info('❌ Пользователь НЕ подписан (база данных) - показываем окно');
                            setPromoApplied(false);
                            setShowModal(true);
                        }
                    }
                } else {
                    logger.info('⚠️ Ошибка получения статуса - НЕ показываем окно (безопасность)');
                }
            } catch (error) {
                logger.error('❌ Ошибка проверки подписки:', error);
                logger.info('⚠️ При ошибке - НЕ показываем окно (безопасность)');
            }
        };

        // Задержка для стабильности
        setTimeout(checkSubscription, 500);
        
        // Дополнительная проверка для мобильных устройств через 2 секунды
        if (isMobile()) {
            setTimeout(() => {
                logger.info('📱 Дополнительная проверка для мобильного устройства');
                if (!promoApplied) {
                    logger.info('📱 Принудительный показ окна на мобильном устройстве');
                    setShowModal(true);
                }
            }, 2000);
        }
    }, [user]);

    // Подписка на уведомления и активация промокода
    const handleSubscribe = async () => {
        if (!user) return;
        
        setIsLoading(true);
        try {
            const result = await bridge.send('VKWebAppAllowNotifications');
            if (result.result) {
                // Обновляем статус в базе
                await fetch('/api/users/allow-notifications/', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        vk_user_id: user.id, 
                        allowed: true 
                    }),
                });
                setPromoApplied(true); // Активируем промокод
                setShowModal(false);
                logger.info('🎁 Промокод ФРИ активирован!');
            }
        } catch (error) {
            logger.error('Ошибка подписки:', error);
        } finally {
            setIsLoading(false);
            setShowModal(false);
        }
    };

    // Закрытие модального окна
    const handleClose = () => {
        setShowModal(false);
    };

    return {
        showModal,
        isLoading,
        handleSubscribe,
        handleClose,
        promoApplied,
    };
};
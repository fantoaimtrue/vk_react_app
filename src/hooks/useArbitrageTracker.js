import { useCallback, useState } from 'react';
import logger from '../utils/logger';

/**
 * React-хук для интеграции с системой арбитражника leads.tech
 * Передает UTM метки и данные пользователей в leads.tech API
 */
export const useArbitrageTracker = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [lastSentData, setLastSentData] = useState(null);

    /**
     * Отправляет данные в leads.tech
     * @param {Object} userData - Данные пользователя
     * @param {Object} utmParams - UTM параметры
     * @param {Object} additionalData - Дополнительные данные
     */
    const sendToLeadsTech = useCallback(async (userData, utmParams, additionalData = {}) => {
        setIsLoading(true);
        setError(null);

        try {
            // Все необходимые параметры уже содержатся в utmParams.
            // useUTMTracker позаботился об их извлечении из URL и VK Bridge.
            // VK Реклама использует: campaign_id (кампания), banner_id (баннер), user_id (пользователь)
            // Также поддерживаем старый формат: ref, ref_source для обратной совместимости
            const vkRef = utmParams.campaign_id || utmParams.ref || utmParams.vk_ref || utmParams.utm_campaign || '';
            const vkRefSource = utmParams.banner_id || utmParams.ref_source || utmParams.vk_ref_source || utmParams.utm_content || '';
            
            // Подготавливаем данные для leads.tech
            const leadsTechData = {
                // Основные данные пользователя
                user_id: userData.id,
                first_name: userData.first_name,
                last_name: userData.last_name,
                email: userData.email || '',
                phone: userData.phone || '',
                
                // UTM параметры (стандартные)
                utm_source: utmParams.utm_source || '',
                utm_medium: utmParams.utm_medium || '',
                utm_campaign: utmParams.utm_campaign || '',
                utm_content: utmParams.utm_content || '',
                utm_term: utmParams.utm_term || '',
                
                // VK специфичные параметры
                vk_user_id: utmParams.vk_user_id || userData.id,
                vk_ad_id: utmParams.vk_ad_id || '',
                vk_ref: utmParams.vk_ref || '',
                vk_ref_source: utmParams.vk_ref_source || '',
                vk_platform: utmParams.vk_platform || '',
                
                // Арбитражные параметры
                ref: vkRef || utmParams.ref || '',
                ref_source: vkRefSource || utmParams.ref_source || '',
                
                // Арбитражные параметры для leads.tech (формат офферов)
                // Приоритет: ref → utm_campaign → cid (для VK рекламы ref идёт первым!)
                s4: vkRef || utmParams.utm_campaign || utmParams.cid || '', // ref (реальное значение)
                s5: vkRefSource || utmParams.utm_content || utmParams.aid || '', // ref_source (реальное значение)
                s6: userData.id || utmParams.utm_term || utmParams.user_id || '', // user_id (реальное значение)
                
                // Дополнительные арбитражные параметры
                click_id: utmParams.click_id || utmParams.vk_ad_id || '',
                sub_id: utmParams.sub_id || utmParams.s1 || '',
                s1: utmParams.s1 || utmParams.utm_source || '',
                s2: utmParams.s2 || utmParams.utm_campaign || '',
                s3: utmParams.s3 || utmParams.utm_content || '',
                // s4, s5 и s6 уже определены выше с правильными значениями
                s7: utmParams.s7 || '',
                s8: utmParams.s8 || '',
                
                // Дополнительные данные
                timestamp: new Date().toISOString(),
                url: window.location.href,
                referrer: document.referrer,
                user_agent: navigator.userAgent,
                ip_address: '', // Будет заполнено на backend
                
                // Дополнительные параметры
                ...additionalData
            };

            logger.info('📊 Отправляем данные в leads.tech:', leadsTechData);

            // Отправляем на наш backend, который перенаправит в leads.tech
            // Используем .catch, чтобы не блокировать основной поток
            fetch('/api/arbitrage/send-to-leads-tech/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(leadsTechData)
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                logger.info('✅ Успешно отправлено в leads.tech:', data);
                setLastSentData(leadsTechData); // Сохраняем последние отправленные данные
            })
            .catch(error => {
                logger.error('❌ Ошибка отправки в leads.tech:', error);
                // Эта ошибка не должна блокировать работу приложения,
                // поэтому мы не меняем состояние error
            });

        } catch (error) {
            logger.error('❌ Ошибка отправки в leads.tech:', error);
            setError(error.message);
            return null;
        } finally {
            setIsLoading(false);
        }
    }, []);

    /**
     * Автоматически отправляет данные при изменении UTM параметров
     */
    const autoSendOnUTMChange = useCallback((userData, utmParams) => {
        // Отправляем только если есть важные UTM параметры
        if (utmParams.utm_source || utmParams.vk_ad_id || utmParams.click_id) {
            sendToLeadsTech(userData, utmParams);
        }
    }, [sendToLeadsTech]);

    /**
     * Генерирует ссылку с арбитражными параметрами для leads.tech
     */
    const generateArbitrageLink = useCallback((baseUrl, utmParams, userData) => {
        if (!baseUrl) return '';

        const params = new URLSearchParams();
        
        // Добавляем стандартные UTM параметры
        if (utmParams.utm_source) params.append('utm_source', utmParams.utm_source);
        if (utmParams.utm_medium) params.append('utm_medium', utmParams.utm_medium);
        if (utmParams.utm_campaign) params.append('utm_campaign', utmParams.utm_campaign);
        if (utmParams.utm_content) params.append('utm_content', utmParams.utm_content);
        if (utmParams.utm_term) params.append('utm_term', utmParams.utm_term);
        
        // Добавляем арбитражные параметры
        if (utmParams.click_id) params.append('click_id', utmParams.click_id);
        if (utmParams.sub_id) params.append('sub_id', utmParams.sub_id);
        if (utmParams.s1) params.append('s1', utmParams.s1);
        if (utmParams.s2) params.append('s2', utmParams.s2);
        if (utmParams.s3) params.append('s3', utmParams.s3);
        if (utmParams.s4) params.append('s4', utmParams.s4);
        if (utmParams.s5) params.append('s5', utmParams.s5);
        if (utmParams.s6) params.append('s6', utmParams.s6);
        if (utmParams.s7) params.append('s7', utmParams.s7);
        if (utmParams.s8) params.append('s8', utmParams.s8);
        
        // Добавляем VK параметры
        if (utmParams.vk_ad_id) params.append('vk_ad_id', utmParams.vk_ad_id);
        if (utmParams.vk_ref) params.append('vk_ref', utmParams.vk_ref);
        if (utmParams.vk_platform) params.append('vk_platform', utmParams.vk_platform);
        
        // Добавляем данные пользователя
        if (userData.id) params.append('user_id', userData.id);
        if (userData.first_name) params.append('first_name', userData.first_name);
        if (userData.last_name) params.append('last_name', userData.last_name);

        const separator = baseUrl.includes('?') ? '&' : '?';
        return `${baseUrl}${separator}${params.toString()}`;
    }, []);

    return {
        sendToLeadsTech,
        autoSendOnUTMChange,
        generateArbitrageLink,
        isLoading,
        error,
        lastSentData
    };
};

export default useArbitrageTracker;

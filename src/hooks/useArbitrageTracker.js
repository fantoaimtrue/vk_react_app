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
            // ИСПРАВЛЕНО: Умная обработка макросов VK по совету эксперта
            // Проверяем, заменились ли макросы VK или остались как текст
            const isUnresolvedMacro = (value) => {
                return value && (value.includes('{{') || value.includes('}}') || value.includes('{campaign_id}') || value.includes('{ad_id}'));
            };
            
            let vkRef = '';
            let vkRefSource = '';
            
            // Логика для ref (campaign_id)
            if (utmParams.ref && !isUnresolvedMacro(utmParams.ref)) {
                vkRef = utmParams.ref; // VK реклама заменила макрос
            } else if (utmParams.utm_campaign) {
                vkRef = utmParams.utm_campaign; // Стандартный UTM
            } else if (additionalData.fallback_campaign) {
                vkRef = additionalData.fallback_campaign; // Fallback для бота
            } else {
                vkRef = 'bot_' + Date.now(); // Динамический fallback
            }
            
            // Логика для banner_id/ad_id (ID объявления) - ПРИОРИТЕТ: banner_id, ref_ad, ad_id, vk_ad_id, ref_source
            // Это ID объявления, который должен передаваться в leads.tech
            // В рассылке бота используется макрос {banner_id}, который VK заменяет на реальное значение
            // Формат ссылки: ref_source={banner_id} - VK заменит {banner_id} на реальное значение в ref_source
            if (utmParams.banner_id && !isUnresolvedMacro(utmParams.banner_id)) {
                vkRefSource = utmParams.banner_id; // ID объявления из banner_id (если передан напрямую)
            } else if (utmParams.ref_ad && !isUnresolvedMacro(utmParams.ref_ad)) {
                vkRefSource = utmParams.ref_ad; // ID объявления из ref_ad
            } else if (utmParams.ad_id && !isUnresolvedMacro(utmParams.ad_id)) {
                vkRefSource = utmParams.ad_id; // ID объявления из ad_id
            } else if (utmParams.vk_ad_id && !isUnresolvedMacro(utmParams.vk_ad_id)) {
                vkRefSource = utmParams.vk_ad_id; // ID объявления из vk_ad_id
            } else if (utmParams.ref_source && !isUnresolvedMacro(utmParams.ref_source)) {
                vkRefSource = utmParams.ref_source; // ID объявления из ref_source (макрос {banner_id} заменен VK на реальное значение)
            } else if (utmParams.utm_content) {
                vkRefSource = utmParams.utm_content; // Стандартный UTM
            } else if (additionalData.fallback_source) {
                vkRefSource = additionalData.fallback_source; // Fallback для бота
            } else {
                vkRefSource = 'auto_message'; // Динамический fallback
            }
            
            // Подготавливаем данные для leads.tech
            const leadsTechData = {
                // Основные данные пользователя
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
                ref: vkRef || utmParams.ref || utmParams.ref_campaign || '', // id кампании (макрос {ref})
                ref_source: vkRefSource || utmParams.ref_source || '', // id источника
                banner_id: utmParams.banner_id || vkRefSource || '', // id объявления (макрос {banner_id})
                ref_ad: utmParams.ref_ad || utmParams.ad_id || utmParams.vk_ad_id || '', // id объявления
                ad_id: utmParams.ad_id || utmParams.vk_ad_id || utmParams.ref_ad || utmParams.banner_id || '', // id объявления (дубликат для совместимости)
                user_id: userData.id || utmParams.user_id || utmParams.utm_term || '', // id пользователя (макрос {user_id})
                
                // Арбитражные параметры для leads.tech (формат офферов)
                // ИСПРАВЛЕНО: Используем уже вычисленные vkRef и vkRefSource
                // s4 = ref (id кампании) - макрос {ref} из рассылки бота
                // s5 = banner_id (id объявления) - макрос {banner_id} из рассылки бота
                // s6 = user_id (id пользователя) - макрос {user_id} из рассылки бота
                // ВАЖНО: Используем ПРЯМОЕ значение из utmParams.ref и utmParams.ref_source, если они есть
                s4: utmParams.ref || vkRef || utmParams.ref_campaign || utmParams.utm_campaign || '', // campaign_id из ref (макрос {ref}) - ПРИОРИТЕТ прямому ref
                s5: utmParams.ref_source || utmParams.banner_id || vkRefSource || utmParams.ref_ad || utmParams.ad_id || utmParams.vk_ad_id || utmParams.utm_content || '', // banner_id (макрос {banner_id}) или ref_source - ПРИОРИТЕТ прямому ref_source
                s6: userData.id || utmParams.user_id || utmParams.utm_term || '', // user_id (макрос {user_id}) - приоритет реальному user_id из VK
                
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

            logger.debug('🔍 [useArbitrageTracker] ВСЕ UTM параметры:', utmParams);
            logger.debug('🔍 [useArbitrageTracker] ref:', utmParams.ref, '(макрос {ref} из рассылки)');
            logger.debug('🔍 [useArbitrageTracker] ref_source:', utmParams.ref_source, '(макрос {banner_id} из рассылки)');
            logger.debug('🔍 [useArbitrageTracker] ref_campaign:', utmParams.ref_campaign);
            logger.debug('🔍 [useArbitrageTracker] banner_id:', utmParams.banner_id, '(макрос {banner_id} из рассылки)');
            logger.debug('🔍 [useArbitrageTracker] ref_ad:', utmParams.ref_ad);
            logger.debug('🔍 [useArbitrageTracker] ad_id:', utmParams.ad_id);
            logger.debug('🔍 [useArbitrageTracker] vk_ad_id:', utmParams.vk_ad_id);
            logger.debug('🔍 [useArbitrageTracker] user_id:', utmParams.user_id, '(макрос {user_id} из рассылки)');
            logger.debug('🔍 [useArbitrageTracker] utm_term:', utmParams.utm_term, '(макрос {user_id} из рассылки)');
            logger.debug('🔍 [useArbitrageTracker] vkRef (s4 - id кампании):', vkRef);
            logger.debug('🔍 [useArbitrageTracker] vkRefSource (s5 - id объявления):', vkRefSource);
            logger.info('📊 [useArbitrageTracker] Итоговые параметры для leads.tech:');
            logger.info('  - s4 (id кампании):', leadsTechData.s4);
            logger.info('  - s5 (id объявления):', leadsTechData.s5);
            logger.info('  - s6 (user_id):', leadsTechData.s6);
            logger.info('📊 [useArbitrageTracker] Отправляем данные в leads.tech:', leadsTechData);
            logger.info('📊 [useArbitrageTracker] Ключевые параметры для leads.tech:');
            logger.info('  - ref:', leadsTechData.ref);
            logger.info('  - ref_source:', leadsTechData.ref_source);
            logger.info('  - s4:', leadsTechData.s4);
            logger.info('  - s5:', leadsTechData.s5);
            logger.info('  - s6:', leadsTechData.s6);
            logger.info('📊 Отправляем данные в leads.tech:', leadsTechData);

            // Отправляем на наш backend, который перенаправит в leads.tech
            // Теперь ждём ответ и пробрасываем ошибку, чтобы увидели проблему в Promise.allSettled
            const response = await fetch('/api/arbitrage/send-to-leads-tech/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(leadsTechData)
            });

            if (!response.ok) {
                const body = await response.text();
                throw new Error(`leads.tech proxy failed: ${response.status} ${body.slice(0, 300)}`);
            }

            const data = await response.json();
            logger.info('✅ Успешно отправлено в leads.tech:', data);
            logger.info('✅ [useArbitrageTracker] Ответ от backend:', data);
            logger.info('✅ [useArbitrageTracker] URL отправленный в leads.tech:', data.leads_tech_url);
            setLastSentData(leadsTechData); // Сохраняем последние отправленные данные
            return data;

        } catch (error) {
            logger.error('❌ Ошибка отправки в leads.tech:', error);
            setError(error.message);
            // Пробрасываем, чтобы вызов через Promise.allSettled увидел отказ
            throw error;
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

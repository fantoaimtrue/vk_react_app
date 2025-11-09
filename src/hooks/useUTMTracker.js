import vkBridge from '@vkontakte/vk-bridge';
import { useCallback, useEffect, useState } from 'react';
import logger from '../utils/logger';

/**
 * React-хук для автоматического отслеживания UTM параметров
 * Извлекает все UTM параметры из URL и VK Bridge, подставляет их в ссылки
 * и отправляет данные на Django backend для аналитики
 */
export const useUTMTracker = () => {
  const [utmParams, setUtmParams] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isUserDataReady, setIsUserDataReady] = useState(false); // Новый стейт
  const [userData, setUserData] = useState({});

  /**
   * Извлекает все UTM параметры из URL (из query string и hash)
   */
  const extractUTMFromURL = useCallback(() => {
    logger.debug('🔴 RAW window.location.href in extractUTMFromURL:', window.location.href);
    const utmData = {};

    // Функция для фильтрации и очистки значений
    const filterValue = (value) => {
      if (!value) return null;
      
      // Преобразуем в строку и декодируем URL-encoded значения
      let cleanValue = String(value);
      
      // Декодируем URL encoding (%7B → {, %7D → })
      try {
        cleanValue = decodeURIComponent(cleanValue);
      } catch (e) {
        // Если декодирование не удалось, оставляем как есть
      }
      
      // Удаляем двойные скобки {{ }} (незаменённые макросы VK)
      cleanValue = cleanValue.replace(/\{\{([^}]+)\}\}/g, '');
      
      // Удаляем одинарные скобки { } (неправильный формат VK)
      cleanValue = cleanValue.replace(/^\{([^}]+)\}$/, '$1');
      
      // Проверяем на пустоту после очистки
      if (!cleanValue || cleanValue.trim() === '') return null;
      
      const lowerValue = cleanValue.toLowerCase();
      // Фильтруем значения "other", "unknown", "null", "undefined"
      if (['other', 'unknown', 'null', 'undefined', 'none', ''].includes(lowerValue)) {
        return null;
      }
      
      return cleanValue.trim();
    };

    // Стандартные UTM параметры
    const utmKeys = [
      'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term',
      'utm_id', 'utm_source_platform', 'utm_creative_format'
    ];

    // VK специфичные параметры
    const vkKeys = [
      'vk_ref', 'vk_ref_source', 'vk_ad_id', 'vk_user_id', 'vk_platform',
      'vk_app_id', 'vk_are_notifications_enabled', 'vk_is_app_user',
      'vk_is_favorite', 'vk_language', 'vk_ts', 'sign'
    ];

    // Дополнительные параметры для арбитража
    const arbKeys = [
      'ref', 'ref_source', 'ad_id', 'banner_id', 'campaign_id', 'user_id', 'click_id', 'sub_id',
      's1', 's2', 's3', 's4', 's5', 's6', 's7', 's8',
      'website_slug', 'shopwindow_type', 'offer_slug', 'offer_id', 'cid', 'utm_geo', 'aid'
    ];

    // Извлекаем параметры из query string (?param=value)
    const urlParams = new URLSearchParams(window.location.search);
    
    // Извлекаем параметры из hash (#param=value)
    // VK Mini Apps часто передают параметры в хеше!
    let hashString = window.location.hash.substring(1); // убираем #
    // Клиент VK может добавлять / в начало хеша при переходе из чатов
    if (hashString.startsWith('/')) {
      hashString = hashString.substring(1);
    }
    const hashParams = new URLSearchParams(hashString);

    logger.debug('🔍 Извлечение UTM параметров:', {
      'window.location.href': window.location.href,
      'window.location.search': window.location.search,
      'window.location.hash': window.location.hash,
      'hashString': hashString,
      'hashParams': Array.from(hashParams.entries()),
      'urlParams': Array.from(urlParams.entries())
    });

    const allKeys = [...utmKeys, ...vkKeys, ...arbKeys];

    // Сначала извлекаем параметры из query string
    const queryData = {};
    allKeys.forEach(key => {
        const value = urlParams.get(key);
        if (value) {
            queryData[key] = value;
        }
    });

    // Затем извлекаем параметры из hash
    const hashData = {};
    allKeys.forEach(key => {
        const value = hashParams.get(key);
        if (value) {
            hashData[key] = value;
        }
    });

    // Объединяем параметры с умной логикой:
    // 1. Hash имеет приоритет, НО только если значение не пустое
    // 2. Если в hash пустая строка, берём значение из query
    // Это важно для VK бота, который может передавать ref в query, но пустой в hash
    const combinedParams = { ...queryData };
    Object.entries(hashData).forEach(([key, value]) => {
        // Заменяем значение из query только если значение из hash НЕ пустое
        if (value && value.trim() !== '') {
            combinedParams[key] = value;
        }
    });

    // Фильтруем и сохраняем итоговые параметры
    Object.entries(combinedParams).forEach(([key, value]) => {
        const filteredValue = filterValue(value);
        if (filteredValue) {
            utmData[key] = filteredValue;
        }
    });

    logger.info('✅ Извлечённые UTM параметры:', utmData);

    return utmData;
  }, []);

  /**
   * Получает параметры из VK Bridge
   */
  const getVKParams = useCallback(async () => {
    try {
      // Убрали проблемный VKWebAppInit. Запрашиваем данные напрямую.
      const [userInfo, launchParams] = await Promise.all([
        vkBridge.send('VKWebAppGetUserInfo').catch((e) => {
          logger.error('VKWebAppGetUserInfo failed', e);
          return {}; // Возвращаем пустой объект в случае ошибки
        }),
        vkBridge.send('VKWebAppGetLaunchParams').catch((e) => {
          logger.error('VKWebAppGetLaunchParams failed', e);
          return {}; // Возвращаем пустой объект в случае ошибки
        })
      ]);

      // Функция для фильтрации нежелательных значений
      const filterValue = (value) => {
        if (!value) return null;
        const lowerValue = String(value).toLowerCase(); // Преобразуем в строку!
        if (['other', 'unknown', 'null', 'undefined', 'none', ''].includes(lowerValue)) {
          return null;
        }
        return value;
      };

      // Фильтруем launchParams
      const filteredLaunchParams = {};
      Object.entries(launchParams).forEach(([key, value]) => {
        const filteredValue = filterValue(value);
        if (filteredValue) {
          filteredLaunchParams[key] = filteredValue;
        }
      });

      return {
        userInfo,
        launchParams: filteredLaunchParams,
        vkAvailable: true
      };
    } catch (error) {
      logger.error('VK Bridge is not available or failed:', error);
      // Если Promise.all упал (хотя не должен из-за .catch), возвращаем пустые данные
      return {
        userInfo: {},
        launchParams: {},
        vkAvailable: false
      };
    }
  }, []);

  /**
   * Отправляет UTM данные на Django backend
   * НЕ блокирует загрузку страницы - выполняется асинхронно
   */
  const sendUTMToBackend = useCallback(async (utmData, userData) => {
    try {
      const payload = {
        utm_params: utmData,
        user_data: userData,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        referrer: document.referrer,
        user_agent: navigator.userAgent
      };

      // Используем fetch с таймаутом, чтобы не блокировать загрузку
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 секунд таймаут

      const response = await fetch('/api/utm-track/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      logger.info('✅ UTM данные отправлены на backend:', result);
      return result;
    } catch (error) {
      // НЕ устанавливаем error в state, чтобы не блокировать загрузку страницы
      // Это не критичная ошибка - аналитика может подождать
      if (error.name !== 'AbortError') {
        logger.error('❌ Ошибка отправки UTM данных (не критично):', error);
      }
      return null;
    }
  }, []);

  /**
   * Генерирует ссылку с подставленными UTM параметрами
   */
  const generateLinkWithUTM = useCallback((templateUrl, additionalParams = {}) => {
    if (!templateUrl) return '';

    let dynamicUrl = templateUrl;
    const allParams = { ...utmParams, ...additionalParams };

    // Функция для проверки валидности значения
    const isValidValue = (value) => {
      if (!value || value === '') return false;
      const lowerValue = String(value).toLowerCase();
      return !['other', 'test', 'unknown', 'null', 'undefined', 'none'].includes(lowerValue);
    };

    // Заменяем все плейсхолдеры только если значение валидно
    Object.entries(allParams).forEach(([key, value]) => {
      const placeholder = `{${key}}`;
      if (dynamicUrl.includes(placeholder)) {
        if (isValidValue(value)) {
          // Заменяем плейсхолдер на валидное значение
          dynamicUrl = dynamicUrl.replace(
            new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'),
            encodeURIComponent(value)
          );
        } else {
          // Удаляем параметр с невалидным значением из URL
          // Паттерн для удаления: &param={placeholder} или ?param={placeholder} или param={placeholder}&
          const escapedPlaceholder = placeholder.replace(/[{}]/g, '\\$&');
          dynamicUrl = dynamicUrl
            .replace(new RegExp(`[&?]\\w+=${escapedPlaceholder}(?=&|$)`, 'g'), '')
            .replace(new RegExp(`\\w+=${escapedPlaceholder}&`, 'g'), '');
        }
      }
    });
    
    // Очищаем лишние символы ? и & после удаления параметров
    dynamicUrl = dynamicUrl
      .replace(/\?&/g, '?')  // ?& -> ?
      .replace(/&&+/g, '&')  // && -> &
      .replace(/[?&]$/, '')  // удаляем ? или & в конце
      .replace(/\?$/, '');   // удаляем ? если параметров не осталось

    // КРИТИЧЕСКИ ВАЖНО: Удаляем параметры с пустыми значениями (param=&)
    // Это может произойти если плейсхолдер был заменен на пустую строку
    dynamicUrl = dynamicUrl
      .replace(/[?&]\w+=[&]/g, '&')      // удаляем param=& в середине
      .replace(/[?&]\w+=$/, '')          // удаляем param= в конце
      .replace(/\?&/g, '?')              // очистка после удаления
      .replace(/&&+/g, '&')              // схлопываем &&
      .replace(/[?&]$/, '');             // удаляем ? или & в конце

    // Финальная проверка: если нет '?', но есть '&', заменяем первый '&' на '?'
    // Это исправляет некорректные шаблоны ссылок из бэкенда
    if (!dynamicUrl.includes('?') && dynamicUrl.includes('&')) {
      dynamicUrl = dynamicUrl.replace('&', '?');
    }

    return dynamicUrl;
  }, [utmParams]);

  /**
   * Инициализация хука
   * НЕ блокирует загрузку страницы - выполняется параллельно
   */
  useEffect(() => {
    const initializeUTMTracker = async () => {
      try {
        console.log('🔴 [useUTMTracker] Инициализация UTM трекера...');
        console.log('🔴 [useUTMTracker] RAW window.location.href:', window.location.href);
        logger.debug('🔴 RAW window.location.href at start of useEffect:', window.location.href);
        setIsLoading(true);
        setError(null);
        setIsUserDataReady(false);

        // Извлекаем UTM из URL (синхронно, быстро)
        const urlUTM = extractUTMFromURL();
        console.log('🔍 [useUTMTracker] Параметры из URL:', urlUTM);
        logger.info('🔍 Параметры из URL:', urlUTM);

        // Получаем данные из VK Bridge с таймаутом (УМЕНЬШЕН до 1 секунды!)
        let vkData;
        try {
          console.log('🔍 [useUTMTracker] Запрос к VK Bridge...');
          const vkDataPromise = getVKParams();
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('VK Bridge timeout')), 1000) // Уменьшено до 1 секунды!
          );
          vkData = await Promise.race([vkDataPromise, timeoutPromise]);
          console.log('✅ [useUTMTracker] VK Bridge ответил');
        } catch (vkError) {
          console.warn('⚠️ [useUTMTracker] VK Bridge недоступен или таймаут (не критично):', vkError);
          logger.warn('⚠️ VK Bridge недоступен или таймаут (не критично):', vkError);
          vkData = {
            userInfo: {},
            launchParams: {},
            vkAvailable: false
          };
        }

        console.log('🔍 [useUTMTracker] Данные из VK Bridge:', vkData);
        logger.info('🔍 Данные из VK Bridge:', vkData);

        // Объединяем все параметры, отдавая приоритет параметрам из URL
        const allUTMParams = {
          ...vkData.launchParams,
          ...urlUTM
        };

        // Добавляем данные пользователя
        // Если нет ID из VK Bridge, пробуем из UTM параметров
        const userInfo = {
          id: vkData.userInfo.id || 
              allUTMParams.vk_user_id || 
              allUTMParams.user_id || 
              allUTMParams.utm_term || // VK может передать user_id в utm_term
              null,
          first_name: vkData.userInfo.first_name || '',
          last_name: vkData.userInfo.last_name || '',
          ...vkData.userInfo
        };
        
        // Устанавливаем итоговые данные СРАЗУ, не дожидаясь backend
        console.log('✅ [useUTMTracker] Устанавливаем UTM параметры и данные пользователя');
        setUtmParams(allUTMParams);
        setUserData(userInfo);

        // Проверяем, есть ли у нас ID пользователя
        if (userInfo.id) {
            setIsUserDataReady(true);
            console.log('✅ [useUTMTracker] User ID найден:', userInfo.id);
        } else {
            console.warn('⚠️ [useUTMTracker] User ID не найден');
        }

        const trackerInfo = {
          utmParams: allUTMParams,
          userData: userInfo,
          vkAvailable: vkData.vkAvailable,
          isUserDataReady: !!userInfo.id
        };
        console.log('🎯 [useUTMTracker] UTM Tracker инициализирован:', trackerInfo);
        logger.info('🎯 UTM Tracker инициализирован:', trackerInfo);

        // ВАЖНО: Снимаем флаг загрузки СРАЗУ, до отправки на backend!
        setIsLoading(false);
        console.log('✅ [useUTMTracker] isLoading установлен в false');

        // Отправляем данные на backend АСИНХРОННО, не блокируя загрузку
        // Используем .catch чтобы ошибки не влияли на работу приложения
        sendUTMToBackend(allUTMParams, userInfo).catch(err => {
          console.warn('⚠️ [useUTMTracker] Ошибка отправки UTM на backend (не критично):', err);
          logger.warn('⚠️ Ошибка отправки UTM на backend (не критично):', err);
        });

      } catch (error) {
        console.error('❌ [useUTMTracker] Ошибка инициализации UTM Tracker (не критично):', error);
        logger.error('❌ Ошибка инициализации UTM Tracker (не критично):', error);
        // НЕ устанавливаем error в state, чтобы не блокировать загрузку
        // Устанавливаем базовые значения
        const urlUTM = extractUTMFromURL();
        setUtmParams(urlUTM);
        setUserData({});
        setIsUserDataReady(false);
      } finally {
        // ВСЕГДА снимаем флаг загрузки, даже если были ошибки
        setIsLoading(false);
        console.log('🏁 [useUTMTracker] Инициализация завершена, isLoading=false');
      }
    };

    initializeUTMTracker();
  }, [extractUTMFromURL, getVKParams, sendUTMToBackend]);

  /**
   * Обновляет UTM параметры (для динамических изменений)
   */
  const updateUTMParams = useCallback((newParams) => {
    setUtmParams(prev => ({ ...prev, ...newParams }));
  }, []);

  /**
   * Получает конкретный UTM параметр
   */
  const getUTMParam = useCallback((key) => {
    return utmParams[key] || '';
  }, [utmParams]);

  /**
   * Проверяет наличие UTM параметров
   */
  const hasUTMParams = useCallback(() => {
    return Object.keys(utmParams).length > 0;
  }, [utmParams]);

  return {
    // Состояние
    utmParams,
    userData,
    isLoading,
    error,
    isUserDataReady,
    
    // Методы
    generateLinkWithUTM,
    updateUTMParams,
    getUTMParam,
    hasUTMParams,
    
    // Утилиты
    sendUTMToBackend: () => sendUTMToBackend(utmParams, userData)
  };
};

export default useUTMTracker;

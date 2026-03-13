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

      // ИСПРАВЛЕНО: Проверяем на незаменённые макросы VK ПЕРЕД очисткой
      if (cleanValue.includes('{{') || cleanValue.includes('}}')) {
        // Это незаменённый макрос VK - используем fallback
        return null;
      }

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
      'ref', 'ref_source', 'ref_campaign', 'ref_ad', 'ad_id', 'banner_id', 'campaign_id', 'user_id', 'click_id', 'sub_id',
      's1', 's2', 's3', 's4', 's5', 's6', 's7', 's8',
      'website_slug', 'shopwindow_type', 'offer_slug', 'offer_id', 'cid', 'utm_geo', 'aid'
    ];

    // Извлекаем параметры из query string (?param=value)
    const urlParams = new URLSearchParams(window.location.search);

    // Извлекаем параметры из hash (#param=value)
    // VK Mini Apps часто передают параметры в хеше!
    // Пробуем сначала получить оригинальный hash из sessionStorage (если он был сохранен)
    let hashToUse = window.location.hash;
    const savedHash = sessionStorage.getItem('originalHash');
    if (savedHash && savedHash !== '#' && savedHash !== '#/') {
      hashToUse = savedHash;
      logger.debug('📦 [extractUTMFromURL] Используем сохраненный hash:', savedHash);
    }

    let hashString = hashToUse.substring(1); // убираем #
    // Клиент VK может добавлять / в начало хеша при переходе из чатов
    // ИСПРАВЛЕНО: убираем все лишние слеши и знаки вопроса
    hashString = hashString.replace(/^[/?]+/, '');
    const hashParams = new URLSearchParams(hashString);

    logger.debug('🔍 Извлечение UTM параметров:', {
      'window.location.href': window.location.href,
      'window.location.search': window.location.search,
      'window.location.hash': window.location.hash,
      'hashString': hashString,
      'hashParams': Array.from(hashParams.entries()),
      'urlParams': Array.from(urlParams.entries())
    });

    // Логируем специально для отладки ref_campaign и ref_ad
    logger.debug('🔍 [extractUTMFromURL] hashParams:', Array.from(hashParams.entries()));
    logger.debug('🔍 [extractUTMFromURL] ref_campaign из hash:', hashParams.get('ref_campaign'));
    logger.debug('🔍 [extractUTMFromURL] ref_ad из hash:', hashParams.get('ref_ad'));

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
    // 3. ЭКСПЕРТ СОВЕТ: Маппим ref → utm_campaign, ref_source → utm_content
    const combinedParams = { ...queryData };
    Object.entries(hashData).forEach(([key, value]) => {
      // Заменяем значение из query только если значение из hash НЕ пустое
      if (value && value.trim() !== '') {
        combinedParams[key] = value;
      }
    });

    // МАППИНГ по совету эксперта: ref/ref_source → UTM
    // УМНАЯ ОБРАБОТКА незаменённых макросов VK
    // ВАЖНО: Сохраняем ref и ref_source в итоговых данных для передачи в leads.tech
    if (combinedParams.ref) {
      if (combinedParams.ref.includes('{{') || combinedParams.ref.includes('}}')) {
        // Это незаменённый макрос VK - используем fallback или генерируем динамический
        combinedParams.utm_campaign = combinedParams.fallback_campaign || 'bot_' + Date.now();
        // Удаляем неразрешённый макрос
        delete combinedParams.ref;
      } else {
        // Это реальное значение из VK рекламы - маппим в utm_campaign
        // НО сохраняем ref для передачи в leads.tech
        if (!combinedParams.utm_campaign) {
          combinedParams.utm_campaign = combinedParams.ref;
        }
        // ref сохраняется в combinedParams и попадет в итоговый utmData
      }
    }

    if (combinedParams.ref_source) {
      if (combinedParams.ref_source.includes('{{') || combinedParams.ref_source.includes('}}')) {
        // Это незаменённый макрос VK - используем fallback
        combinedParams.utm_content = combinedParams.fallback_source || 'auto_message';
        // Удаляем неразрешённый макрос
        delete combinedParams.ref_source;
      } else {
        // Это реальное значение - маппим в utm_content
        // НО сохраняем ref_source для передачи в leads.tech
        if (!combinedParams.utm_content) {
          combinedParams.utm_content = combinedParams.ref_source;
        }
        // ref_source сохраняется в combinedParams и попадет в итоговый utmData
      }
    }

    // Фильтруем и сохраняем итоговые параметры
    Object.entries(combinedParams).forEach(([key, value]) => {
      const filteredValue = filterValue(value);
      if (filteredValue) {
        utmData[key] = filteredValue;
      }
    });

    logger.info('✅ Извлечённые UTM параметры:', utmData);

    // Логируем специально для отладки ref, ref_source, ref_campaign и ref_ad
    logger.debug('✅ [extractUTMFromURL] Итоговые UTM параметры:', utmData);
    logger.debug('✅ [extractUTMFromURL] ref в итоговых:', utmData.ref);
    logger.debug('✅ [extractUTMFromURL] ref_source в итоговых:', utmData.ref_source);
    logger.debug('✅ [extractUTMFromURL] ref_campaign в итоговых:', utmData.ref_campaign);
    logger.debug('✅ [extractUTMFromURL] ref_ad в итоговых:', utmData.ref_ad);
    logger.debug('✅ [extractUTMFromURL] utm_term в итоговых:', utmData.utm_term);

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

    // КРИТИЧЕСКИ ВАЖНО: Извлекаем sub1 из исходной ссылки МФО и защищаем его от перезаписи
    // sub1 - это идентификатор МФО и должен оставаться неизменным!
    let protectedSub1 = null;
    try {
      const urlObj = new URL(templateUrl);
      protectedSub1 = urlObj.searchParams.get('sub1');
      logger.debug('🔒 [generateLinkWithUTM] Защищенный sub1 из ссылки МФО:', protectedSub1);
    } catch (e) {
      // Если не удалось распарсить URL, пытаемся извлечь sub1 вручную
      const sub1Match = templateUrl.match(/[?&]sub1=([^&]*)/);
      if (sub1Match) {
        protectedSub1 = decodeURIComponent(sub1Match[1]);
        logger.debug('🔒 [generateLinkWithUTM] Защищенный sub1 из ссылки (regex):', protectedSub1);
      }
    }

    // Удаляем sub1 из utmParams и additionalParams, чтобы он не перезаписывался
    const omitProtectedSub1 = (params) =>
      Object.fromEntries(Object.entries(params).filter(([key]) => key !== 'sub1'));
    const allParams = {
      ...omitProtectedSub1(utmParams),
      ...omitProtectedSub1(additionalParams)
    };

    // Функция для проверки валидности значения
    const isValidValue = (value) => {
      if (!value || value === '') return false;
      const lowerValue = String(value).toLowerCase();
      return !['other', 'test', 'unknown', 'null', 'undefined', 'none'].includes(lowerValue);
    };

    // Определяем значения по умолчанию для плейсхолдеров
    // Только для utm_source используем значение по умолчанию 'vk_mini_app'
    // Остальные параметры должны быть пустыми, чтобы удалялись из URL
    const defaultValues = {
      'utm_source': 'vk_mini_app',  // sub2 - всегда должен быть заполнен
      'utm_medium': '',  // sub3 - удаляется, если значение не передано
      'ref': '',
      'ref_source': '',
      'user_id': '',
      'click_id': '',
      'cid': '',
    };

    // Сначала декодируем URL, чтобы плейсхолдеры были в читаемом виде
    try {
      dynamicUrl = decodeURIComponent(dynamicUrl);
    } catch (e) {
      // Если декодирование не удалось, оставляем как есть
    }

    // Логируем для отладки
    logger.debug('🔍 [generateLinkWithUTM] Исходная ссылка:', dynamicUrl);
    logger.debug('🔍 [generateLinkWithUTM] Параметры для замены:', allParams);

    // Заменяем все плейсхолдеры только если значение валидно
    Object.entries(allParams).forEach(([key, value]) => {
      const placeholder = `{${key}}`;
      // Ищем плейсхолдер в обычном виде и в URL-кодированном виде
      const encodedPlaceholder = encodeURIComponent(placeholder);

      if (dynamicUrl.includes(placeholder) || dynamicUrl.includes(encodedPlaceholder)) {
        if (isValidValue(value)) {
          // Заменяем плейсхолдер на валидное значение (и в обычном, и в кодированном виде)
          const encodedValue = encodeURIComponent(value);
          dynamicUrl = dynamicUrl.replace(
            new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'),
            encodedValue
          );
          dynamicUrl = dynamicUrl.replace(
            new RegExp(encodedPlaceholder.replace(/[{}%]/g, '\\$&'), 'g'),
            encodedValue
          );
        } else {
          // Если значение невалидное, используем значение по умолчанию
          const defaultValue = defaultValues[key] || '';
          if (defaultValue && isValidValue(defaultValue)) {
            const encodedDefault = encodeURIComponent(defaultValue);
            dynamicUrl = dynamicUrl.replace(
              new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'),
              encodedDefault
            );
            dynamicUrl = dynamicUrl.replace(
              new RegExp(encodedPlaceholder.replace(/[{}%]/g, '\\$&'), 'g'),
              encodedDefault
            );
          } else {
            // Удаляем параметр с невалидным значением из URL
            // Паттерн для удаления: &param={placeholder} или ?param={placeholder} или param={placeholder}&
            const escapedPlaceholder = placeholder.replace(/[{}]/g, '\\$&');
            const escapedEncodedPlaceholder = encodedPlaceholder.replace(/[{}%]/g, '\\$&');
            dynamicUrl = dynamicUrl
              .replace(new RegExp(`[&?]\\w+=${escapedPlaceholder}(?=&|$)`, 'g'), '')
              .replace(new RegExp(`\\w+=${escapedPlaceholder}&`, 'g'), '')
              .replace(new RegExp(`[&?]\\w+=${escapedEncodedPlaceholder}(?=&|$)`, 'g'), '')
              .replace(new RegExp(`\\w+=${escapedEncodedPlaceholder}&`, 'g'), '');
          }
        }
      }
    });

    // Удаляем все оставшиеся плейсхолдеры (которые не были заменены)
    // Это важно, чтобы плейсхолдеры не оставались в URL
    // Обрабатываем как обычные плейсхолдеры, так и URL-кодированные
    dynamicUrl = dynamicUrl.replace(/\{[^}]+\}/g, (match) => {
      // Извлекаем ключ из плейсхолдера
      const key = match.slice(1, -1);
      const defaultValue = defaultValues[key];
      if (defaultValue && isValidValue(defaultValue)) {
        return encodeURIComponent(defaultValue);
      }
      // Если нет значения по умолчанию, возвращаем пустую строку
      // Параметр будет удален позже в процессе очистки
      return '';
    });

    // Также обрабатываем URL-кодированные плейсхолдеры
    dynamicUrl = dynamicUrl.replace(/%7B([^%]+)%7D/g, (match, key) => {
      const defaultValue = defaultValues[key];
      if (defaultValue && isValidValue(defaultValue)) {
        return encodeURIComponent(defaultValue);
      }
      return '';
    });

    // Удаляем параметры, которые содержат пустые значения после замены плейсхолдеров
    // Это нужно, чтобы удалить параметры вида sub2= или sub3=
    dynamicUrl = dynamicUrl.replace(/[?&](\w+)=&/g, (match) => {
      // Удаляем параметр с пустым значением
      return match.includes('?') ? '?' : '&';
    });
    dynamicUrl = dynamicUrl.replace(/[?&](\w+)=$/g, '');

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

    // Добавляем дополнительные параметры, которые не были подставлены через плейсхолдеры
    // Это нужно для параметров типа ref_campaign, ref_ad и т.д.
    const additionalParamsToAdd = ['ref_campaign', 'ref_ad', 'campaign_id', 'ad_id'];

    // Логируем для отладки
    logger.debug('🔍 [generateLinkWithUTM] allParams перед добавлением дополнительных:', allParams);

    try {
      // Пытаемся создать URL объект (работает только для абсолютных URL)
      const urlObj = new URL(dynamicUrl);
      additionalParamsToAdd.forEach(param => {
        const value = allParams[param];
        logger.debug(`🔍 [generateLinkWithUTM] Проверяем параметр ${param}:`, { value, isValid: value && isValidValue(value), exists: urlObj.searchParams.has(param) });
        if (value && isValidValue(value) && !urlObj.searchParams.has(param)) {
          // Добавляем параметр только если его еще нет в URL
          urlObj.searchParams.set(param, value);
          logger.debug(`✅ [generateLinkWithUTM] Добавлен параметр ${param}=${value}`);
        }
      });
      dynamicUrl = urlObj.toString();
    } catch (e) {
      // Если URL относительный или неполный, добавляем параметры вручную
      logger.debug('⚠️ [generateLinkWithUTM] Не удалось создать URL объект, добавляем параметры вручную:', e);
      additionalParamsToAdd.forEach(param => {
        const value = allParams[param];
        if (value && isValidValue(value)) {
          // Проверяем, есть ли уже этот параметр в URL
          const paramRegex = new RegExp(`[?&]${param}=[^&]*`);
          if (!paramRegex.test(dynamicUrl)) {
            // Добавляем параметр в конец URL
            const separator = dynamicUrl.includes('?') ? '&' : '?';
            dynamicUrl += `${separator}${param}=${encodeURIComponent(value)}`;
            logger.debug(`✅ [generateLinkWithUTM] Добавлен параметр ${param}=${value} вручную`);
          }
        }
      });
    }

    // КРИТИЧЕСКИ ВАЖНО: Восстанавливаем защищенный sub1 из исходной ссылки МФО
    // Это гарантирует, что sub1 всегда будет правильным, даже если он был случайно удален
    if (protectedSub1) {
      try {
        const urlObj = new URL(dynamicUrl);
        const currentSub1 = urlObj.searchParams.get('sub1');
        // Если sub1 отсутствует или отличается от защищенного, восстанавливаем его
        if (!currentSub1 || currentSub1 !== protectedSub1) {
          urlObj.searchParams.set('sub1', protectedSub1);
          dynamicUrl = urlObj.toString();
          logger.debug('🔒 [generateLinkWithUTM] Восстановлен защищенный sub1:', protectedSub1);
        }
      } catch (e) {
        // Если не удалось распарсить URL, восстанавливаем sub1 вручную
        const sub1Regex = /[?&]sub1=[^&]*/;
        if (sub1Regex.test(dynamicUrl)) {
          // Заменяем существующий sub1
          dynamicUrl = dynamicUrl.replace(sub1Regex, `sub1=${encodeURIComponent(protectedSub1)}`);
        } else {
          // Добавляем sub1, если его нет
          const separator = dynamicUrl.includes('?') ? '&' : '?';
          dynamicUrl += `${separator}sub1=${encodeURIComponent(protectedSub1)}`;
        }
        logger.debug('🔒 [generateLinkWithUTM] Восстановлен защищенный sub1 (regex):', protectedSub1);
      }
    }

    // Логируем финальную ссылку для отладки
    logger.debug('✅ [generateLinkWithUTM] Финальная ссылка:', dynamicUrl);

    return dynamicUrl;
  }, [utmParams]);

  /**
   * Инициализация хука
   * НЕ блокирует загрузку страницы - выполняется параллельно
   */
  useEffect(() => {
    const initializeUTMTracker = async () => {
      try {
        logger.debug('🔴 [useUTMTracker] Инициализация UTM трекера...');
        logger.debug('🔴 [useUTMTracker] RAW window.location.href:', window.location.href);
        logger.debug('🔴 [useUTMTracker] RAW window.location.hash:', window.location.hash);
        setIsLoading(true);
        setError(null);
        setIsUserDataReady(false);

        // Извлекаем UTM из URL (синхронно, быстро) - ДО того, как HashRouter изменит hash
        const urlUTM = extractUTMFromURL();
        logger.info('🔍 Параметры из URL:', urlUTM);

        // Получаем данные из VK Bridge с таймаутом (УМЕНЬШЕН до 1 секунды!)
        let vkData;
        try {
          logger.debug('🔍 [useUTMTracker] Запрос к VK Bridge...');
          const vkDataPromise = getVKParams();
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('VK Bridge timeout')), 1000) // Уменьшено до 1 секунды!
          );
          vkData = await Promise.race([vkDataPromise, timeoutPromise]);
          logger.debug('✅ [useUTMTracker] VK Bridge ответил');
        } catch (vkError) {
          logger.warn('⚠️ VK Bridge недоступен или таймаут (не критично):', vkError);
          vkData = {
            userInfo: {},
            launchParams: {},
            vkAvailable: false
          };
        }

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
        logger.debug('✅ [useUTMTracker] Устанавливаем UTM параметры и данные пользователя');
        setUtmParams(allUTMParams);
        setUserData(userInfo);

        // Проверяем, есть ли у нас ID пользователя
        if (userInfo.id) {
          setIsUserDataReady(true);
          logger.debug('✅ [useUTMTracker] User ID найден:', userInfo.id);
        } else {
          logger.warn('⚠️ [useUTMTracker] User ID не найден');
        }

        const trackerInfo = {
          utmParams: allUTMParams,
          userData: userInfo,
          vkAvailable: vkData.vkAvailable,
          isUserDataReady: !!userInfo.id
        };
        logger.info('🎯 UTM Tracker инициализирован:', trackerInfo);

        // ВАЖНО: Снимаем флаг загрузки СРАЗУ, до отправки на backend!
        setIsLoading(false);
        logger.debug('✅ [useUTMTracker] isLoading установлен в false');

        // Отправляем данные на backend АСИНХРОННО, не блокируя загрузку
        // Используем .catch чтобы ошибки не влияли на работу приложения
        sendUTMToBackend(allUTMParams, userInfo).catch(err => {
          logger.warn('⚠️ Ошибка отправки UTM на backend (не критично):', err);
        });

      } catch (error) {
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
        logger.debug('🏁 [useUTMTracker] Инициализация завершена, isLoading=false');
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

import vkBridge from '@vkontakte/vk-bridge';

/**
 * Утилиты для работы с VK параметрами и динамическими ссылками
 */

// Кэш для хранения данных пользователя
let userDataCache = null;

/**
 * Получает данные пользователя из VK Bridge
 */
export const getUserData = async () => {
  if (userDataCache) {
    return userDataCache;
  }

  try {
    const userData = await vkBridge.send('VKWebAppGetUserInfo');
    userDataCache = userData;
    return userData;
  } catch (error) {
    console.error('Ошибка получения данных пользователя VK:', error);
    // Возвращаем пустые данные в случае ошибки
    return {
      id: null,
      first_name: '',
      last_name: ''
    };
  }
};

/**
 * Получает параметры запуска приложения VK
 */
export const getAppLaunchParams = async () => {
  try {
    const launchParams = await vkBridge.send('VKWebAppGetLaunchParams');
    return launchParams;
  } catch (error) {
    console.error('Ошибка получения параметров запуска:', error);
    return {};
  }
};

/**
 * Извлекает ref, ref_source и ad_id из URL параметров или launch параметров
 */
export const getRefParams = async () => {
  // Функция для фильтрации нежелательных значений
  const filterValue = (value) => {
    if (!value) return '';
    const lowerValue = value.toLowerCase();
    // Фильтруем значения "other", "test", "unknown", "null", "undefined"
    if (['other', 'test', 'unknown', 'null', 'undefined', 'none', ''].includes(lowerValue)) {
      return '';
    }
    return value;
  };

  // Сначала проверяем URL параметры
  const urlParams = new URLSearchParams(window.location.search);
  const ref = filterValue(urlParams.get('ref') || urlParams.get('vk_ref'));
  const refSource = filterValue(urlParams.get('ref_source') || urlParams.get('vk_ref_source'));
  const adId = filterValue(urlParams.get('ad_id') || urlParams.get('vk_ad_id'));

  if (ref || refSource || adId) {
    return { ref, ref_source: refSource, ad_id: adId };
  }

  // Если в URL нет, пробуем получить из launch параметров VK
  try {
    const launchParams = await getAppLaunchParams();
    return {
      ref: filterValue(launchParams.vk_ref || ''),
      ref_source: filterValue(launchParams.vk_ref_source || ''),
      ad_id: filterValue(launchParams.vk_ad_id || launchParams.ad_id || '')
    };
  } catch (error) {
    console.error('Ошибка получения ref параметров:', error);
    return { ref: '', ref_source: '', ad_id: '' };
  }
};

/**
 * Генерирует динамическую ссылку с подставленными параметрами
 * @param {string} templateUrl - шаблон URL с плейсхолдерами
 * @param {Object} userData - данные пользователя VK
 * @param {Object} refParams - параметры реферальной системы
 * @returns {string} готовая ссылка с подставленными параметрами
 */
export const generateDynamicLink = (templateUrl, userData = {}, refParams = {}) => {
  if (!templateUrl) return '';

  let dynamicUrl = templateUrl;

  // Заменяем плейсхолдеры на реальные значения
  const replacements = {
    '{user_id}': userData.id || '',
    '{first_name}': userData.first_name || '',
    '{last_name}': userData.last_name || '',
    '{ref}': refParams.ref || refParams.ad_id || '',
    '{ref_source}': refParams.ref_source || ''
  };

  // Применяем все замены
  Object.entries(replacements).forEach(([placeholder, value]) => {
    dynamicUrl = dynamicUrl.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), 
      encodeURIComponent(value));
  });

  return dynamicUrl;
};

/**
 * Создает полную динамическую ссылку для MFO с параметрами VK рекламы
 * @param {Object} mfo - объект MFO с базовой ссылкой
 * @returns {Promise<string>} промис с готовой ссылкой
 */
export const createMFODynamicLink = async (mfo) => {
  if (!mfo || !mfo.link) {
    return '';
  }

  try {
    console.log('🔗 Создание динамической ссылки для MFO:', mfo.name);
    
    // Получаем данные пользователя и ref параметры
    const [userData, refParams] = await Promise.all([
      getUserData(),
      getRefParams()
    ]);
    
    // Генерируем динамическую ссылку
    const dynamicLink = generateDynamicLink(mfo.link, userData, refParams);
    
    console.log('✅ Сгенерирована динамическая ссылка:', {
      original: mfo.link,
      dynamic: dynamicLink,
      userData,
      refParams
    });

    return dynamicLink;
  } catch (error) {
    console.error('❌ Ошибка создания динамической ссылки:', error);
    // В случае ошибки возвращаем оригинальную ссылку
    return mfo.link;
  }
};

/**
 * Очищает кэш данных пользователя (полезно для тестирования)
 */
export const clearUserDataCache = () => {
  userDataCache = null;
};

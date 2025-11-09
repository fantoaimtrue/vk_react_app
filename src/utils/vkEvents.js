import bridge from '@vkontakte/vk-bridge';

/**
 * Отправляет событие в VK Рекламу и MyTracker
 * @param {object} params
 * @param {string} params.eventName - Название события (например, 'login', 'lead')
 * @param {string|number} [params.userId] - ID пользователя в вашем приложении
 */
export const trackEvent = async ({ eventName, userId }) => {
  // Проверяем, доступен ли VK Bridge
  if (!await bridge.supports('VKWebAppTrackEvent')) {
    console.warn('VKWebAppTrackEvent is not supported on this platform.');
    return;
  }

  try {
    const params = {
      event_name: eventName,
    };

    if (userId) {
      // VK требует, чтобы user_id был строкой
      params.user_id = String(userId);
    }
    
    const result = await bridge.send('VKWebAppTrackEvent', params);
    
    if (result.result) {
      console.log(`✅ VK Ads Event Sent: ${eventName}`, params);
    } else {
      console.warn(`⚠️ VK Ads Event "${eventName}" sent but returned a negative result.`, result);
    }
    
    return result;
  } catch (error) {
    console.error(`❌ Error sending VK Ads Event "${eventName}":`, error);
  }
};

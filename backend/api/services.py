"""
Сервис для работы с пуш-уведомлениями VK Mini Apps
"""
import requests
from django.conf import settings
from django.utils import timezone
from .models import VKUser, PushNotification, PushLog


def send_vk_notification(user_id, message, fragment=None):
    """
    Отправка уведомления через VK API
    
    Args:
        user_id: VK ID пользователя
        message: Текст уведомления
        fragment: Параметр для открытия определенной части приложения
    
    Returns:
        dict: Ответ VK API
    """
    import logging
    logger = logging.getLogger(__name__)
    
    # Получаем токен доступа из настроек
    access_token = getattr(settings, 'VK_APP_ACCESS_TOKEN', None)
    
    logger.info(f"🔑 VK Token присутствует: {bool(access_token)}")
    if access_token:
        logger.info(f"🔑 VK Token (первые 20 символов): {access_token[:20]}...")
    
    if not access_token:
        error_msg = "VK_APP_ACCESS_TOKEN не установлен в settings.py"
        logger.error(f"❌ {error_msg}")
        raise ValueError(error_msg)
    
    # Параметры запроса к VK API
    # ВАЖНО: VK API требует user_ids (множественное число)!
    params = {
        'user_ids': str(user_id),  # Один ID, но в формате для множественного числа
        'message': message,
        'access_token': access_token,
        'v': '5.131',  # Версия API
    }
    
    # Если есть fragment (для навигации внутри приложения)
    if fragment:
        params['fragment'] = fragment
    
    logger.info(f"📱 Отправка пуш-уведомления пользователю {user_id}")
    logger.info(f"📝 Сообщение: {message}")
    
    # Отправка запроса
    url = 'https://api.vk.com/method/notifications.sendMessage'
    logger.info(f"🌐 URL: {url}")
    
    try:
        response = requests.get(url, params=params, timeout=10)
        result = response.json()
        
        logger.info(f"📊 Статус код: {response.status_code}")
        logger.info(f"📋 Ответ VK API: {result}")
        
        if 'error' in result:
            logger.error(f"❌ Ошибка VK API: {result['error']}")
        else:
            logger.info(f"✅ Успешно отправлено!")
        
        return result
    except Exception as e:
        logger.error(f"❌ Исключение при отправке: {str(e)}")
        raise


def send_push_notification(notification_id):
    """
    Отправка пуш-уведомления всем целевым пользователям
    
    Args:
        notification_id: ID уведомления из базы
    
    Returns:
        dict: Статистика отправки
    """
    try:
        notification = PushNotification.objects.get(id=notification_id)
    except PushNotification.DoesNotExist:
        raise ValueError(f"Уведомление с ID {notification_id} не найдено")
    
    # Проверяем статус
    if notification.status not in ['draft', 'scheduled']:
        raise ValueError(f"Уведомление уже было отправлено (статус: {notification.status})")
    
    # Обновляем статус
    notification.status = 'sending'
    notification.save()
    
    # Получаем список целевых пользователей
    target_users = notification.get_target_users_queryset()
    
    # Статистика
    stats = {
        'total': target_users.count(),
        'sent': 0,
        'delivered': 0,
        'failed': 0,
    }
    
    # Отправляем уведомления
    for user in target_users:
        try:
            # Формируем fragment для навигации (если указан action_url)
            fragment = None
            if notification.action_url:
                # Можно добавить параметры для открытия определенной страницы в приложении
                fragment = notification.action_url
            
            # Отправляем уведомление через VK API
            vk_response = send_vk_notification(
                user_id=user.vk_user_id,
                message=notification.message,
                fragment=fragment
            )
            
            # Проверяем ответ
            if 'response' in vk_response:
                # Успешно отправлено
                PushLog.objects.create(
                    notification=notification,
                    user=user,
                    status='delivered',
                    vk_response=vk_response
                )
                stats['sent'] += 1
                stats['delivered'] += 1
            else:
                # Ошибка при отправке
                error_msg = vk_response.get('error', {}).get('error_msg', 'Unknown error')
                PushLog.objects.create(
                    notification=notification,
                    user=user,
                    status='failed',
                    error_message=error_msg,
                    vk_response=vk_response
                )
                stats['failed'] += 1
                
        except Exception as e:
            # Ошибка при отправке
            PushLog.objects.create(
                notification=notification,
                user=user,
                status='failed',
                error_message=str(e)
            )
            stats['failed'] += 1
    
    # Обновляем статистику уведомления
    notification.total_sent = stats['sent']
    notification.total_delivered = stats['delivered']
    notification.total_failed = stats['failed']
    notification.status = 'sent'
    notification.sent_at = timezone.now()
    notification.save()
    
    return stats


def register_or_update_user(vk_user_data, utm_params=None):
    """
    Регистрация или обновление пользователя VK
    
    Args:
        vk_user_data: Данные пользователя из VK Bridge
        utm_params: UTM параметры для аналитики
    
    Returns:
        VKUser: Объект пользователя
    """
    vk_user_id = vk_user_data.get('id')
    
    if not vk_user_id:
        raise ValueError("vk_user_id обязателен")
    
    # Получаем или создаем пользователя
    user, created = VKUser.objects.get_or_create(
        vk_user_id=vk_user_id,
        defaults={
            'first_name': vk_user_data.get('first_name', ''),
            'last_name': vk_user_data.get('last_name', ''),
            'sex': vk_user_data.get('sex'),
            'bdate': vk_user_data.get('bdate', ''),
            'city': vk_user_data.get('city', {}).get('title', '') if isinstance(vk_user_data.get('city'), dict) else '',
            'country': vk_user_data.get('country', {}).get('title', '') if isinstance(vk_user_data.get('country'), dict) else '',
        }
    )
    
    # Если пользователь уже существует, обновляем данные
    if not created:
        user.first_name = vk_user_data.get('first_name', user.first_name)
        user.last_name = vk_user_data.get('last_name', user.last_name)
        user.sex = vk_user_data.get('sex', user.sex)
        user.bdate = vk_user_data.get('bdate', user.bdate)
        user.city = vk_user_data.get('city', {}).get('title', user.city) if isinstance(vk_user_data.get('city'), dict) else user.city
        user.country = vk_user_data.get('country', {}).get('title', user.country) if isinstance(vk_user_data.get('country'), dict) else user.country
        user.total_visits += 1
        user.last_visit = timezone.now()
    
    # Сохраняем UTM параметры (при первом визите или если они изменились)
    if utm_params:
        # Обновляем UTM параметры, если они есть и отличаются от текущих
        new_utm_source = utm_params.get('utm_source', '')
        new_utm_campaign = utm_params.get('utm_campaign', '')
        new_utm_content = utm_params.get('utm_content', '')
        
        if new_utm_source and new_utm_source != user.utm_source:
            user.utm_source = new_utm_source
        if new_utm_campaign and new_utm_campaign != user.utm_campaign:
            user.utm_campaign = new_utm_campaign
        if new_utm_content and new_utm_content != user.utm_content:
            user.utm_content = new_utm_content
    
    # Сохраняем дополнительные данные
    user.extra_data = vk_user_data
    user.save()
    
    return user


def check_notifications_permission(vk_user_id):
    """
    Проверка разрешения на отправку уведомлений от пользователя
    Обновляет статус notifications_allowed в базе
    
    Args:
        vk_user_id: VK ID пользователя
    
    Returns:
        bool: True если разрешено, False если нет
    """
    try:
        # Получаем токен доступа
        access_token = getattr(settings, 'VK_APP_ACCESS_TOKEN', None)
        
        if not access_token:
            return False
        
        # Проверяем разрешение через VK API
        params = {
            'user_id': vk_user_id,
            'access_token': access_token,
            'v': '5.131',
        }
        
        response = requests.get(
            'https://api.vk.com/method/apps.isNotificationsAllowed',
            params=params,
            timeout=10
        )
        
        result = response.json()
        is_allowed = result.get('response', {}).get('is_allowed', False)
        
        # Обновляем в базе
        try:
            user = VKUser.objects.get(vk_user_id=vk_user_id)
            user.notifications_allowed = is_allowed
            user.save()
        except VKUser.DoesNotExist:
            pass
        
        return is_allowed
        
    except Exception:
        return False


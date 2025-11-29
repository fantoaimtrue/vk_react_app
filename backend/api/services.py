"""
Сервис для работы с пуш-уведомлениями VK Mini Apps
"""
import requests
from django.conf import settings
from django.utils import timezone
from .models import VKUser, PushNotification, PushLog, PushCampaign, PushTemplate, SentPush


def send_vk_notification(user_id, message, title=None, fragment=None):
    """
    Отправка уведомления через VK API
    
    Args:
        user_id: VK ID пользователя
        message: Текст уведомления
        title: Заголовок уведомления (опционально)
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
    
    # Формируем полное сообщение (объединяем title и message, если title есть)
    full_message = message
    if title:
        full_message = f"{title}\n\n{message}"
    
    # Параметры запроса к VK API
    # ВАЖНО: VK API требует user_ids (множественное число)!
    params = {
        'user_ids': str(user_id),  # Один ID, но в формате для множественного числа
        'message': full_message,
        'access_token': access_token,
        'v': '5.131',  # Версия API
    }
    
    # Если есть fragment (для навигации внутри приложения)
    if fragment:
        params['fragment'] = fragment
    
    logger.info(f"📱 Отправка пуш-уведомления пользователю {user_id}")
    if title:
        logger.info(f"📌 Заголовок: {title}")
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
            error_code = result['error'].get('error_code', 'unknown')
            error_msg = result['error'].get('error_msg', 'Unknown error')
            logger.error(f"❌ Ошибка VK API [{error_code}]: {error_msg}")
        else:
            logger.info(f"✅ Успешно отправлено!")
        
        return result
    except requests.exceptions.RequestException as e:
        logger.error(f"❌ Сетевая ошибка при отправке: {str(e)}")
        raise
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
    import logging
    logger = logging.getLogger(__name__)
    
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
                title=notification.title,
                fragment=fragment
            )
            
            # Проверяем ответ VK API
            # Метод notifications.sendMessage возвращает массив результатов
            if 'response' in vk_response:
                response_data = vk_response['response']
                # response может быть массивом или объектом
                if isinstance(response_data, list) and len(response_data) > 0:
                    # Проверяем статус в первом элементе массива
                    user_result = response_data[0]
                    if user_result.get('status') is True or user_result.get('user_id') == user.vk_user_id:
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
                        error_msg = f"Статус отправки: {user_result.get('status', 'unknown')}"
                        PushLog.objects.create(
                            notification=notification,
                            user=user,
                            status='failed',
                            error_message=error_msg,
                            vk_response=vk_response
                        )
                        stats['failed'] += 1
                elif isinstance(response_data, dict) and response_data.get('status') is True:
                    # Альтернативный формат ответа
                    PushLog.objects.create(
                        notification=notification,
                        user=user,
                        status='delivered',
                        vk_response=vk_response
                    )
                    stats['sent'] += 1
                    stats['delivered'] += 1
                else:
                    # Неожиданный формат ответа, но считаем успешным если нет ошибки
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
                error_data = vk_response.get('error', {})
                error_code = error_data.get('error_code', 'unknown')
                error_msg = error_data.get('error_msg', 'Unknown error')
                full_error_msg = f"[{error_code}] {error_msg}"
                
                PushLog.objects.create(
                    notification=notification,
                    user=user,
                    status='failed',
                    error_message=full_error_msg,
                    vk_response=vk_response
                )
                stats['failed'] += 1
                
        except Exception as e:
            # Ошибка при отправке
            import traceback
            error_trace = traceback.format_exc()
            logger.error(f"❌ Ошибка при отправке уведомления пользователю {user.vk_user_id}: {str(e)}\n{error_trace}")
            
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
    
    # Определяем финальный статус
    if stats['failed'] == stats['total']:
        # Все уведомления не удалось отправить
        notification.status = 'failed'
        logger.error(f"❌ Все уведомления не удалось отправить для {notification.title}")
    elif stats['failed'] > 0:
        # Часть уведомлений не удалось отправить, но есть успешные
        notification.status = 'sent'
        logger.warning(f"⚠️ Часть уведомлений не удалось отправить для {notification.title}: {stats['failed']} из {stats['total']}")
    else:
        # Все уведомления успешно отправлены
        notification.status = 'sent'
        logger.info(f"✅ Все уведомления успешно отправлены для {notification.title}: {stats['delivered']} из {stats['total']}")
    
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


# ============================================
# НОВАЯ СИСТЕМА РАССЫЛОК (Bot Hunter Style)
# ============================================

def send_campaign_push(campaign_id):
    """
    Отправка рассылки пуш-уведомлений
    
    Args:
        campaign_id: ID рассылки
    
    Returns:
        dict: Статистика отправки
    """
    import logging
    logger = logging.getLogger(__name__)
    
    try:
        campaign = PushCampaign.objects.get(id=campaign_id)
    except PushCampaign.DoesNotExist:
        raise ValueError(f"Рассылка с ID {campaign_id} не найдена")
    
    # Проверяем статус
    if campaign.status != 'active':
        raise ValueError(f"Рассылка не активна (статус: {campaign.status})")
    
    # Проверяем наличие шаблонов
    templates = campaign.templates.all().order_by('order', 'id')
    if not templates.exists():
        raise ValueError("В рассылке нет шаблонов пушей")
    
    # Проверяем лимиты
    if campaign.total_sends_limit and campaign.total_sent >= campaign.total_sends_limit:
        campaign.status = 'completed'
        campaign.completed_at = timezone.now()
        campaign.save()
        raise ValueError(f"Достигнут общий лимит отправок: {campaign.total_sends_limit}")
    
    # Проверяем дневной лимит
    if campaign.max_sends_per_day:
        from datetime import timedelta
        today_start = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
        today_sent = SentPush.objects.filter(
            campaign=campaign,
            sent_at__gte=today_start
        ).count()
        if today_sent >= campaign.max_sends_per_day:
            logger.warning(f"Достигнут дневной лимит для рассылки {campaign.name}: {today_sent}/{campaign.max_sends_per_day}")
            return {
                'total': 0,
                'sent': 0,
                'delivered': 0,
                'failed': 0,
                'message': f'Достигнут дневной лимит: {today_sent}/{campaign.max_sends_per_day}'
            }
    
    # Получаем целевую аудиторию
    target_users = campaign.get_target_users_queryset()
    
    # Исключаем пользователей, которым уже отправляли сегодня (для избежания спама)
    from datetime import timedelta
    today_start = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
    already_sent_today = SentPush.objects.filter(
        campaign=campaign,
        sent_at__gte=today_start,
        status__in=['sent', 'delivered']
    ).values_list('user_id', flat=True)
    
    target_users = target_users.exclude(id__in=already_sent_today)
    
    if not target_users.exists():
        logger.info(f"Нет пользователей для отправки в рассылке {campaign.name}")
        return {
            'total': 0,
            'sent': 0,
            'delivered': 0,
            'failed': 0,
            'message': 'Нет пользователей для отправки'
        }
    
    # Статистика
    stats = {
        'total': target_users.count(),
        'sent': 0,
        'delivered': 0,
        'failed': 0,
    }
    
    # Выбираем шаблон (ротация по порядку)
    # Используем остаток от деления для циклической ротации
    template_index = campaign.total_sent % templates.count()
    template = templates[template_index]
    
    logger.info(f"📧 Отправка рассылки '{campaign.name}' с шаблоном '{template.title}'")
    logger.info(f"👥 Получателей: {stats['total']}")
    
    # Отправляем уведомления
    for user in target_users:
        try:
            # Отправляем уведомление через VK API
            vk_response = send_vk_notification(
                user_id=user.vk_user_id,
                message=template.message,
                title=template.title,
                fragment=template.action_url if template.action_url else None
            )
            
            # Проверяем ответ VK API
            if 'response' in vk_response:
                response_data = vk_response['response']
                if isinstance(response_data, list) and len(response_data) > 0:
                    user_result = response_data[0]
                    if user_result.get('status') is True or user_result.get('user_id') == user.vk_user_id:
                        # Успешно отправлено
                        SentPush.objects.create(
                            campaign=campaign,
                            template=template,
                            user=user,
                            title=template.title,
                            message=template.message,
                            action_url=template.action_url or '',
                            status='delivered',
                            vk_response=vk_response
                        )
                        stats['sent'] += 1
                        stats['delivered'] += 1
                    else:
                        # Ошибка при отправке
                        error_msg = f"Статус отправки: {user_result.get('status', 'unknown')}"
                        SentPush.objects.create(
                            campaign=campaign,
                            template=template,
                            user=user,
                            title=template.title,
                            message=template.message,
                            action_url=template.action_url or '',
                            status='failed',
                            error_message=error_msg,
                            vk_response=vk_response
                        )
                        stats['failed'] += 1
                elif isinstance(response_data, dict) and response_data.get('status') is True:
                    SentPush.objects.create(
                        campaign=campaign,
                        template=template,
                        user=user,
                        title=template.title,
                        message=template.message,
                        action_url=template.action_url or '',
                        status='delivered',
                        vk_response=vk_response
                    )
                    stats['sent'] += 1
                    stats['delivered'] += 1
                else:
                    # Неожиданный формат, но считаем успешным если нет ошибки
                    SentPush.objects.create(
                        campaign=campaign,
                        template=template,
                        user=user,
                        title=template.title,
                        message=template.message,
                        action_url=template.action_url or '',
                        status='delivered',
                        vk_response=vk_response
                    )
                    stats['sent'] += 1
                    stats['delivered'] += 1
            else:
                # Ошибка при отправке
                error_data = vk_response.get('error', {})
                error_code = error_data.get('error_code', 'unknown')
                error_msg = error_data.get('error_msg', 'Unknown error')
                full_error_msg = f"[{error_code}] {error_msg}"
                
                SentPush.objects.create(
                    campaign=campaign,
                    template=template,
                    user=user,
                    title=template.title,
                    message=template.message,
                    action_url=template.action_url or '',
                    status='failed',
                    error_message=full_error_msg,
                    vk_response=vk_response
                )
                stats['failed'] += 1
                
        except Exception as e:
            # Ошибка при отправке
            import traceback
            error_trace = traceback.format_exc()
            logger.error(f"❌ Ошибка при отправке уведомления пользователю {user.vk_user_id}: {str(e)}\n{error_trace}")
            
            SentPush.objects.create(
                campaign=campaign,
                template=template,
                user=user,
                title=template.title,
                message=template.message,
                action_url=template.action_url or '',
                status='failed',
                error_message=str(e)
            )
            stats['failed'] += 1
    
    # Обновляем статистику рассылки
    campaign.total_sent += stats['sent']
    campaign.total_delivered += stats['delivered']
    campaign.total_failed += stats['failed']
    
    # Обновляем статистику шаблона
    template.times_used += stats['sent']
    template.save()
    
    # Проверяем лимиты
    if campaign.total_sends_limit and campaign.total_sent >= campaign.total_sends_limit:
        campaign.status = 'completed'
        campaign.completed_at = timezone.now()
        logger.info(f"✅ Рассылка '{campaign.name}' завершена (достигнут лимит)")
    
    campaign.save()
    
    logger.info(f"✅ Рассылка '{campaign.name}' отправлена: {stats['delivered']} доставлено, {stats['failed']} ошибок")
    
    return stats


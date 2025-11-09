from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework.response import Response
from django_ratelimit.decorators import ratelimit
from django.utils import timezone
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from django.http import HttpResponse
from .models import MFO, Offer, UTMTracking, VKUser, PushNotification, PushLog
from .services import register_or_update_user, check_notifications_permission
import json
import pandas as pd
import io
import traceback
from rest_framework import serializers
from django.db.models import Count
import logging
import requests
import re

logger = logging.getLogger(__name__)


# =============================================================================
# СЕРИАЛИЗАТОРЫ
# =============================================================================

class MFOSerializer(serializers.ModelSerializer):
    """
    Сериализатор для модели МФО, помещенный в этот файл,
    чтобы избежать циклических импортов и ошибок.
    """
    requirements = serializers.SerializerMethodField()
    get_methods = serializers.SerializerMethodField()
    repay_methods = serializers.SerializerMethodField()

    class Meta:
        model = MFO
        fields = '__all__'

    def get_string_as_list(self, obj, field_name):
        field_value = getattr(obj, field_name, '')
        if field_value and isinstance(field_value, str):
            return [item.strip() for item in field_value.split(';') if item.strip()]
        return []

    def get_requirements(self, obj):
        return self.get_string_as_list(obj, 'requirements')

    def get_get_methods(self, obj):
        return self.get_string_as_list(obj, 'get_methods')

    def get_repay_methods(self, obj):
        return self.get_string_as_list(obj, 'repay_methods')


# =============================================================================
# API VIEWS
# =============================================================================

@api_view(['GET'])
@permission_classes([AllowAny])
def mfo_list(request):
    """
    Получение списка МФО из внешнего API itfinance.online
    """
    try:
        # URL внешнего API
        api_url = "https://api.we.itfinance.online/v1/website-shopwindow-offers?website_id=4228&shopwindow_type=of-list-suc"
        
        # Пробрасываем важные заголовки от пользователя
        headers = {
            'User-Agent': request.headers.get('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'),
            'Referer': request.headers.get('Referer', 'https://vk.com/'),
        }

        logger.info(f"Запрашиваем данные из {api_url} с заголовками: {headers}")

        # Выполняем запрос
        response = requests.get(api_url, timeout=10, headers=headers)

        logger.info(f"Ответ от itfinance.online: status_code={response.status_code}")
        
        # Логируем часть контента для отладки, если есть проблемы
        if response.status_code != 200:
             logger.warning(f"Контент ответа itfinance.online: {response.text[:500]}")
        
        response.raise_for_status()  # Вызовет исключение для кодов 4xx/5xx
        
        data = response.json()
        
        logger.info(f"Получено {len(data.get('items', []))} офферов от itfinance.online")

        transformed_mfos = []
        for item in data.get('items', []):
            offer = item.get('offer', {})
            if not offer:
                continue

            # --- Извлечение approval_chance ---
            approval_chance = 80  # Default value
            label_text = item.get('label_text', '')
            match = re.search(r'(\d+)%', label_text)
            if match:
                approval_chance = int(match.group(1))
            else:
                # Fallback based on order if no percentage found
                order = item.get('order', 5)
                approval_chance = max(100 - order * 5, 75)

            # --- Извлечение payout_speed_hours ---
            payout_speed_hours = 24 # Default value
            if 'моментально' in label_text.lower():
                payout_speed_hours = 0.5
            elif 'в 2 клика' in label_text.lower():
                 payout_speed_hours = 1.0
            else:
                order = item.get('order', 5)
                payout_speed_hours = max(24 - order * 2, 1)

            transformed_mfos.append({
                'id': offer.get('inn') or item.get('order'), # Use INN or order as ID
                'name': offer.get('product_name'),
                'logo_url': offer.get('image_link'),
                'link': item.get('link'),
                'sum_min': int(float(offer.get('amount_min', 0))),
                'sum_max': int(float(offer.get('amount_max', 0))),
                'term_min': offer.get('loan_term_from'),
                'term_max': offer.get('loan_term_to'),
                'rate': float(offer.get('daily_percentage_min', 0.8)),
                'approval_chance': approval_chance,
                'payout_speed_hours': payout_speed_hours,
                'promo_text': label_text, # Дополнительное поле для фронтенда
                'requirements': [], # Отсутствует в API
                'get_methods': [], # Отсутствует в API
                'repay_methods': [], # Отсутствует в API
            })
            
        return Response(transformed_mfos)

    except requests.exceptions.RequestException as e:
        logger.error(f"Ошибка при запросе к API itfinance.online: {e}")
        return Response({'error': 'Не удалось получить данные от партнера'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
    except Exception as e:
        logger.exception("Непредвиденная ошибка в mfo_list при работе с внешним API")
        return Response({'error': 'Внутренняя ошибка сервера'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([AllowAny])
def mfo_detail(request, pk):
    """
    Получение детальной информации о МФО (оптимизировано с сериализатором).
    """
    try:
        mfo = MFO.objects.get(pk=pk)
        serializer = MFOSerializer(mfo)
        return Response(serializer.data)
    except MFO.DoesNotExist:
        logger.warning(f"Попытка доступа к несуществующему МФО с pk={pk}")
        return Response({'error': 'MFO not found'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['POST'])
@permission_classes([AllowAny])
@ratelimit(key='ip', rate='100/h', method='POST')
def utm_track(request):
    """
    Отслеживание UTM параметров и аналитика
    """
    try:
        data = request.data
        
        # Извлекаем основные UTM параметры
        utm_params = data.get('utm_params', {})
        user_data = data.get('user_data', {})
        
        # Создаем запись UTM отслеживания
        utm_tracking = UTMTracking.objects.create(
            user_id=user_data.get('id') or utm_params.get('vk_user_id') or utm_params.get('user_id'),
            
            # UTM параметры
            utm_source=utm_params.get('utm_source', ''),
            utm_medium=utm_params.get('utm_medium', ''),
            utm_campaign=utm_params.get('utm_campaign', ''),
            utm_content=utm_params.get('utm_content', ''),
            utm_term=utm_params.get('utm_term', ''),
            
            # VK параметры
            vk_ad_id=utm_params.get('vk_ad_id') or utm_params.get('ad_id', ''),
            vk_ref=utm_params.get('vk_ref') or utm_params.get('ref', ''),
            vk_ref_source=utm_params.get('vk_ref_source') or utm_params.get('ref_source', ''),
            vk_platform=utm_params.get('vk_platform', ''),
            
            # Дополнительные данные
            url=data.get('url', ''),
            referrer=data.get('referrer', ''),
            user_agent=data.get('user_agent', ''),
            
            # Полные данные
            full_utm_data=utm_params,
            full_user_data=user_data,
            
            # Тип события
            event_type=data.get('event_type', 'page_view')
        )
        
        return Response({
            'success': True,
            'message': 'UTM данные сохранены',
            'tracking_id': utm_tracking.id,
            'timestamp': utm_tracking.timestamp.isoformat()
        })
        
    except Exception as e:
        logger.exception("Непредвиденная ошибка в utm_track")
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([AllowAny])
def utm_stats(request):
    """
    Получение статистики UTM параметров
    """
    try:
        # Получаем параметры фильтрации
        days = int(request.GET.get('days', 7))
        utm_source = request.GET.get('utm_source')
        utm_campaign = request.GET.get('utm_campaign')
        
        # Фильтруем записи
        queryset = UTMTracking.objects.filter(
            timestamp__gte=timezone.now() - timezone.timedelta(days=days)
        )
        
        if utm_source:
            queryset = queryset.filter(utm_source=utm_source)
        if utm_campaign:
            queryset = queryset.filter(utm_campaign=utm_campaign)
        
        # Статистика по источникам
        sources_stats = {}
        campaigns_stats = {}
        platforms_stats = {}
        
        for tracking in queryset:
            # Статистика по источникам
            source = tracking.utm_source or 'unknown'
            sources_stats[source] = sources_stats.get(source, 0) + 1
            
            # Статистика по кампаниям
            campaign = tracking.utm_campaign or 'unknown'
            campaigns_stats[campaign] = campaigns_stats.get(campaign, 0) + 1
            
            # Статистика по платформам
            platform = tracking.vk_platform or 'unknown'
            platforms_stats[platform] = platforms_stats.get(platform, 0) + 1
        
        return Response({
            'period_days': days,
            'total_events': queryset.count(),
            'unique_users': queryset.values('user_id').distinct().count(),
            'sources_stats': sources_stats,
            'campaigns_stats': campaigns_stats,
            'platforms_stats': platforms_stats,
            'recent_events': [
                {
                    'id': t.id,
                    'timestamp': t.timestamp.isoformat(),
                    'user_id': t.user_id,
                    'utm_source': t.utm_source,
                    'utm_campaign': t.utm_campaign,
                    'vk_ad_id': t.vk_ad_id,
                    'event_type': t.event_type
                }
                for t in queryset.order_by('-timestamp')[:10]
            ]
        })
        
    except Exception as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([AllowAny])
def offers_list(request):
    """
    Получение списка офферов с UTM-метками
    """
    user_id = request.query_params.get('user_id', 'unknown')
    offers = Offer.objects.all()
    data = []
    
    for offer in offers:
        data.append({
            'id': offer.id,
            'name': offer.name,
            'url': offer.generate_url(user_id)
        })
    
    return Response(data)


@api_view(['POST'])
@permission_classes([IsAdminUser])  # ЗАЩИЩЕНО
def upload_mfo_excel(request):
    """
    Загрузка МФО из Excel файла
    """
    try:
        if 'file' not in request.FILES:
            return Response({
                'success': False,
                'error': 'Файл не найден'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        file = request.FILES['file']
        
        # Проверяем расширение файла
        if not file.name.endswith(('.xlsx', '.xls')):
            return Response({
                'success': False,
                'error': 'Поддерживаются только файлы Excel (.xlsx, .xls)'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Читаем Excel файл
        try:
            df = pd.read_excel(file)
        except Exception as e:
            return Response({
                'success': False,
                'error': f'Ошибка чтения Excel файла: {str(e)}'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Проверяем наличие обязательных колонок
        required_columns = [
            'name', 'link', 'sum_min', 'sum_max', 
            'term_min', 'term_max', 'approval_chance', 'payout_speed_hours'
        ]
        
        missing_columns = [col for col in required_columns if col not in df.columns]
        if missing_columns:
            return Response({
                'success': False,
                'error': f'Отсутствуют обязательные колонки: {", ".join(missing_columns)}'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Обрабатываем данные
        created_count = 0
        updated_count = 0
        errors = []
        
        for index, row in df.iterrows():
            try:
                # Подготавливаем данные
                mfo_data = {
                    'name': str(row['name']).strip(),
                    'link': str(row['link']).strip(),
                    'sum_min': int(row['sum_min']),
                    'sum_max': int(row['sum_max']),
                    'term_min': int(row['term_min']),
                    'term_max': int(row['term_max']),
                    'approval_chance': int(row['approval_chance']),
                    'payout_speed_hours': float(row['payout_speed_hours']),
                }
                
                # Добавляем опциональные поля
                if 'logo_url' in df.columns and pd.notna(row['logo_url']):
                    mfo_data['logo_url'] = str(row['logo_url']).strip()
                
                if 'rate' in df.columns and pd.notna(row['rate']):
                    mfo_data['rate'] = float(row['rate'])
                
                if 'requirements' in df.columns and pd.notna(row['requirements']):
                    mfo_data['requirements'] = str(row['requirements']).strip()
                
                if 'get_methods' in df.columns and pd.notna(row['get_methods']):
                    mfo_data['get_methods'] = str(row['get_methods']).strip()
                
                if 'repay_methods' in df.columns and pd.notna(row['repay_methods']):
                    mfo_data['repay_methods'] = str(row['repay_methods']).strip()
                
                # Проверяем, существует ли МФО с таким именем
                existing_mfo = MFO.objects.filter(name=mfo_data['name']).first()
                
                if existing_mfo:
                    # Обновляем существующее МФО
                    for key, value in mfo_data.items():
                        setattr(existing_mfo, key, value)
                    existing_mfo.save()
                    updated_count += 1
                else:
                    # Создаем новое МФО
                    MFO.objects.create(**mfo_data)
                    created_count += 1
                    
            except Exception as e:
                errors.append({
                    'row': index + 2,  # +2 потому что Excel начинается с 1, а у нас есть заголовок
                    'error': str(e)
                })
        
        return Response({
            'success': True,
            'message': f'Обработка завершена. Создано: {created_count}, Обновлено: {updated_count}',
            'created_count': created_count,
            'updated_count': updated_count,
            'errors': errors,
            'total_processed': len(df)
        })
        
    except Exception as e:
        return Response({
            'success': False,
            'error': f'Ошибка обработки файла: {str(e)}',
            'traceback': traceback.format_exc()
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([AllowAny])
def mfo_template(request):
    """
    Получение шаблона Excel файла для загрузки МФО
    """
    try:
        # Создаем шаблон с примерами данных
        template_data = {
            'name': ['Пример МФО 1', 'Пример МФО 2'],
            'logo_url': ['https://example.com/logo1.png', 'https://example.com/logo2.png'],
            'link': ['https://example.com/mfo1', 'https://example.com/mfo2'],
            'sum_min': [1000, 2000],
            'sum_max': [30000, 50000],
            'term_min': [7, 14],
            'term_max': [30, 60],
            'rate': [1.5, 2.0],
            'approval_chance': [85, 90],
            'payout_speed_hours': [1.0, 2.0],
            'requirements': ['Паспорт; СНИЛС', 'Паспорт; СНИЛС; Справка о доходах'],
            'get_methods': ['На карту; Наличными', 'На карту; Электронные кошельки'],
            'repay_methods': ['Банковская карта; Наличные', 'Банковская карта; Электронные кошельки']
        }
        
        df = pd.DataFrame(template_data)
        
        # Создаем Excel файл в памяти
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, sheet_name='МФО', index=False)
        
        output.seek(0)
        
        response = HttpResponse(
            output.getvalue(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = 'attachment; filename="mfo_template.xlsx"'
        
        return response
        
    except Exception as e:
        return Response({
            'success': False,
            'error': f'Ошибка создания шаблона: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([AllowAny])
@ratelimit(key='ip', rate='50/h', method='POST')
def user_register(request):
    """
    Регистрация или обновление пользователя VK Mini App
    
    Ожидаемые данные:
    {
        "user_data": {
            "id": 123456789,
            "first_name": "Иван",
            "last_name": "Иванов",
            "sex": 2,
            "city": {"title": "Москва"},
            ...
        },
        "utm_params": {
            "utm_source": "vk_ads",
            "utm_campaign": "spring_2025",
            ...
        },
        "notifications_allowed": true
    }
    """
    try:
        data = request.data
        user_data = data.get('user_data', {})
        utm_params = data.get('utm_params', {})
        
        # Регистрируем или обновляем пользователя
        user = register_or_update_user(user_data, utm_params)
        
        # Статус подписки теперь обновляется ТОЛЬКО через user_allow_notifications
        # чтобы избежать случайного сброса.

        return Response({
            'success': True,
            'message': 'Пользователь успешно зарегистрирован',
            'user': {
                'id': user.id,
                'vk_user_id': user.vk_user_id,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'notifications_enabled': user.notifications_enabled,
                'notifications_allowed': user.notifications_allowed,
                'total_visits': user.total_visits,
            }
        })
        
    except Exception as e:
        return Response({
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
@ratelimit(key='ip', rate='30/h', method='POST')
def user_allow_notifications(request):
    """
    Обновление статуса разрешения уведомлений
    """
    try:
        vk_user_id = request.data.get('vk_user_id')
        allowed = True
        
        logger.info(f"--- PUSH NOTIFICATION SUBSCRIBE ATTEMPT for user_id: {vk_user_id} ---")

        if not vk_user_id:
            logger.warning("[PUSH] vk_user_id is missing from request.")
            return Response({
                'success': False,
                'error': 'vk_user_id обязателен'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Находим пользователя
        try:
            user = VKUser.objects.get(vk_user_id=vk_user_id)
            logger.info(f"[PUSH] User found: {user}. Current 'notifications_allowed' status: {user.notifications_allowed}")

            user.notifications_allowed = allowed
            user.save()

            updated_user = VKUser.objects.get(vk_user_id=vk_user_id)
            logger.info(f"[PUSH] 'notifications_allowed' status AFTER save: {updated_user.notifications_allowed}")
            
            return Response({
                'success': True,
                'message': f'Уведомления {"разрешены" if allowed else "запрещены"}',
                'notifications_allowed': user.notifications_allowed
            })
            
        except VKUser.DoesNotExist:
            logger.error(f"[PUSH] User with vk_user_id {vk_user_id} not found in database.")
            return Response({
                'success': False,
                'error': 'Пользователь не найден'
            }, status=status.HTTP_404_NOT_FOUND)
            
    except Exception as e:
        logger.exception(f"[PUSH] An exception occurred in user_allow_notifications for user {vk_user_id}")
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([AllowAny])
def user_status(request):
    """
    Получение статуса пользователя
    
    GET параметры:
    ?vk_user_id=123456789
    """
    try:
        vk_user_id = request.query_params.get('vk_user_id')
        
        logger.info(f"--- USER STATUS CHECK for user_id: {vk_user_id} ---")

        if not vk_user_id:
            return Response({
                'success': False,
                'error': 'vk_user_id обязателен'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            user = VKUser.objects.get(vk_user_id=vk_user_id)
            
            logger.info(f"[STATUS] User found: {user}. Sending 'notifications_allowed' status: {user.notifications_allowed}")

            return Response({
                'success': True,
                'user': {
                    'id': user.id,
                    'vk_user_id': user.vk_user_id,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                    'notifications_enabled': user.notifications_enabled,
                    'notifications_allowed': user.notifications_allowed,
                    'total_visits': user.total_visits,
                    'first_visit': user.first_visit.isoformat(),
                    'last_visit': user.last_visit.isoformat(),
                }
            })
            
        except VKUser.DoesNotExist:
            logger.warning(f"[STATUS] User with vk_user_id {vk_user_id} not found during status check.")
            return Response({
                'success': False,
                'error': 'Пользователь не найден'
            }, status=status.HTTP_404_NOT_FOUND)
            
    except Exception as e:
        logger.exception(f"Ошибка в user_status: {e}")
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def push_click_track(request):
    """
    Отслеживание клика по пуш-уведомлению
    
    POST данные:
    {
        "vk_user_id": 123456789,
        "notification_id": 1
    }
    """
    try:
        vk_user_id = request.data.get('vk_user_id')
        notification_id = request.data.get('notification_id')
        
        if not vk_user_id or not notification_id:
            return Response({
                'success': False,
                'error': 'vk_user_id и notification_id обязательны'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Находим лог отправки
        try:
            user = VKUser.objects.get(vk_user_id=vk_user_id)
            notification = PushNotification.objects.get(id=notification_id)
            
            # Находим лог
            push_log = PushLog.objects.filter(
                notification=notification,
                user=user
            ).order_by('-sent_at').first()
            
            if push_log:
                # Обновляем статус и время клика
                push_log.status = 'clicked'
                push_log.clicked_at = timezone.now()
                push_log.save()
                
                # Обновляем счетчик кликов в уведомлении
                notification.total_clicked += 1
                notification.save()
                
                return Response({
                    'success': True,
                    'message': 'Клик зарегистрирован'
                })
            else:
                return Response({
                    'success': False,
                    'error': 'Лог отправки не найден'
                }, status=status.HTTP_404_NOT_FOUND)
                
        except (VKUser.DoesNotExist, PushNotification.DoesNotExist) as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_404_NOT_FOUND)
            
    except Exception as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([AllowAny])
def users_stats(request):
    """
    Статистика по пользователям
    """
    try:
        from datetime import timedelta
        
        total_users = VKUser.objects.count()
        active_users = VKUser.objects.filter(
            last_visit__gte=timezone.now() - timedelta(days=7)
        ).count()
        new_users = VKUser.objects.filter(
            first_visit__gte=timezone.now() - timedelta(days=3)
        ).count()
        notifications_allowed = VKUser.objects.filter(
            notifications_allowed=True,
            notifications_enabled=True
        ).count()
        
        subscription_rate = round((notifications_allowed / total_users * 100) if total_users > 0 else 0, 2)
        
        return Response({
            'success': True,
            'stats': {
                'total_users': total_users,
                'active_users_7d': active_users,
                'new_users_3d': new_users,
                'subscribed_users': notifications_allowed,
                'subscription_rate': subscription_rate
            }
        })
        
    except Exception as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
@ratelimit(key='ip', rate='100/h', method='POST')
def send_to_leads_tech(request):
    """
    Отправляет данные пользователя и UTM метки в систему арбитражника leads.tech
    """
    try:
        data = request.data
        
        # Получаем IP адрес пользователя
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip_address = x_forwarded_for.split(',')[0]
        else:
            ip_address = request.META.get('REMOTE_ADDR', '')
        
        # Подготавливаем данные для leads.tech
        leads_tech_data = {
            'user_id': data.get('user_id', ''),
            'first_name': data.get('first_name', ''),
            'last_name': data.get('last_name', ''),
            'email': data.get('email', ''),
            'phone': data.get('phone', ''),
            'utm_source': data.get('utm_source', ''),
            'utm_medium': data.get('utm_medium', ''),
            'utm_campaign': data.get('utm_campaign', ''),
            'utm_content': data.get('utm_content', ''),
            'utm_term': data.get('utm_term', ''),
            'vk_user_id': data.get('vk_user_id', ''),
            'vk_ad_id': data.get('vk_ad_id', ''),
            'vk_ref': data.get('vk_ref', ''),
            'vk_ref_source': data.get('vk_ref_source', ''),
            'vk_platform': data.get('vk_platform', ''),
            'click_id': data.get('click_id', ''),
            'sub_id': data.get('sub_id', ''),
            's1': data.get('s1', ''),
            's2': data.get('s2', ''),
            's3': data.get('s3', ''),
            's4': data.get('s4', ''),
            's5': data.get('s5', ''),
            's6': data.get('s6', ''),
            's7': data.get('s7', ''),
            's8': data.get('s8', ''),
            'timestamp': data.get('timestamp', ''),
            'url': data.get('url', ''),
            'referrer': data.get('referrer', ''),
            'user_agent': data.get('user_agent', ''),
            'ip_address': ip_address,
        }
        
        # Параметры для leads.tech (формат офферов)
        # Поддерживаем стандартные VK параметры И старый формат для обратной совместимости
        # Приоритет: campaign_id/banner_id (VK стандарт) → ref/ref_source (старый формат)
        leads_tech_params = {
            's4': (data.get('s4') or 
                   data.get('campaign_id') or  # VK стандарт: {{campaign_id}}
                   data.get('utm_campaign') or  # Стандартный UTM
                   data.get('ref') or           # Старый формат
                   data.get('vk_ref') or ''),
            's5': (data.get('s5') or 
                   data.get('banner_id') or     # VK стандарт: {{banner_id}}
                   data.get('utm_content') or   # Стандартный UTM
                   data.get('ref_source') or    # Старый формат
                   data.get('vk_ref_source') or ''),
            's6': (data.get('s6') or 
                   data.get('user_id') or       # Основной ID
                   data.get('utm_term') or      # VK может передать в utm_term
                   data.get('vk_user_id') or ''),
        }
        
        # Логируем все входящие данные для отладки
        logger.info(f"🔍 [Leads.Tech] Входящие данные: {data}")
        
        # Логируем параметры для отладки
        logger.info(f"🔍 [Leads.Tech] Параметры: {leads_tech_params}")
        
        # Реальная интеграция с leads.tech
        try:
            import requests
            
            offer_id = data.get('offer_id')
            leads_tech_url = "https://безотказа.бабкиманки.рф/Eg5hd"

            if offer_id:
                try:
                    mfo = MFO.objects.get(id=offer_id)
                    leads_tech_url = mfo.link
                    logger.info(f"✅ [Leads.Tech] Используем прямую ссылку для MFO ID {offer_id}: {leads_tech_url}")
                except MFO.DoesNotExist:
                    logger.warning(f"⚠️ [Leads.Tech] MFO с ID {offer_id} не найдено. Используем fallback URL.")
            else:
                logger.warning("⚠️ [Leads.Tech] offer_id не предоставлен. Используем fallback URL.")
                
            # ВАЖНО: Заменяем плейсхолдеры {ref}, {ref_source}, {user_id} на реальные значения
            # Это нужно, чтобы в URL не было дублирования параметров
            # ФИНАЛЬНОЕ ИСПРАВЛЕНИЕ: приводим все значения к строке перед заменой
            leads_tech_url = leads_tech_url.replace('{ref}', str(leads_tech_params.get('s4', '')))
            leads_tech_url = leads_tech_url.replace('{ref_source}', str(leads_tech_params.get('s5', '')))
            leads_tech_url = leads_tech_url.replace('{user_id}', str(leads_tech_params.get('s6', '')))
            
            # Очистка пустых параметров после замены плейсхолдеров
            # Удаляем параметры вида &param= или ?param=
            import re
            leads_tech_url = re.sub(r'[&?]\w+=$', '', leads_tech_url)  # в конце
            leads_tech_url = re.sub(r'[&?]\w+=[&]', '&', leads_tech_url)  # в середине
            leads_tech_url = re.sub(r'\?&', '?', leads_tech_url)  # ?& -> ?
            leads_tech_url = re.sub(r'&&+', '&', leads_tech_url)  # && -> &
            leads_tech_url = re.sub(r'[?&]$', '', leads_tech_url)  # удаляем ? или & в конце
                
            # Если после замены плейсхолдеров нужно добавить дополнительные параметры
            # (когда в leads_tech_params есть значения, но их нет в базовой ссылке)
            params_to_add = []
            for key, value in leads_tech_params.items():
                if value and key not in leads_tech_url:
                    params_to_add.append(f"{key}={str(value)}") # Приводим к строке
            
            if params_to_add:
                separator = "&" if "?" in leads_tech_url else "?"
                leads_tech_url = leads_tech_url + separator + "&".join(params_to_add)
            
            leads_tech_params_url = leads_tech_url
            
            logger.info(f"🔗 [Leads.Tech] Отправляем в leads.tech: {leads_tech_params_url}")
            
            leads_tech_response = requests.get(
                leads_tech_params_url,
                timeout=10,
                headers={
                    'User-Agent': data.get('user_agent', ''),
                    'Referer': data.get('referrer', ''),
                }
            )
            
            if leads_tech_response.status_code == 200:
                logger.info(f"✅ [Leads.Tech] Успешно отправлено: {leads_tech_response.status_code}")
            else:
                logger.error(f"⚠️ [Leads.Tech] Ошибка: {leads_tech_response.status_code} - {leads_tech_response.text}")
            
        except requests.exceptions.RequestException as leads_error:
            logger.error(f"⚠️ [Leads.Tech] Ошибка соединения: {leads_error}")
        
        # Сохраняем в UTMTracking для аналитики
        utm_tracking = UTMTracking.objects.create(
            user_id=str(data.get('user_id', '')),
            utm_source=data.get('utm_source', ''),
            utm_medium=data.get('utm_medium', ''),
            utm_campaign=data.get('utm_campaign', ''),
            utm_content=data.get('utm_content', ''),
            utm_term=data.get('utm_term', ''),
            vk_ad_id=data.get('vk_ad_id', ''),
            vk_ref=data.get('vk_ref', ''),
            vk_ref_source=data.get('vk_ref_source', ''),
            vk_platform=data.get('vk_platform', ''),
            url=data.get('url', ''),
            referrer=data.get('referrer', ''),
            user_agent=data.get('user_agent', ''),
            full_utm_data=data,
            full_user_data=data,
            event_type='arbitrage_send'
        )
        
        logger.info(f"✅ [Leads.Tech] Сохранено в UTMTracking с ID: {utm_tracking.id}")
        
        return Response({
            'success': True,
            'message': 'Данные отправлены в leads.tech',
            'tracking_id': utm_tracking.id,
            'leads_tech_data': leads_tech_data,
            'leads_tech_params': leads_tech_params,
            'leads_tech_url': leads_tech_params_url if 'leads_tech_params_url' in locals() else None,
            'timestamp': utm_tracking.timestamp.isoformat()
        })
        
    except Exception as e:
        logger.exception("Непредвиденная ошибка в send_to_leads_tech")
        return Response({
            'success': False,
            'error': 'Internal Server Error'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
from django.contrib import admin
from django.utils.html import format_html
from django.urls import path
from django.shortcuts import redirect
from django.contrib import messages
from django.http import HttpResponse
from .models import MFO, Offer, VKUser, PushNotification, PushLog, PushCampaign, PushTemplate, SentPush, GlobalSettings

# Убираем регистрацию Offer из админки
# @admin.register(Offer)
# class OfferAdmin(admin.ModelAdmin):
#     list_display = ('name', 'ref_source', 'ref', 'base_url')
#     list_editable = ('ref_source', 'ref')
#     search_fields = ('name', 'ref_source', 'ref')
#     ordering = ('name',)
#     
#     fields = ('name', 'base_url', 'ref_source', 'ref')

# Улучшенная админка МФО с подробными параметрами
@admin.register(MFO)
class MFOAdmin(admin.ModelAdmin):
    list_display = ('name', 'rate', 'approval_chance', 'sum_min', 'sum_max', 'term_min', 'term_max', 'payout_speed_hours')
    list_editable = ('rate', 'approval_chance', 'payout_speed_hours')
    search_fields = ('name', 'requirements', 'get_methods', 'repay_methods')
    ordering = ('-approval_chance', 'name')
    list_filter = ('rate', 'approval_chance', 'payout_speed_hours')
    
    # Группируем поля по категориям
    fieldsets = (
        ('Основная информация', {
            'fields': ('name', 'logo_url', 'link')
        }),
        ('Финансовые параметры', {
            'fields': ('sum_min', 'sum_max', 'term_min', 'term_max', 'rate'),
            'description': 'Настройте лимиты сумм, сроков и процентную ставку'
        }),
        ('Параметры одобрения', {
            'fields': ('approval_chance', 'payout_speed_hours'),
            'description': 'Шанс одобрения и скорость выплаты влияют на сортировку'
        }),
        ('Дополнительная информация', {
            'fields': ('requirements', 'get_methods', 'repay_methods'),
            'description': 'Требования и способы получения/погашения (через точку с запятой)',
            'classes': ('collapse',)
        }),
    )
    
    # Добавляем подсказки для полей
    help_texts = {
        'rate': 'Процентная ставка за день (0% для акций)',
        'approval_chance': 'Шанс одобрения в процентах (влияет на сортировку)',
        'payout_speed_hours': 'Время до получения денег в часах (0.1 = 6 минут, 0.5 = 30 минут)',
        'requirements': 'Требования к заемщику через точку с запятой',
        'get_methods': 'Способы получения денег через точку с запятой',
        'repay_methods': 'Способы погашения через точку с запятой',
    }


@admin.register(VKUser)
class VKUserAdmin(admin.ModelAdmin):
    list_display = ('vk_user_id', 'full_name', 'city', 'sex_display', 'notifications_status', 'messages_status', 'last_visit', 'total_visits', 'utm_source')
    list_filter = ('notifications_enabled', 'notifications_allowed', 'messages_allowed', 'sex', 'city', 'utm_source', 'first_visit', 'last_visit')
    search_fields = ('vk_user_id', 'first_name', 'last_name', 'city', 'utm_source', 'utm_campaign')
    readonly_fields = ('vk_user_id', 'first_visit', 'total_visits', 'extra_data_display')
    ordering = ['-last_visit']
    date_hierarchy = 'first_visit'
    
    fieldsets = (
        ('Основная информация', {
            'fields': ('vk_user_id', 'first_name', 'last_name', 'sex', 'bdate')
        }),
        ('Геолокация', {
            'fields': ('city', 'country')
        }),
        ('Настройки уведомлений', {
            'fields': ('notifications_enabled', 'notifications_allowed'),
            'description': 'Управление возможностью отправки уведомлений пользователю'
        }),
        ('Настройки сообщений', {
            'fields': ('messages_allowed',),
            'description': 'Разрешение на отправку сообщений от имени сообщества'
        }),
        ('Активность', {
            'fields': ('first_visit', 'last_visit', 'total_visits'),
            'classes': ('collapse',)
        }),
        ('UTM метки', {
            'fields': ('utm_source', 'utm_campaign', 'utm_content'),
            'classes': ('collapse',)
        }),
        ('Дополнительно', {
            'fields': ('extra_data_display',),
            'classes': ('collapse',)
        }),
    )
    
    def full_name(self, obj):
        return f"{obj.first_name} {obj.last_name}".strip() or "—"
    full_name.short_description = "Имя"
    
    def sex_display(self, obj):
        if obj.sex == 1:
            return "👩 Ж"
        elif obj.sex == 2:
            return "👨 М"
        return "—"
    sex_display.short_description = "Пол"
    
    def notifications_status(self, obj):
        if obj.notifications_enabled and obj.notifications_allowed:
            return format_html('<span style="color: green;">✅ Активны</span>')
        elif obj.notifications_enabled:
            return format_html('<span style="color: orange;">⚠️ Не разрешены в VK</span>')
        return format_html('<span style="color: red;">❌ Отключены</span>')
    notifications_status.short_description = "Уведомления"
    
    def messages_status(self, obj):
        if obj.messages_allowed:
            return format_html('<span style="color: green;">✅ Разрешены</span>')
        return format_html('<span style="color: red;">❌ Запрещены</span>')
    messages_status.short_description = "Сообщения"
    
    def extra_data_display(self, obj):
        import json
        return format_html('<pre>{}</pre>', json.dumps(obj.extra_data, indent=2, ensure_ascii=False))
    extra_data_display.short_description = "Дополнительные данные"
    
    actions = ['enable_notifications', 'disable_notifications']
    
    def enable_notifications(self, request, queryset):
        updated = queryset.update(notifications_enabled=True)
        self.message_user(request, f"Уведомления включены для {updated} пользователей", messages.SUCCESS)
    enable_notifications.short_description = "✅ Включить уведомления"
    
    def disable_notifications(self, request, queryset):
        updated = queryset.update(notifications_enabled=False)
        self.message_user(request, f"Уведомления отключены для {updated} пользователей", messages.WARNING)
    disable_notifications.short_description = "❌ Отключить уведомления"


@admin.register(PushNotification)
class PushNotificationAdmin(admin.ModelAdmin):
    list_display = ('title', 'status', 'segment', 'total_sent', 'total_delivered', 'created_at')
    list_filter = ('status', 'segment', 'created_at')
    search_fields = ('title', 'message')
    readonly_fields = ('total_sent', 'total_delivered', 'total_failed', 'total_clicked', 'sent_at', 'created_at', 'updated_at')
    filter_horizontal = ('target_users',)
    ordering = ['-created_at']
    
    actions = ['send_now', 'duplicate_notification']
    
    def send_now(self, request, queryset):
        """Отправить уведомления немедленно"""
        success_count = 0
        error_count = 0
        
        for notification in queryset:
            if notification.status in ['draft', 'scheduled']:
                # Импортируем и вызываем функцию отправки
                from .services import send_push_notification
                try:
                    stats = send_push_notification(notification.id)
                    success_count += 1
                    self.message_user(
                        request, 
                        f'✅ "{notification.title}": отправлено {stats.get("sent", 0)}, доставлено {stats.get("delivered", 0)}, ошибок {stats.get("failed", 0)}',
                        messages.SUCCESS
                    )
                except Exception as e:
                    error_count += 1
                    self.message_user(request, f'❌ Ошибка "{notification.title}": {str(e)}', messages.ERROR)
            else:
                self.message_user(request, f'⚠️ "{notification.title}" уже отправлено', messages.WARNING)
        
        if success_count > 0:
            self.message_user(request, f'🎉 Успешно отправлено уведомлений: {success_count}', messages.SUCCESS)
        if error_count > 0:
            self.message_user(request, f'❌ Ошибок при отправке: {error_count}', messages.ERROR)
    
    send_now.short_description = "📤 Отправить сейчас"
    
    def duplicate_notification(self, request, queryset):
        """Дублировать уведомление"""
        for notification in queryset:
            notification.pk = None
            notification.status = 'draft'
            notification.title = f"{notification.title} (копия)"
            notification.total_sent = 0
            notification.total_delivered = 0
            notification.total_failed = 0
            notification.total_clicked = 0
            notification.sent_at = None
            notification.save()
        self.message_user(request, f"Создано копий: {queryset.count()}", messages.SUCCESS)
    duplicate_notification.short_description = "📋 Дублировать"


@admin.register(PushLog)
class PushLogAdmin(admin.ModelAdmin):
    list_display = ('notification', 'user_info', 'status_badge', 'sent_at', 'clicked_at')
    list_filter = ('status', 'sent_at', 'notification')
    search_fields = ('notification__title', 'user__vk_user_id', 'user__first_name', 'user__last_name')
    readonly_fields = ('notification', 'user', 'status', 'sent_at', 'clicked_at', 'vk_response_display', 'error_message')
    ordering = ['-sent_at']
    date_hierarchy = 'sent_at'
    
    def user_info(self, obj):
        return f"{obj.user.first_name} {obj.user.last_name} (VK ID: {obj.user.vk_user_id})"
    user_info.short_description = "Пользователь"
    
    def status_badge(self, obj):
        colors = {
            'sent': 'blue',
            'delivered': 'green',
            'failed': 'red',
            'clicked': 'purple',
        }
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 10px; border-radius: 3px;">{}</span>',
            colors.get(obj.status, 'gray'),
            obj.get_status_display()
        )
    status_badge.short_description = "Статус"
    
    def vk_response_display(self, obj):
        import json
        return format_html('<pre>{}</pre>', json.dumps(obj.vk_response, indent=2, ensure_ascii=False))
    vk_response_display.short_description = "Ответ VK API"
    
    def has_add_permission(self, request):
        return False  # Логи создаются автоматически


# ============================================
# АДМИНКА ДЛЯ НОВОЙ СИСТЕМЫ РАССЫЛОК
# ============================================

class PushTemplateInline(admin.TabularInline):
    """Инлайн для шаблонов пушей в рассылке"""
    model = PushTemplate
    extra = 1
    fields = ('title', 'message', 'action_url', 'order')
    ordering = ('order', 'id')


@admin.register(PushCampaign)
class PushCampaignAdmin(admin.ModelAdmin):
    """Админка для рассылок пуш-уведомлений"""
    list_display = ('name', 'status_badge', 'schedule_type_display', 'next_send_time', 'total_sent', 'total_delivered', 'created_at')
    list_filter = ('status', 'schedule_type', 'created_at')
    search_fields = ('name', 'description')
    readonly_fields = ('total_sent', 'total_delivered', 'total_failed', 'started_at', 'completed_at', 'created_at', 'updated_at', 'next_send_time')
    filter_horizontal = ('target_users',)
    ordering = ['-created_at']
    date_hierarchy = 'created_at'
    
    fieldsets = (
        ('Основная информация', {
            'fields': ('name', 'description', 'status')
        }),
        ('Расписание', {
            'fields': ('schedule_type', 'schedule_time', 'schedule_date', 'schedule_days', 'schedule_day_of_month'),
            'description': 'Настройте расписание отправки рассылки'
        }),
        ('Таргетинг', {
            'fields': ('segment', 'target_users', 'filter_city', 'filter_sex', 'filter_utm_source'),
            'description': 'Выберите целевую аудиторию для рассылки'
        }),
        ('Лимиты', {
            'fields': ('max_sends_per_day', 'total_sends_limit'),
            'classes': ('collapse',)
        }),
        ('Статистика', {
            'fields': ('total_sent', 'total_delivered', 'total_failed'),
            'classes': ('collapse',)
        }),
        ('Даты', {
            'fields': ('started_at', 'completed_at', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    inlines = [PushTemplateInline]
    
    actions = ['activate_campaign', 'pause_campaign', 'send_now_campaign']
    
    def status_badge(self, obj):
        colors = {
            'draft': 'gray',
            'active': 'green',
            'paused': 'orange',
            'completed': 'blue',
        }
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 10px; border-radius: 3px;">{}</span>',
            colors.get(obj.status, 'gray'),
            obj.get_status_display()
        )
    status_badge.short_description = "Статус"
    
    def schedule_type_display(self, obj):
        schedule_names = {
            'once': '📅 Разовая',
            'daily': '🔄 Ежедневно',
            'weekly': '📆 Еженедельно',
            'monthly': '🗓️ Ежемесячно',
            'custom': '⚙️ Произвольное',
        }
        return schedule_names.get(obj.schedule_type, obj.schedule_type)
    schedule_type_display.short_description = "Расписание"
    
    def next_send_time(self, obj):
        if obj.status != 'active':
            return "—"
        next_time = obj.get_next_send_time()
        if next_time:
            return next_time.strftime('%d.%m.%Y %H:%M')
        return "Не запланировано"
    next_send_time.short_description = "Следующая отправка"
    
    def activate_campaign(self, request, queryset):
        """Активировать рассылку"""
        count = 0
        for campaign in queryset:
            if campaign.status == 'draft':
                campaign.status = 'active'
                if not campaign.started_at:
                    from django.utils import timezone
                    campaign.started_at = timezone.now()
                campaign.save()
                count += 1
        self.message_user(request, f"Активировано рассылок: {count}", messages.SUCCESS)
    activate_campaign.short_description = "▶️ Активировать"
    
    def pause_campaign(self, request, queryset):
        """Приостановить рассылку"""
        updated = queryset.update(status='paused')
        self.message_user(request, f"Приостановлено рассылок: {updated}", messages.WARNING)
    pause_campaign.short_description = "⏸️ Приостановить"
    
    def send_now_campaign(self, request, queryset):
        """Отправить рассылку немедленно"""
        from .services import send_campaign_push
        success_count = 0
        error_count = 0
        
        for campaign in queryset:
            if campaign.status == 'active' and campaign.templates.exists():
                try:
                    stats = send_campaign_push(campaign.id)
                    success_count += 1
                    self.message_user(
                        request,
                        f'✅ "{campaign.name}": отправлено {stats.get("sent", 0)}, доставлено {stats.get("delivered", 0)}, ошибок {stats.get("failed", 0)}',
                        messages.SUCCESS
                    )
                except Exception as e:
                    error_count += 1
                    self.message_user(request, f'❌ Ошибка "{campaign.name}": {str(e)}', messages.ERROR)
            else:
                self.message_user(request, f'⚠️ "{campaign.name}": рассылка не активна или нет шаблонов', messages.WARNING)
        
        if success_count > 0:
            self.message_user(request, f'🎉 Успешно отправлено рассылок: {success_count}', messages.SUCCESS)
    send_now_campaign.short_description = "📤 Отправить сейчас"


@admin.register(PushTemplate)
class PushTemplateAdmin(admin.ModelAdmin):
    """Админка для шаблонов пушей"""
    list_display = ('title', 'campaign', 'order', 'times_used', 'created_at')
    list_filter = ('campaign', 'created_at')
    search_fields = ('title', 'message', 'campaign__name')
    readonly_fields = ('times_used', 'created_at')
    ordering = ['campaign', 'order', 'id']
    
    fieldsets = (
        ('Основная информация', {
            'fields': ('campaign', 'title', 'message')
        }),
        ('Действие', {
            'fields': ('action_url', 'action_type')
        }),
        ('Настройки', {
            'fields': ('order', 'times_used')
        }),
        ('Даты', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        }),
    )


@admin.register(SentPush)
class SentPushAdmin(admin.ModelAdmin):
    """Админка для истории отправленных пушей"""
    list_display = ('title', 'campaign', 'user_info', 'status_badge', 'sent_at', 'clicked_at')
    list_filter = ('status', 'campaign', 'sent_at')
    search_fields = ('title', 'message', 'user__vk_user_id', 'user__first_name', 'user__last_name', 'campaign__name')
    readonly_fields = ('campaign', 'template', 'user', 'title', 'message', 'action_url', 'status', 'error_message', 'sent_at', 'clicked_at', 'vk_response_display')
    ordering = ['-sent_at']
    date_hierarchy = 'sent_at'
    
    fieldsets = (
        ('Основная информация', {
            'fields': ('campaign', 'template', 'user')
        }),
        ('Содержание', {
            'fields': ('title', 'message', 'action_url')
        }),
        ('Статус', {
            'fields': ('status', 'error_message')
        }),
        ('Временные метки', {
            'fields': ('sent_at', 'clicked_at')
        }),
        ('Ответ VK API', {
            'fields': ('vk_response_display',),
            'classes': ('collapse',)
        }),
    )
    
    def user_info(self, obj):
        return f"{obj.user.first_name} {obj.user.last_name} (VK ID: {obj.user.vk_user_id})"
    user_info.short_description = "Пользователь"
    
    def status_badge(self, obj):
        colors = {
            'sent': 'blue',
            'delivered': 'green',
            'failed': 'red',
            'clicked': 'purple',
        }
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 10px; border-radius: 3px;">{}</span>',
            colors.get(obj.status, 'gray'),
            obj.get_status_display()
        )
    status_badge.short_description = "Статус"
    
    def vk_response_display(self, obj):
        import json
        return format_html('<pre>{}</pre>', json.dumps(obj.vk_response, indent=2, ensure_ascii=False))
    vk_response_display.short_description = "Ответ VK API"
    
    def has_add_permission(self, request):
        return False  # Отправленные пуши создаются автоматически
    
    def has_change_permission(self, request, obj=None):
        return False  # Отправленные пуши нельзя изменять


@admin.register(GlobalSettings)
class GlobalSettingsAdmin(admin.ModelAdmin):
    list_display = ('external_api_url',)
    
    def has_add_permission(self, request):
        # Разрешаем создать только один объект
        if self.model.objects.exists():
            return False
        return super().has_add_permission(request)

    def has_delete_permission(self, request, obj=None):
        # Запрещаем удалять настройки
        return False


from django.contrib import admin
from django.utils.html import format_html
from django.urls import path
from django.shortcuts import redirect
from django.contrib import messages
from django.http import HttpResponse
from .models import MFO, Offer, VKUser, PushNotification, PushLog

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
    list_display = ('vk_user_id', 'full_name', 'city', 'sex_display', 'notifications_status', 'last_visit', 'total_visits', 'utm_source')
    list_filter = ('notifications_enabled', 'notifications_allowed', 'sex', 'city', 'utm_source', 'first_visit', 'last_visit')
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

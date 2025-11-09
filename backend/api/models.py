from django.db import models
from urllib.parse import urlencode
from django.utils import timezone
import json

# Create your models here.

class VKUser(models.Model):
    """
    Модель для хранения пользователей VK Mini App
    """
    vk_user_id = models.BigIntegerField(unique=True, verbose_name="VK ID пользователя")
    first_name = models.CharField(max_length=100, blank=True, verbose_name="Имя")
    last_name = models.CharField(max_length=100, blank=True, verbose_name="Фамилия")
    
    # Данные для сегментации
    city = models.CharField(max_length=100, blank=True, verbose_name="Город")
    country = models.CharField(max_length=100, blank=True, verbose_name="Страна")
    sex = models.IntegerField(null=True, blank=True, verbose_name="Пол (1-женский, 2-мужской)")
    bdate = models.CharField(max_length=20, blank=True, verbose_name="Дата рождения")
    
    # Настройки уведомлений
    notifications_enabled = models.BooleanField(default=True, verbose_name="Уведомления разрешены")
    notifications_allowed = models.BooleanField(default=False, verbose_name="Пользователь разрешил уведомления в VK")
    
    # Данные активности
    first_visit = models.DateTimeField(auto_now_add=True, verbose_name="Первый визит")
    last_visit = models.DateTimeField(auto_now=True, verbose_name="Последний визит")
    total_visits = models.IntegerField(default=1, verbose_name="Всего визитов")
    
    # UTM данные первого визита (для аналитики)
    utm_source = models.CharField(max_length=200, blank=True, verbose_name="UTM Source")
    utm_campaign = models.CharField(max_length=200, blank=True, verbose_name="UTM Campaign")
    utm_content = models.CharField(max_length=200, blank=True, verbose_name="UTM Content")
    
    # Дополнительные данные
    extra_data = models.JSONField(default=dict, blank=True, verbose_name="Дополнительные данные")
    
    def __str__(self):
        if self.first_name or self.last_name:
            return f"{self.first_name} {self.last_name} (VK ID: {self.vk_user_id})"
        return f"VK User {self.vk_user_id}"
    
    class Meta:
        verbose_name = "Пользователь VK"
        verbose_name_plural = "Пользователи VK"
        ordering = ['-last_visit']


class PushNotification(models.Model):
    """
    Модель для создания и управления пуш-уведомлениями
    """
    STATUS_CHOICES = [
        ('draft', 'Черновик'),
        ('scheduled', 'Запланировано'),
        ('sending', 'Отправляется'),
        ('sent', 'Отправлено'),
        ('failed', 'Ошибка'),
    ]
    
    SEGMENT_CHOICES = [
        ('all', 'Все пользователи'),
        ('active', 'Активные (были за последние 7 дней)'),
        ('inactive', 'Неактивные (не были более 7 дней)'),
        ('new', 'Новые (зарегистрированы за последние 3 дня)'),
        ('custom', 'Выборочная сегментация'),
    ]
    
    title = models.CharField(max_length=100, verbose_name="Заголовок уведомления")
    message = models.TextField(max_length=500, verbose_name="Текст сообщения")
    
    # Настройки таргетинга
    segment = models.CharField(max_length=20, choices=SEGMENT_CHOICES, default='all', verbose_name="Сегмент")
    target_users = models.ManyToManyField(VKUser, blank=True, verbose_name="Конкретные пользователи")
    
    # Фильтры для custom сегментации
    filter_city = models.CharField(max_length=100, blank=True, verbose_name="Фильтр по городу")
    filter_sex = models.IntegerField(null=True, blank=True, verbose_name="Фильтр по полу")
    filter_utm_source = models.CharField(max_length=200, blank=True, verbose_name="Фильтр по UTM Source")
    
    # Ссылка и действие
    action_url = models.URLField(max_length=500, blank=True, verbose_name="Ссылка при клике")
    action_type = models.CharField(max_length=50, blank=True, verbose_name="Тип действия (open_app, open_url)")
    
    # Статус и планирование
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft', verbose_name="Статус")
    scheduled_time = models.DateTimeField(null=True, blank=True, verbose_name="Время отправки")
    
    # Статистика
    total_sent = models.IntegerField(default=0, verbose_name="Отправлено")
    total_delivered = models.IntegerField(default=0, verbose_name="Доставлено")
    total_failed = models.IntegerField(default=0, verbose_name="Не доставлено")
    total_clicked = models.IntegerField(default=0, verbose_name="Переходов")
    
    # Даты
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Дата создания")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Дата изменения")
    sent_at = models.DateTimeField(null=True, blank=True, verbose_name="Дата отправки")
    
    def __str__(self):
        return f"{self.title} ({self.get_status_display()})"
    
    def get_target_users_queryset(self):
        """
        Возвращает queryset пользователей для отправки на основе сегмента и фильтров
        """
        from datetime import timedelta
        
        if self.segment == 'custom' and self.target_users.exists():
            queryset = self.target_users.all()
        else:
            queryset = VKUser.objects.filter(notifications_enabled=True, notifications_allowed=True)
        
        # Применяем сегментацию
        if self.segment == 'active':
            queryset = queryset.filter(last_visit__gte=timezone.now() - timedelta(days=7))
        elif self.segment == 'inactive':
            queryset = queryset.filter(last_visit__lt=timezone.now() - timedelta(days=7))
        elif self.segment == 'new':
            queryset = queryset.filter(first_visit__gte=timezone.now() - timedelta(days=3))
        
        # Применяем фильтры
        if self.filter_city:
            queryset = queryset.filter(city__icontains=self.filter_city)
        if self.filter_sex:
            queryset = queryset.filter(sex=self.filter_sex)
        if self.filter_utm_source:
            queryset = queryset.filter(utm_source__icontains=self.filter_utm_source)
        
        return queryset
    
    class Meta:
        verbose_name = "Пуш-уведомление"
        verbose_name_plural = "Пуш-уведомления"
        ordering = ['-created_at']


class PushLog(models.Model):
    """
    Лог отправки пуш-уведомлений
    """
    STATUS_CHOICES = [
        ('sent', 'Отправлено'),
        ('delivered', 'Доставлено'),
        ('failed', 'Ошибка'),
        ('clicked', 'Клик'),
    ]
    
    notification = models.ForeignKey(PushNotification, on_delete=models.CASCADE, related_name='logs', verbose_name="Уведомление")
    user = models.ForeignKey(VKUser, on_delete=models.CASCADE, related_name='push_logs', verbose_name="Пользователь")
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, verbose_name="Статус")
    error_message = models.TextField(blank=True, verbose_name="Сообщение об ошибке")
    
    sent_at = models.DateTimeField(auto_now_add=True, verbose_name="Дата отправки")
    clicked_at = models.DateTimeField(null=True, blank=True, verbose_name="Дата клика")
    
    # VK API response
    vk_response = models.JSONField(default=dict, blank=True, verbose_name="Ответ VK API")
    
    def __str__(self):
        return f"{self.notification.title} -> {self.user} ({self.get_status_display()})"
    
    class Meta:
        verbose_name = "Лог уведомления"
        verbose_name_plural = "Логи уведомлений"
        ordering = ['-sent_at']

class Offer(models.Model):
    """
    Модель для хранения офферов с UTM-метками для арбитража
    """
    name = models.CharField(max_length=200, verbose_name="Название оффера")
    base_url = models.URLField(max_length=500, verbose_name="Базовая ссылка")
    ref_source = models.CharField(max_length=100, verbose_name="Источник реферала (utm_content)")
    ref = models.CharField(max_length=100, verbose_name="Реферальный код (utm_campaign)")
    
    def generate_url(self, user_id):
        """
        Генерирует ссылку с UTM-метками для конкретного пользователя
        Формат: {base_url}?utm_content={ref_source}&utm_campaign={ref}&utm_term={user_id}
        """
        utm_params = {
            'utm_content': self.ref_source,
            'utm_campaign': self.ref,
            'utm_term': str(user_id)
        }
        
        # Проверяем, есть ли уже параметры в URL
        separator = '&' if '?' in self.base_url else '?'
        return f"{self.base_url}{separator}{urlencode(utm_params)}"
    
    def __str__(self):
        return self.name
    
    class Meta:
        verbose_name = "Оффер"
        verbose_name_plural = "Офферы"

class MFO(models.Model):
    name = models.CharField(max_length=100, verbose_name="Название")
    logo_url = models.URLField(max_length=200, blank=True, null=True, verbose_name="URL логотипа")
    link = models.URLField(max_length=200, verbose_name="Ссылка на оффер")
    sum_min = models.IntegerField(verbose_name="Мин. сумма")
    sum_max = models.IntegerField(verbose_name="Макс. сумма")
    term_min = models.IntegerField(verbose_name="Мин. срок (дни)")
    term_max = models.IntegerField(verbose_name="Макс. срок (дни)")
    rate = models.FloatField(verbose_name="Ставка в день (%)", null=True, blank=True, default=0) # Разрешаем быть пустым, по умолчанию 0
    approval_chance = models.IntegerField(verbose_name="Шанс одобрения (%)")
    payout_speed_hours = models.FloatField(verbose_name="Скорость выплаты (часы)")
    
    # Для полей с множественными значениями используем текстовое поле,
    # где значения будут разделяться точкой с запятой.
    requirements = models.TextField(blank=True, help_text="Перечислите через точку с запятой", verbose_name="Требования")
    get_methods = models.TextField(blank=True, help_text="Перечислите через точку с запятой", verbose_name="Способы получения")
    repay_methods = models.TextField(blank=True, help_text="Перечислите через точку с запятой", verbose_name="Способы погашения")

    def __str__(self):
        return self.name
    
    class Meta:
        verbose_name = "МФО"
        verbose_name_plural = "МФО"

class UTMTracking(models.Model):
    """
    Модель для отслеживания UTM параметров и аналитики
    """
    timestamp = models.DateTimeField(auto_now_add=True, verbose_name="Время события")
    user_id = models.CharField(max_length=100, blank=True, null=True, verbose_name="ID пользователя")
    
    # UTM параметры
    utm_source = models.CharField(max_length=200, blank=True, verbose_name="UTM Source")
    utm_medium = models.CharField(max_length=200, blank=True, verbose_name="UTM Medium")
    utm_campaign = models.CharField(max_length=200, blank=True, verbose_name="UTM Campaign")
    utm_content = models.CharField(max_length=200, blank=True, verbose_name="UTM Content")
    utm_term = models.CharField(max_length=200, blank=True, verbose_name="UTM Term")
    
    # VK параметры
    vk_ad_id = models.CharField(max_length=100, blank=True, verbose_name="VK Ad ID")
    vk_ref = models.CharField(max_length=200, blank=True, verbose_name="VK Ref")
    vk_ref_source = models.CharField(max_length=200, blank=True, verbose_name="VK Ref Source")
    vk_platform = models.CharField(max_length=100, blank=True, verbose_name="VK Platform")
    
    # Дополнительные параметры
    url = models.URLField(max_length=500, blank=True, verbose_name="URL страницы")
    referrer = models.URLField(max_length=500, blank=True, verbose_name="Referrer")
    user_agent = models.TextField(blank=True, verbose_name="User Agent")
    
    # Полные данные в JSON формате
    full_utm_data = models.JSONField(default=dict, verbose_name="Полные UTM данные")
    full_user_data = models.JSONField(default=dict, verbose_name="Полные данные пользователя")
    
    # Тип события
    event_type = models.CharField(max_length=50, default='page_view', verbose_name="Тип события")
    
    def __str__(self):
        return f"UTM Tracking - {self.timestamp.strftime('%Y-%m-%d %H:%M:%S')} - {self.user_id or 'Anonymous'}"
    
    class Meta:
        verbose_name = "UTM Отслеживание"
        verbose_name_plural = "UTM Отслеживание"
        ordering = ['-timestamp']
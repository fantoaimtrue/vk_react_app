from django.db import models

# Create your models here.

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

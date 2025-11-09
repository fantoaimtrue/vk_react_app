from django.contrib import admin
from .models import MFO

# Простая версия админки без дополнительных функций
class MFOAdminSimple(admin.ModelAdmin):
    list_display = ('name', 'rate', 'approval_chance', 'sum_min', 'sum_max')
    list_editable = ('rate', 'approval_chance')
    search_fields = ('name',)
    ordering = ('name',)
    
    # Только базовые поля
    fields = ('name', 'logo_url', 'link', 'sum_min', 'sum_max', 'term_min', 'term_max', 'rate', 'approval_chance', 'payout_speed_hours')

# Можно переключиться на эту версию если основная не работает
# admin.site.unregister(MFO)  
# admin.site.register(MFO, MFOAdminSimple)

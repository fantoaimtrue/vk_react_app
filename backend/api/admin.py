from django.contrib import admin
from .models import MFO

# Регистрируем модель MFO в админ-панели
@admin.register(MFO)
class MFOAdmin(admin.ModelAdmin):
    list_display = ('name', 'rate', 'sum_max', 'approval_chance', 'link')
    search_fields = ('name',)

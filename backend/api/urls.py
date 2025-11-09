from django.urls import path
from .views import (
    mfo_list, mfo_detail, utm_track, utm_stats, offers_list, upload_mfo_excel, mfo_template,
    user_register, user_allow_notifications, user_status, push_click_track, users_stats,
    send_to_leads_tech
)

# URL-ы API
urlpatterns = [
    # МФО endpoints
    path('mfos/', mfo_list, name='mfo-list'),
    path('mfos/<int:pk>/', mfo_detail, name='mfo-detail'),
    
    # Загрузка МФО из Excel
    path('mfos/upload/', upload_mfo_excel, name='mfo-upload'),
    path('mfos/template/', mfo_template, name='mfo-template'),
    
    # Офферы endpoints
    path('offers/', offers_list, name='offers-list'),
    
    # UTM отслеживание
    path('utm-track/', utm_track, name='utm-track'),
    path('utm-stats/', utm_stats, name='utm-stats'),
    
    # Пользователи endpoints
    path('users/register/', user_register, name='user-register'),
    path('users/allow-notifications/', user_allow_notifications, name='user-allow-notifications'),
    path('users/status/', user_status, name='user-status'),
    path('users/stats/', users_stats, name='users-stats'),
    
    # Пуш-уведомления endpoints
    path('push/click-track/', push_click_track, name='push-click-track'),
    
    # Арбитраж endpoints
    path('arbitrage/send-to-leads-tech/', send_to_leads_tech, name='send-to-leads-tech'),
] 
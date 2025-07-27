from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import MFOViewSet

# Создаем роутер и регистрируем наше представление
router = DefaultRouter()
router.register(r'mfos', MFOViewSet)

# URL-ы API определяются автоматически роутером
urlpatterns = [
    path('', include(router.urls)),
] 
from django.shortcuts import render
from rest_framework import viewsets
from .models import MFO
from .serializers import MFOSerializer

# Create your views here.

class MFOViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Это представление автоматически обеспечивает операции `list` (получить всех) 
    и `retrieve` (получить одного по id).
    Пагинация отключена.
    """
    queryset = MFO.objects.all().order_by('name')
    serializer_class = MFOSerializer
    pagination_class = None # Отключаем пагинацию для этого ViewSet

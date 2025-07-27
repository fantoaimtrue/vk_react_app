from rest_framework import serializers
from .models import MFO
 
class MFOSerializer(serializers.ModelSerializer):
    class Meta:
        model = MFO
        fields = '__all__' # Включаем все поля из модели 
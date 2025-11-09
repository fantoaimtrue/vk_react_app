from django.core.management.base import BaseCommand
from api.models import MFO

class Command(BaseCommand):
    help = 'Обновляет ссылки МФО для использования ad_id в параметре s4'

    def handle(self, *args, **options):
        self.stdout.write('🔄 Обновление ссылок МФО...')
        
        updated_count = 0
        
        for mfo in MFO.objects.all():
            old_link = mfo.link
            
            # Заменяем {ref} на {ad_id} в параметре s4
            if 's4={ref}' in mfo.link:
                mfo.link = mfo.link.replace('s4={ref}', 's4={ad_id}')
                mfo.save()
                updated_count += 1
                
                self.stdout.write(f'✅ Обновлена ссылка для {mfo.name}:')
                self.stdout.write(f'   Было: {old_link}')
                self.stdout.write(f'   Стало: {mfo.link}')
                self.stdout.write('')
        
        self.stdout.write(
            self.style.SUCCESS(f'🎉 Обновлено {updated_count} ссылок МФО')
        )

"""
Django management command для отправки запланированных пуш-уведомлений
Использование: python manage.py send_scheduled_pushes
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from api.models import PushNotification
from api.services import send_push_notification


class Command(BaseCommand):
    help = 'Отправка запланированных пуш-уведомлений'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Показать уведомления для отправки без реальной отправки',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        
        # Находим уведомления, которые нужно отправить
        notifications = PushNotification.objects.filter(
            status='scheduled',
            scheduled_time__lte=timezone.now()
        )
        
        if not notifications.exists():
            self.stdout.write(self.style.WARNING('⚠️  Нет запланированных уведомлений для отправки'))
            return
        
        self.stdout.write(f'\n📬 Найдено уведомлений для отправки: {notifications.count()}\n')
        
        for notification in notifications:
            # Получаем количество получателей
            target_count = notification.get_target_users_queryset().count()
            
            self.stdout.write(f'\n📨 Уведомление: {notification.title}')
            self.stdout.write(f'   Запланировано: {notification.scheduled_time}')
            self.stdout.write(f'   Получателей: {target_count}')
            
            if dry_run:
                self.stdout.write(self.style.WARNING('   🔸 DRY RUN - пропускаем отправку'))
                continue
            
            try:
                # Отправляем уведомление
                stats = send_push_notification(notification.id)
                
                self.stdout.write(self.style.SUCCESS(
                    f'   ✅ Успешно отправлено:\n'
                    f'      • Всего: {stats["total"]}\n'
                    f'      • Доставлено: {stats["delivered"]}\n'
                    f'      • Ошибок: {stats["failed"]}'
                ))
                
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'   ❌ Ошибка: {str(e)}'))
        
        if dry_run:
            self.stdout.write(self.style.WARNING('\n🔸 Это был DRY RUN - уведомления не отправлены'))
        else:
            self.stdout.write(self.style.SUCCESS(f'\n✅ Обработка завершена!'))


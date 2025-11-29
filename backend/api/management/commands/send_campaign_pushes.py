"""
Django management command для отправки рассылок по расписанию
Использование: python manage.py send_campaign_pushes
Рекомендуется запускать через cron каждые 5-15 минут
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from api.models import PushCampaign
from api.services import send_campaign_push


class Command(BaseCommand):
    help = 'Отправка активных рассылок по расписанию'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Показать рассылки для отправки без реальной отправки',
        )
        parser.add_argument(
            '--campaign-id',
            type=int,
            help='Отправить конкретную рассылку по ID',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        campaign_id = options.get('campaign_id')
        
        now = timezone.now()
        
        if campaign_id:
            # Отправляем конкретную рассылку
            try:
                campaign = PushCampaign.objects.get(id=campaign_id, status='active')
                self._process_campaign(campaign, now, dry_run)
            except PushCampaign.DoesNotExist:
                self.stdout.write(self.style.ERROR(f'❌ Рассылка с ID {campaign_id} не найдена или не активна'))
        else:
            # Находим активные рассылки, которые нужно отправить
            active_campaigns = PushCampaign.objects.filter(status='active')
            
            if not active_campaigns.exists():
                self.stdout.write(self.style.WARNING('⚠️  Нет активных рассылок'))
                return
            
            self.stdout.write(f'\n📬 Найдено активных рассылок: {active_campaigns.count()}\n')
            
            sent_count = 0
            skipped_count = 0
            
            for campaign in active_campaigns:
                if self._should_send_campaign(campaign, now):
                    self._process_campaign(campaign, now, dry_run)
                    sent_count += 1
                else:
                    skipped_count += 1
                    next_time = campaign.get_next_send_time()
                    if next_time:
                        self.stdout.write(
                            self.style.WARNING(
                                f'⏭️  "{campaign.name}": пропущена (следующая отправка: {next_time.strftime("%d.%m.%Y %H:%M")})'
                            )
                        )
            
            if dry_run:
                self.stdout.write(self.style.WARNING('\n🔸 Это был DRY RUN - рассылки не отправлены'))
            else:
                self.stdout.write(
                    self.style.SUCCESS(
                        f'\n✅ Обработка завершена! Отправлено: {sent_count}, пропущено: {skipped_count}'
                    )
                )
    
    def _should_send_campaign(self, campaign, now):
        """Проверяет, нужно ли отправлять рассылку сейчас"""
        if campaign.schedule_type == 'once':
            # Разовая отправка - проверяем дату
            if campaign.schedule_date and campaign.schedule_date <= now:
                return True
            return False
        
        elif campaign.schedule_type == 'daily':
            # Ежедневно - проверяем время
            if not campaign.schedule_time:
                return False
            # Проверяем, прошло ли время отправки сегодня
            today_time = now.replace(hour=campaign.schedule_time.hour, minute=campaign.schedule_time.minute, second=0, microsecond=0)
            # Отправляем, если время прошло и еще не отправляли сегодня
            if now >= today_time:
                from datetime import timedelta
                today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
                from api.models import SentPush
                already_sent = SentPush.objects.filter(
                    campaign=campaign,
                    sent_at__gte=today_start,
                    status__in=['sent', 'delivered']
                ).exists()
                return not already_sent
            return False
        
        elif campaign.schedule_type == 'weekly':
            # Еженедельно - проверяем день недели и время
            if not campaign.schedule_time or not campaign.schedule_days:
                return False
            current_weekday = now.weekday()
            if current_weekday in campaign.schedule_days:
                # Проверяем время
                today_time = now.replace(hour=campaign.schedule_time.hour, minute=campaign.schedule_time.minute, second=0, microsecond=0)
                if now >= today_time:
                    from datetime import timedelta
                    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
                    from api.models import SentPush
                    already_sent = SentPush.objects.filter(
                        campaign=campaign,
                        sent_at__gte=today_start,
                        status__in=['sent', 'delivered']
                    ).exists()
                    return not already_sent
            return False
        
        elif campaign.schedule_type == 'monthly':
            # Ежемесячно - проверяем день месяца и время
            if not campaign.schedule_time or not campaign.schedule_day_of_month:
                return False
            if now.day == campaign.schedule_day_of_month:
                today_time = now.replace(hour=campaign.schedule_time.hour, minute=campaign.schedule_time.minute, second=0, microsecond=0)
                if now >= today_time:
                    from datetime import timedelta
                    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
                    from api.models import SentPush
                    already_sent = SentPush.objects.filter(
                        campaign=campaign,
                        sent_at__gte=today_start,
                        status__in=['sent', 'delivered']
                    ).exists()
                    return not already_sent
            return False
        
        return False
    
    def _process_campaign(self, campaign, now, dry_run):
        """Обрабатывает рассылку"""
        target_count = campaign.get_target_users_queryset().count()
        templates_count = campaign.templates.count()
        
        self.stdout.write(f'\n📨 Рассылка: {campaign.name}')
        schedule_names = {
            'once': 'Разовая отправка',
            'daily': 'Ежедневно',
            'weekly': 'Еженедельно',
            'monthly': 'Ежемесячно',
            'custom': 'Произвольное расписание',
        }
        self.stdout.write(f'   Тип: {schedule_names.get(campaign.schedule_type, campaign.schedule_type)}')
        self.stdout.write(f'   Шаблонов: {templates_count}')
        self.stdout.write(f'   Получателей: {target_count}')
        
        if not campaign.templates.exists():
            self.stdout.write(self.style.ERROR('   ❌ Нет шаблонов пушей'))
            return
        
        if target_count == 0:
            self.stdout.write(self.style.WARNING('   ⚠️  Нет получателей'))
            return
        
        if dry_run:
            self.stdout.write(self.style.WARNING('   🔸 DRY RUN - пропускаем отправку'))
            return
        
        try:
            stats = send_campaign_push(campaign.id)
            
            self.stdout.write(
                self.style.SUCCESS(
                    f'   ✅ Успешно отправлено:\n'
                    f'      • Всего: {stats["total"]}\n'
                    f'      • Доставлено: {stats["delivered"]}\n'
                    f'      • Ошибок: {stats["failed"]}'
                )
            )
            
            if stats.get('message'):
                self.stdout.write(self.style.WARNING(f'      • {stats["message"]}'))
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'   ❌ Ошибка: {str(e)}'))


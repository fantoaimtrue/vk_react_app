from django.core.management.base import BaseCommand
from api.models import MFO
import random


class Command(BaseCommand):
    help = 'Быстрое обновление базы МФО'

    def add_arguments(self, parser):
        parser.add_argument(
            '--randomize-approval',
            action='store_true',
            help='Рандомизировать шансы одобрения (65-98%)',
        )
        parser.add_argument(
            '--randomize-sums',
            action='store_true', 
            help='Рандомизировать суммы займов',
        )
        parser.add_argument(
            '--set-rate-zero',
            action='store_true',
            help='Установить ставку 0% для всех МФО',
        )
        parser.add_argument(
            '--update-links',
            action='store_true',
            help='Обновить все ссылки на шаблонную',
        )
        parser.add_argument(
            '--all',
            action='store_true',
            help='Выполнить все операции',
        )

    def handle(self, *args, **options):
        mfos = MFO.objects.all()
        
        if options['all'] or options['randomize_approval']:
            self.stdout.write('🎲 Рандомизация шансов одобрения...')
            for mfo in mfos:
                mfo.approval_chance = random.randint(65, 98)
                mfo.save()
            self.stdout.write(self.style.SUCCESS(f'✅ Обновлено {mfos.count()} МФО'))

        if options['all'] or options['randomize_sums']:
            self.stdout.write('💰 Рандомизация сумм займов...')
            sum_ranges = [
                (1000, 15000),
                (5000, 30000), 
                (10000, 50000),
                (15000, 100000),
                (3000, 25000)
            ]
            for mfo in mfos:
                min_sum, max_sum = random.choice(sum_ranges)
                mfo.sum_min = min_sum
                mfo.sum_max = max_sum
                mfo.save()
            self.stdout.write(self.style.SUCCESS(f'✅ Суммы обновлены для {mfos.count()} МФО'))

        if options['all'] or options['set_rate_zero']:
            self.stdout.write('💸 Установка ставки 0%...')
            mfos.update(rate=0)
            self.stdout.write(self.style.SUCCESS(f'✅ Ставка 0% установлена для {mfos.count()} МФО'))

        if options['all'] or options['update_links']:
            self.stdout.write('🔗 Обновление ссылок...')
            # Простые ссылки без динамических параметров
            template_link = "https://your-partner-site.com/mfo?utm_source=your_service&utm_medium=vitrina&utm_campaign=mfo_selection"
            mfos.update(link=template_link)
            self.stdout.write(self.style.SUCCESS(f'✅ Ссылки обновлены для {mfos.count()} МФО'))

        self.stdout.write(self.style.SUCCESS('\n🎉 Обновление завершено!'))

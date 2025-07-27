import json
import os
from django.core.management.base import BaseCommand
from django.conf import settings
from api.models import MFO

class Command(BaseCommand):
    help = 'Imports MFO data from mfo.json into the database'

    def handle(self, *args, **kwargs):
        # Путь к файлу mfo.json относительно папки backend
        json_file_path = os.path.join(settings.BASE_DIR, '..', 'public', 'data', 'mfo.json')

        self.stdout.write(f"Ищем файл с данными по адресу: {json_file_path}")

        try:
            with open(json_file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
        except FileNotFoundError:
            self.stderr.write(self.style.ERROR(f"Файл не найден по адресу {json_file_path}."))
            return
        except json.JSONDecodeError:
            self.stderr.write(self.style.ERROR("Ошибка в JSON файле. Проверьте синтаксис."))
            return

        imported_count = 0
        updated_count = 0

        for mfo_data in data:
            # Преобразуем массивы в строки с разделителем ";"
            requirements_str = ";".join(mfo_data.get('requirements', []))
            get_methods_str = ";".join(mfo_data.get('get_methods', []))
            repay_methods_str = ";".join(mfo_data.get('repay_methods', []))

            defaults = {
                'logo_url': mfo_data.get('logo_url'),
                'link': mfo_data.get('link'),
                'sum_min': mfo_data.get('sum_min'),
                'sum_max': mfo_data.get('sum_max'),
                'term_min': mfo_data.get('term_min'),
                'term_max': mfo_data.get('term_max'),
                'rate': mfo_data.get('rate'),
                'approval_chance': mfo_data.get('approval_chance'),
                'payout_speed_hours': mfo_data.get('payout_speed_hours'),
                'requirements': requirements_str,
                'get_methods': get_methods_str,
                'repay_methods': repay_methods_str,
            }

            # Используем update_or_create, чтобы не создавать дубликаты по имени
            obj, created = MFO.objects.update_or_create(
                name=mfo_data['name'],
                defaults=defaults
            )

            if created:
                imported_count += 1
            else:
                updated_count += 1
        
        self.stdout.write(self.style.SUCCESS(f"\nИмпорт завершен. Создано: {imported_count}, Обновлено: {updated_count}")) 
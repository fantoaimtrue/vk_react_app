from django.apps import AppConfig
import os


class ApiConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'api'

    def ready(self):
        """
        Автоматическое создание/обновление суперпользователя,
        если заданы переменные окружения:
        DJANGO_SUPERUSER_USERNAME, DJANGO_SUPERUSER_PASSWORD, DJANGO_SUPERUSER_EMAIL (опционально).
        """
        username = os.getenv("DJANGO_SUPERUSER_USERNAME")
        password = os.getenv("DJANGO_SUPERUSER_PASSWORD")
        email = os.getenv("DJANGO_SUPERUSER_EMAIL", "")

        # Если не заданы креды — ничего не делаем
        if not username or not password:
            return

        try:
            from django.contrib.auth import get_user_model
            from django.db import OperationalError, ProgrammingError, connection

            # Проверяем, что таблица пользователей существует
            if 'auth_user' not in connection.introspection.table_names():
                return

            User = get_user_model()
            user, created = User.objects.get_or_create(
                username=username,
                defaults={
                    "email": email,
                    "is_staff": True,
                    "is_superuser": True,
                },
            )

            # Обновляем пароль/права/почту, если пользователь уже существовал
            user_changed = False
            if created or user.check_password(password) is False:
                user.set_password(password)
                user_changed = True
            if email and user.email != email:
                user.email = email
                user_changed = True
            if not user.is_staff or not user.is_superuser:
                user.is_staff = True
                user.is_superuser = True
                user_changed = True

            if user_changed:
                user.save()
        except (OperationalError, ProgrammingError):
            # База или миграции могут быть недоступны на ранней стадии старта.
            # Просто пропускаем — после применения миграций пользователь будет создан при следующем старте.
            pass

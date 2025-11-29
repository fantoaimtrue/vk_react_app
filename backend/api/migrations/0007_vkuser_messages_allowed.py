# Generated migration for adding messages_allowed field

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0006_mfo_inn_alter_mfo_link'),
    ]

    operations = [
        migrations.AddField(
            model_name='vkuser',
            name='messages_allowed',
            field=models.BooleanField(default=False, verbose_name='Пользователь разрешил сообщения от сообщества'),
        ),
    ]


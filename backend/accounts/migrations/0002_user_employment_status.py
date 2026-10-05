from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='employment_status',
            field=models.CharField(choices=[('ACTIVE', 'Active'), ('FORMER', 'Former Employee')], default='ACTIVE', max_length=20),
        ),
    ]

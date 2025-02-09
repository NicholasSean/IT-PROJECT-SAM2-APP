# Generated by Django 5.1.1 on 2024-10-24 03:06

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('ImageAnnotatorSAM2', '0009_merge_20241015_1241'),
    ]

    operations = [
        migrations.AlterField(
            model_name='mask',
            name='word',
            field=models.ForeignKey(help_text='The word associated with this mask (optional)', on_delete=django.db.models.deletion.CASCADE, related_name='associated_masks', to='ImageAnnotatorSAM2.word'),
        ),
    ]

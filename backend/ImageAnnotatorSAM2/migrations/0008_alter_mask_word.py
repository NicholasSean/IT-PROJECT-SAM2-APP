# Generated by Django 5.1.1 on 2024-10-15 05:01

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('ImageAnnotatorSAM2', '0007_alter_image_file_hash_alter_word_image'),
    ]

    operations = [
        migrations.AlterField(
            model_name='mask',
            name='word',
            field=models.ForeignKey(blank=True, help_text='The word associated with this mask (optional)', null=True, on_delete=django.db.models.deletion.CASCADE, related_name='associated_masks', to='ImageAnnotatorSAM2.word'),
        ),
    ]

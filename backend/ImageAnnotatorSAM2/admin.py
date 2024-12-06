from django.contrib import admin
from .models import Word, Image, Mask


# Register your models here.

admin.site.register(Word)
admin.site.register(Image)
admin.site.register(Mask)
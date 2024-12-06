# urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (UploadImageView, ListImagesView,CsrfTokenView,DeleteImageView, SelectImageView, WordView,SAM2maskView, MaskViewSet,DeleteMaskView)

router = DefaultRouter()
router.register(r'masks', MaskViewSet, basename='mask')

urlpatterns = [
    # initialisation views
    path('csrf-token/', CsrfTokenView.as_view(), name='csrf_token'),

    #Images
    path('upload/', UploadImageView.as_view(), name='upload'),
    path('images/', ListImagesView.as_view(), name='list_images'),
    path('delete/<str:file_hash>/', DeleteImageView.as_view(), name='delete_image'),
    path('select-image/', SelectImageView.as_view(), name='select_image'),

    #Words
    path('word/', WordView.as_view(), name='upload word'),


    #Masks
    path('sam2/', SAM2maskView.as_view(), name='SAM2mask'),
    path('api/', include(router.urls)),
    path('delete-mask/', DeleteMaskView.as_view(), name='delete-mask'),

]
# serializers.py
from rest_framework import serializers
from .models import Image, Word, Mask

class MaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = Mask
        fields = ['id', 'uuid', 'maskImage', 'image', 'word', 'contours']

class WordSerializer(serializers.ModelSerializer):
    associated_masks = MaskSerializer(many=True, read_only=True)

    class Meta:
        model = Word
        fields = ['id', 'word', 'image', 'associated_masks']

class ImageSerializer(serializers.ModelSerializer):
    masks = MaskSerializer(many=True, read_only=True)
    word_masks = WordSerializer(many=True, read_only=True)

    class Meta:
        model = Image
        fields = ['id', 'name', 'file', 'file_hash', 'masks', 'word_masks']

# Serializer for handling only the file field of the Image model
class ImageFileSerialiser(serializers.ModelSerializer):
    class Meta:
        model = Image
        fields = ['file']


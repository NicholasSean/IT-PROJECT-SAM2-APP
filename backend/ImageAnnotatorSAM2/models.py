from django.db import models, transaction
import uuid
import os
from django.dispatch import receiver

# Image model for storing images
# Uses file hash for identification
class Image(models.Model):
    # Name of the image (optional)
    name = models.CharField(
        max_length=255, 
        default=None, 
        blank=True, 
        null=True,
        help_text="The name of the image"
    )
    
    # Image file field (optional)
    file = models.ImageField(
        upload_to='images/', 
        default=None, 
        blank=True, 
        null=True,
        help_text="The file path of the uploaded image"
    )
    
    # Hash of the image file for duplicate checking
    file_hash = models.CharField(
        max_length=64, 
        default=None,
        null=True, 
        blank=True, 
        help_text="A unique hash representing the content of the image"
    )

    def __str__(self):
        return self.name if self.name else f"Image {self.id}"


# Word model for associating words with images
# Linked to one Image instance using a foreign key relationship
class Word(models.Model):
    # The word associated with the mask (e.g., vocabulary word)
    word = models.CharField(
        max_length=100, 
        help_text="A single word associated with the mask"
    )
    
    # Reference to the associated image
    image = models.ForeignKey(
        Image,  # Assuming 'ImageAnnotatorSAM2' is the app name, adjust if necessary
        on_delete=models.CASCADE, 
        related_name='word_masks', 
        help_text="The image associated with this word-mask entry"
    )

    def __str__(self):
        return self.word


# Mask model for storing mask images
# Each mask has a unique UUID and is associated with an image
# Masks will be deleted if their associated image is deleted
class Mask(models.Model):
    # Required mask image field
    maskImage = models.ImageField(
        upload_to='masks/', 
        blank=False, 
        null=False,  
        help_text="The image file representing the mask"
    )
    
    # Unique identifier for each mask
    uuid = models.UUIDField(
        default=uuid.uuid4,  # Automatically generate a unique UUID
        editable=False,   
        unique=True        
    )
    
    # Required association with an Image object
    image = models.ForeignKey(
        Image,
        on_delete=models.CASCADE,  
        related_name='masks',
        help_text="The image associated with this mask"
    )
    
    word = models.ForeignKey(
        Word, 
        on_delete=models.CASCADE, 
        related_name='associated_masks', 
        null=False,  
        blank=False,
        help_text="The word associated with this mask (optional)"
    )
    contours = models.JSONField(
        null=True, 
        blank=True
    )

    class Meta:
        unique_together = ('image', 'word')

    def __str__(self):
        return f"Mask {self.uuid}"
    
    # Override the delete method to ensure image file is deleted
    def delete(self, *args, **kwargs):
        # First, delete the image file
        if self.maskImage:
            if os.path.isfile(self.maskImage.path):
                os.remove(self.maskImage.path)
        # Then, call the super delete method to delete the model instance
        super().delete(*args, **kwargs)

    def save(self, *args, **kwargs):
        with transaction.atomic():
            if self.word is not None:
                existing_mask = Mask.objects.filter(
                    image=self.image,
                    word=self.word
                ).exclude(pk=self.pk).first()
                if existing_mask:
                    existing_mask.delete()
            super().save(*args, **kwargs)

# Signal to delete image file when mask is deleted
@receiver(models.signals.post_delete, sender=Mask)
def auto_delete_mask_image_on_delete(sender, instance, **kwargs):
    """Deletes mask image from filesystem when the corresponding `Mask` object is deleted."""
    if instance.maskImage:
        if os.path.isfile(instance.maskImage.path):
            os.remove(instance.maskImage.path)
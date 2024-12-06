from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from .models import Image, Word, Mask
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
import hashlib
import json
import os
import uuid

# ------------------- Model Tests --------------------

class ImageModelTest(TestCase):
    def setUp(self):
        self.image = Image.objects.create(
            name='Test Image',
            file=SimpleUploadedFile("test_image.jpg", b"file_content", content_type="image/jpeg")
        )

    def test_create_image(self):
        self.assertEqual(self.image.name, 'Test Image')
        self.assertTrue(os.path.isfile(self.image.file.path))
        print("test_create_image passed")

    def test_image_file_hash(self):
        self.image.file_hash = hashlib.md5(b"file_content").hexdigest()
        self.image.save()
        self.assertEqual(self.image.file_hash, hashlib.md5(b"file_content").hexdigest())
        print("test_image_file_hash passed")



class WordModelTest(TestCase):
    def setUp(self):
        self.image = Image.objects.create(
            name='Test Image',
            file=SimpleUploadedFile("test_image.jpg", b"file_content", content_type="image/jpeg")
        )
        self.word = Word.objects.create(word='TestWord', image=self.image)

    def test_create_word(self):
        self.assertEqual(self.word.word, 'TestWord')
        self.assertEqual(self.word.image, self.image)
        print("test_create_word passed")

    def test_delete_word(self):
        word_id = self.word.id
        self.word.delete()
        self.assertFalse(Word.objects.filter(id=word_id).exists())
        print("test_delete_word passed")


class MaskModelTest(TestCase):
    def setUp(self):
        self.image = Image.objects.create(
            name='Test Image',
            file=SimpleUploadedFile("test_image.jpg", b"file_content", content_type="image/jpeg")
        )
        self.word = Word.objects.create(word='TestWord', image=self.image)
        self.mask = Mask.objects.create(
            image=self.image,
            word=self.word,
            maskImage=SimpleUploadedFile("test_mask.png", b"mask_content", content_type="image/png")
        )

    def test_create_mask(self):
        self.assertEqual(self.mask.word, self.word)
        self.assertTrue(os.path.isfile(self.mask.maskImage.path))
        print("test_create_mask passed")

    def test_mask_file_deleted_with_mask(self):
        mask_path = self.mask.maskImage.path
        self.mask.delete()
        self.assertFalse(os.path.isfile(mask_path))
        print("test_mask_file_deleted_with_mask passed")

    def test_unique_mask_per_word_image(self):
        new_mask = Mask.objects.create(
            image=self.image,
            word=self.word,
            maskImage=SimpleUploadedFile("test_mask2.png", b"mask_content", content_type="image/png")
        )
        self.assertEqual(Mask.objects.filter(image=self.image, word=self.word).count(), 1)
        self.assertNotEqual(new_mask.maskImage, self.mask.maskImage)
        print("test_unique_mask_per_word_image passed")


# ------------------- API/View Tests --------------------

class UploadImageViewTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.upload_url = reverse('upload')

    def test_upload_image_success(self):
        image = SimpleUploadedFile("test_image.jpg", b"file_content", content_type="image/jpeg")
        response = self.client.post(self.upload_url, {'image': image, 'name': 'Test Image'}, format='multipart')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['message'], 'Uploaded successfully!')
        print("test_upload_image_success passed")

    def test_upload_image_duplicate(self):
        image = SimpleUploadedFile("test_image.jpg", b"file_content", content_type="image/jpeg")
        # First upload
        self.client.post(self.upload_url, {'image': image, 'name': 'Test Image'}, format='multipart')

        # Second upload (same file), should be treated as duplicate
        duplicate_image = SimpleUploadedFile("test_image.jpg", b"file_content", content_type="image/jpeg")
        response = self.client.post(self.upload_url, {'image': duplicate_image, 'name': 'Test Image'}, format='multipart')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['message'], 'This image has already been uploaded.')
        print("test_upload_image_duplicate passed")

    def test_upload_invalid_file(self):
        invalid_file = SimpleUploadedFile("test.txt", b"invalid content", content_type="text/plain")
        response = self.client.post(self.upload_url, {'image': invalid_file, 'name': 'Invalid Image'}, format='multipart')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['message'], 'Invalid request. A valid image and name are required.')
        print("test_upload_invalid_file passed")


class DeleteImageViewTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.image = Image.objects.create(
            name='Test Image',
            file=SimpleUploadedFile("test_image.jpg", b"file_content", content_type="image/jpeg"),
            file_hash=hashlib.md5(b"test").hexdigest()
        )
        self.delete_url = reverse('delete_image', kwargs={'file_hash': self.image.file_hash})

    def test_delete_image_success(self):
        response = self.client.delete(self.delete_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['message'], 'Image deleted successfully.')
        print("test_delete_image_success passed")

    def test_delete_image_not_found(self):
        non_existent_file_hash = hashlib.md5(b"nonexistent").hexdigest()
        response = self.client.delete(reverse('delete_image', kwargs={'file_hash': non_existent_file_hash}))

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        print("test_delete_image_not_found passed")


class SelectImageViewTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.image = Image.objects.create(
            name='Test Image',
            file=SimpleUploadedFile("test_image.jpg", b"file_content", content_type="image/jpeg"),
            file_hash=hashlib.md5(b"test").hexdigest()
        )
        session = self.client.session
        session['last_selected_image_hash'] = self.image.file_hash
        session.save()

    def test_get_selected_image_success(self):
        response = self.client.get(reverse('select_image'))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['imageName'], self.image.name)
        self.assertIn('imageLocation', response.data)
        print("test_get_selected_image_success passed")

    def test_get_selected_image_no_image(self):
        session = self.client.session
        if 'last_selected_image_hash' in session:
            del session['last_selected_image_hash']
        session.save()

        response = self.client.get(reverse('select_image'))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['message'], 'No image selected')
        print("test_get_selected_image_no_image passed")


class WordViewTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.image = Image.objects.create(
            name='Test Image',
            file=SimpleUploadedFile("test_image.jpg", b"file_content", content_type="image/jpeg"),
            file_hash=hashlib.md5(b"test").hexdigest()
        )
        self.url = reverse('upload word')

    def test_get_words_for_image(self):
        Word.objects.create(word='TestWord', image=self.image)
        response = self.client.get(self.url, {'image_hash': self.image.file_hash})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['words'][0]['word'], 'TestWord')
        print("test_get_words_for_image passed")

    def test_delete_word(self):
        Word.objects.create(word='TestWord', image=self.image)
        delete_url = f"{self.url}?associated_image={self.image.file_hash}&word=TestWord"
        response = self.client.delete(delete_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['message'], 'Word deleted successfully.')
        print("test_delete_word passed")

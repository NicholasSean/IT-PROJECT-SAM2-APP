# views.py
import datetime
from io import BytesIO
import uuid
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.generics import ListAPIView, DestroyAPIView
from rest_framework import status, generics, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from django.core.files.base import ContentFile
from .models import Image, Word, Mask
from .serializers import ImageSerializer, WordSerializer, ImageFileSerialiser, MaskSerializer
import os
import hashlib
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.http import Http404, HttpResponseNotFound
from django.views import View
from django.http import FileResponse
from django.contrib.sessions.models import Session
from django.contrib import admin
from rest_framework.permissions import AllowAny
from django.views.decorators.csrf import csrf_exempt
import re
import numpy as np
import json
from PIL import Image as PILImage
from .SAM2Implimentation import AutoSegmentTool
from skimage import measure  # Added for contour generation
import matplotlib.pyplot as plt  # Added for visualization testing

### upload point for images 
class UploadImageView(APIView):
    parser_classes = (FormParser, MultiPartParser)

    def post(self, request, *args, **kwargs):
        image = request.FILES.get('image')
        name = request.data.get('name')
  
        image_hash = self.get_file_hash(image)

        # Check if the uploaded file is an image
        if image and self.is_image(image) and name:

            # duplicate protection
            for existing_image in Image.objects.all():
                if existing_image.file_hash == image_hash:
                    print("match found")
                    print(image_hash, " is equal to\n", existing_image.file_hash)
                    return Response({
                    "message": "This image has already been uploaded."
                    }, status=status.HTTP_400_BAD_REQUEST)

            upload = Image.objects.create(name=name, file=image, file_hash=image_hash)
            upload.save()

            full_image_url = request.build_absolute_uri(upload.file.url)

            request.session['last_selected_image_hash'] = image_hash
            return Response({
                "message": "Uploaded successfully!",
                "imageName": upload.name,
                "imageLocation": full_image_url,
                "file_hash": upload.file_hash
            }, status=status.HTTP_201_CREATED)
        else:
            return Response({
                "message": "Invalid request. A valid image and name are required.",
            }, status=status.HTTP_400_BAD_REQUEST)

    def is_image(self, file):
        # Check if the file has a valid image MIME type
        valid_image_types = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/tiff", "image/svg+xml"]
        content_type = file.content_type
        if content_type in valid_image_types:
            return True
        return False

    def get_file_hash(self, file):
        # Calculate the MD5 hash of the file content
        hasher = hashlib.md5()
        for chunk in file.chunks():
            hasher.update(chunk)
        return hasher.hexdigest()

### delete image, pass image hash of target
class DeleteImageView(DestroyAPIView):
    queryset = Image.objects.all()

    def delete(self, request, *args, **kwargs):
        # Fetch the image using the file_hash instead of pk (id)
        image = get_object_or_404(Image, file_hash=kwargs['file_hash'])

        # Deleting the file associated with the image.
        if image.file:
            if os.path.isfile(image.file.path):
                os.remove(image.file.path)
        # If deleting selected image, remove from session.
        if request.session.get('last_selected_image_hash') == image.file_hash:
            del request.session['last_selected_image_hash']

        # Deleting the database record
        image.delete()

        # Information about the deleted image
        return Response({
            "message": "Image deleted successfully.",
            "image_name": image.name,
            "file_hash": image.file_hash,
            "file_path": image.file.path if image.file else None
        })

### View selected image.
class SelectImageView(APIView):
    def get(self, request, *args, **kwargs):
        """Handle GET requests to retrieve the last selected image."""
        image_hash = request.session.get('last_selected_image_hash', None)
        ##print(f"Retrieved session data: {image_hash}")
        if image_hash:
            image = Image.objects.filter(file_hash=image_hash).first()
            if image:
                return Response({
                    "imageName": image.name,
                    "imageLocation": image.file.url
                }, status=200)
            else:
                return Response({"message": "Image not found"}, status=404)
        else:
            return Response({"message": "No image selected", "imageLocation": None}, status=200)

    def post(self, request, *args, **kwargs):
        """Handle POST requests to store the selected image."""
        image_hash = request.data.get('imageHash')  # Get the image hash from the request
        if image_hash:
            # Log the image hash to verify
            print(f"Saving selected image hash: {image_hash}")

            # Store the selected image hash in the session
            request.session['last_selected_image_hash'] = image_hash
            request.session.modified = True
            # Log success
            print(f"Image hash {image_hash} saved to session successfully.")
            return Response({"message": "Image selection updated"}, status=status.HTTP_200_OK)
        
        print("No image hash provided, cannot save.")
        return Response({"error": "No image hash provided"}, status=status.HTTP_400_BAD_REQUEST)


### initialise CSRF token when page is started
class CsrfTokenView(View):
    def get(self, request, *args, **kwargs):
        # This view simply exists to trigger the CSRF token setting
        return JsonResponse({'message': 'CSRF token set'})
    
### 
class WordView(APIView):
    parser_classes = (FormParser, MultiPartParser)

    def post(self, request, *args, **kwargs):
        image_hash = request.data.get('associated_image')
        word = request.data.get('word')


        if image_hash and word:
            img = get_object_or_404(Image, file_hash=image_hash)
            upload = Word.objects.create(word=word,image=img)
            upload.save()
            
        return Response({
            "message": "Uploaded successfully!",
        }, status=status.HTTP_201_CREATED)
    
     # GET method to fetch all words associated with an image by its hash
    def get(self, request, *args, **kwargs):
        image_hash = request.query_params.get('image_hash')

        if not image_hash:
            return Response({"message": "image_hash query parameter is required"}, status=status.HTTP_400_BAD_REQUEST)

        # Fetch the image by its hash
        img = get_object_or_404(Image, file_hash=image_hash)

        # Get all words associated with this image
        words = Word.objects.filter(image=img)

        # Prepare the response data, only include the word, exclude the mask
        words_data = [{'word': word.word} for word in words]
        return Response({
            'image': img.name,
            'words': words_data
        }, status=status.HTTP_200_OK)
    

    def delete(self, request, *args, **kwargs):
        image_hash = request.query_params.get('associated_image')
        word_text = request.query_params.get('word')

        if not image_hash or not word_text:
            return Response({
                "message": "Both associated_image and word are required to delete a word."
            }, status=status.HTTP_400_BAD_REQUEST)

        # Fetch the image using the file hash
        img = get_object_or_404(Image, file_hash=image_hash)

        # Fetch the word entry by its text and associated image
        word = get_object_or_404(Word, word=word_text, image=img)

        # Perform the deletion
        word.delete()

        return Response({
            "message": "Word deleted successfully.",
            "word": word.word
        }, status=status.HTTP_200_OK)
    
    # PUT method to update an existing word
    def put(self, request, *args, **kwargs):
        image_hash = request.query_params.get('associated_image')
        old_word_text = request.query_params.get('old_word')
        new_word_text = request.query_params.get('new_word')

        if not image_hash or not old_word_text or not new_word_text:
            return Response({
                "message": "associated_image, old_word, and new_word are required."
            }, status=status.HTTP_400_BAD_REQUEST)

        # Fetch the image using the file hash
        img = get_object_or_404(Image, file_hash=image_hash)

        # Fetch the word entry by its text and associated image
        word = get_object_or_404(Word, word=old_word_text, image=img)

        # Update the word text
        word.word = new_word_text
        word.save()

        return Response({
            "message": "Word updated successfully.",
            "old_word": old_word_text,
            "new_word": new_word_text
        }, status=status.HTTP_200_OK)

def visualize_contours(mask_array, max_points_per_contour=None, tolerance=0.5, visualise = False):

    if (visualise):
        plt.figure(figsize=(10, 10))  # Optional: Specify figure size
        plt.imshow(np.squeeze(mask_array), cmap='gray')

    contours = measure.find_contours(np.squeeze(mask_array), level=0.5)
    
    print(f"Number of contours detected: {len(contours)}")
    
    simplified_contours = []
    
    for idx, contour in enumerate(contours, start=1):
        original_num_points = len(contour)
        current_tolerance = tolerance
        
       
        if max_points_per_contour and original_num_points > max_points_per_contour:
            simplified = measure.approximate_polygon(contour, tolerance=current_tolerance)
            num_simplified_points = len(simplified)
            

            while num_simplified_points > max_points_per_contour and current_tolerance < 10:
                current_tolerance += 0.5
                simplified = measure.approximate_polygon(contour, tolerance=current_tolerance)
                num_simplified_points = len(simplified)
            
            contour = simplified 
            print(f"Contour {idx} simplified from {original_num_points} to {num_simplified_points} points with tolerance {current_tolerance}.")
        else:
            num_simplified_points = original_num_points
            print(f"Contour {idx} has {num_simplified_points} points (no simplification applied).")
      
        simplified_contours.append(contour)
        
        if (visualise):
            plt.plot(contour[:, 1], contour[:, 0], linewidth=2)
            

            label_x, label_y = contour[0, 1], contour[0, 0]
            label_text = f"Tol: {current_tolerance}, Points: {num_simplified_points}"
            

            plt.text(label_x, label_y, label_text, fontsize=8, color='yellow',
                    bbox=dict(facecolor='black', alpha=0.5, boxstyle='round,pad=0.2'))
    
    if (visualise):
        plt.title('Contour Visualization')
        plt.axis('image')
    
    media_path = '/home/hammatime123/it-project-group-65/backend/media'
    contours_dir = os.path.join(media_path, 'contours')
    
    if(visualise):
        os.makedirs(contours_dir, exist_ok=True)
    
        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"contour_visualization_{timestamp}.png"
        file_path = os.path.join(contours_dir, filename)
        try:
            plt.savefig(file_path, bbox_inches='tight')
            plt.close()  # Close the figure to free memory
            print(f"Contour visualization saved to {file_path}")
        except Exception as e:
            print(f"Error saving contour visualization: {e}")
        
    return simplified_contours

def format_contours_to_json(label, contours):
    data = {
        "label": label,
        "contours": []
    }
    for idx, contour in enumerate(contours):
        points = contour.tolist()
        data["contours"].append({
            "contour_index": idx,
            "points": points
        })
    return data  # Return as a Python dictionary

    contours = measure.find_contours(np.squeeze(mask_array), level=0.5)
    simplified_contours = []
    for contour in contours:
        original_num_points = len(contour)
        current_tolerance = tolerance
        if max_points and original_num_points > max_points:
            simplified = measure.approximate_polygon(contour, tolerance=current_tolerance)
            num_simplified_points = len(simplified)
            while num_simplified_points > max_points and current_tolerance < 10:
                current_tolerance += 0.5
                simplified = measure.approximate_polygon(contour, tolerance=current_tolerance)
                num_simplified_points = len(simplified)
            contour = simplified
        simplified_contours.append(contour)
    return simplified_contours
    
class SAM2maskView(APIView):

    def post(self, request, *args, **kwargs):
        my_sam = AutoSegmentTool()

        # Extract data from the request
        image_hash = request.data.get('file_hash')
        word = request.data.get('word')
        inclusion_points = json.loads(request.data.get('inclusion_points'))
        exclusion_points = json.loads(request.data.get('exclusion_points'))
        bounding_boxes = json.loads(request.data.get('bounding_box'))
        model = json.loads(request.data.get('model'))
        
        # contour fidelity setting: 0 = low, 1 = medium, 2 = high
        contour_fidelity = json.loads(request.data.get('contour_fidelity'))

        # Get max_points from request data (optional)
        max_points = request.data.get('max_points')
        max_points = int(max_points) if max_points else None

        if not image_hash or not word:
            return Response(
                {"error": "Missing required fields: 'file_hash' and/or 'word'."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check for presence of either bounding_boxes or both inclusion_points and exclusion_points
        if not bounding_boxes and not (inclusion_points or exclusion_points):
            return Response(
                {
                    "error": "Provide either 'bounding_box' or both 'inclusion_points' and 'exclusion_points'."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # Get and open image
        image = get_object_or_404(Image, file_hash=image_hash)
        image_file = image.file

        if not image_file:
            return Response(
                {"error": "Image file not found."},
                status=status.HTTP_404_NOT_FOUND
            )
        
        try:
            with image_file.open('rb') as img:
                imgObject = PILImage.open(img).convert('RGB')  # Ensure image is in RGB
                width_scale, height_scale = imgObject.size  # Get width and height
        except Exception as e:
            print(f"Error opening image file: {e}")
            return Response(
                {"error": "Failed to open image file."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        if bounding_boxes:
            # Validate bounding_boxes structure
            if not isinstance(bounding_boxes, list):
                return Response(
                    {"error": "'bounding_box' must be a list of four numbers: [x1, y1, x2, y2]."},
                    status=status.HTTP_400_BAD_REQUEST
                )
            # Transform and scale the points
            bounding_boxes = [
                [[sublist[0] * width_scale, sublist[1] * height_scale], [sublist[2] * width_scale, sublist[3] * height_scale]]
                for sublist in bounding_boxes
            ]
        else:
            # Ensure inclusion_points and exclusion_points are properly structured
            if not (isinstance(inclusion_points, list) or isinstance(exclusion_points, list)):
                return Response(
                    {"error": "'inclusion_points' and 'exclusion_points' must be lists of points."},
                    status=status.HTTP_400_BAD_REQUEST
                )
            inclusion_points = [[point['x'], point['y']] for point in inclusion_points]
            exclusion_points = [[point['x'], point['y']] for point in exclusion_points]
            # Scale the points
            scaled_inclusion_points = [[point[0] * width_scale, point[1] * height_scale] for point in inclusion_points]
            scaled_exclusion_points = [[point[0] * width_scale, point[1] * height_scale] for point in exclusion_points]

        try:
            if bounding_boxes:
                mask_array = my_sam.generateMask(
                    imgObject, 
                    boundingBoxes=bounding_boxes,
                    model=model
                )
            else:
                mask_array = my_sam.generateMask(
                    imgObject, 
                    inclusionPoints=scaled_inclusion_points, 
                    exclusionPoints=scaled_exclusion_points,
                    model=model
                )
        except Exception as e:
            print(f"Error generating mask: {e}")
            return Response(
                {"error": "Failed to generate mask."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        img_arr = np.array(imgObject)
        total_mask = np.zeros((height_scale, width_scale), dtype=np.uint8)

        if len(np.shape(mask_array)) == 3:
            # print("Shape of mask passed with 3 dims is: ", np.shape(mask_array))
            mask_image = np.squeeze(mask_array)
            # print(np.shape(mask_image))
            total_mask = total_mask + mask_image
        else:
            for mask in mask_array:
                mask_image = np.squeeze(mask)
                # print("First squeeze", np.shape(mask_image))
                total_mask = total_mask + mask_image

        alpha_channel = (total_mask * 255).astype(np.uint8)
        img_arr_with_alpha = np.dstack((img_arr[..., :3], alpha_channel))
        mask_png = PILImage.fromarray(img_arr_with_alpha, 'RGBA')

        # contours = generate_contour_from_mask(total_mask, imgObject.size, max_points=10)
        # contours_json = format_contours_to_json(word, contours)

        temp = visualize_contours(total_mask,1000,0.5, visualise=False)
        contours_json = format_contours_to_json(word,temp)


        # Save the PIL Image to an in-memory file
        buffer = BytesIO()
        try:
            mask_png.save(buffer, format='PNG')
        except Exception as e:
            print(f"Error saving mask image to buffer: {e}")
            return Response(
                {"error": "Failed to save mask image."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        mask_filename = f"mask_{uuid.uuid4()}.png"
        mask_content = ContentFile(buffer.getvalue(), name=mask_filename)

        # Handle Word association
        try:
            word_obj, created = Word.objects.get_or_create(
                image=image,
                word=word
            )
        except Exception as e:
            print(f"Error retrieving or creating Word object: {e}")
            return Response(
                {"error": "Failed to retrieve or create Word object."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        # Create and save the Mask instance
        try:
            new_mask = Mask.objects.create(
                maskImage=mask_content,
                image=image,
                word=word_obj,
                contours=contours_json  # Store contours in the Mask object
            )
        except Exception as e:
            print(f"Error saving Mask instance: {e}")
            return Response(
                {"error": "Failed to save mask to the database."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        # Return a success response with mask details and contours
        return Response(
            {
                "message": "Mask generated and saved successfully!",
                "mask": {
                    "uuid": str(new_mask.uuid),
                    "maskImage": request.build_absolute_uri(new_mask.maskImage.url),
                    "image_id": image.file_hash,
                    "word": word_obj.word,
                    #"contours": contours
                }
            },
            status=status.HTTP_201_CREATED
        )


### get exhaustive list of images
class ListImagesView(ListAPIView):
    queryset = Image.objects.all() 
    serializer_class = ImageSerializer

class MaskViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Mask.objects.all()
    serializer_class = MaskSerializer

    @action(detail=False, methods=['get'], url_path='by-image/(?P<file_hash>[^/.]+)')
    def by_image(self, request, file_hash=None):

        image = get_object_or_404(Image, file_hash=file_hash)
        masks = Mask.objects.filter(image=image)
        serializer = self.get_serializer(masks, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'], url_path='by-image/(?P<file_hash>[^/.]+)/by-word/(?P<word>[^/.]+)')
    def by_image_and_word(self, request, file_hash=None, word=None):
        image = get_object_or_404(Image, file_hash=file_hash)
        word_obj = get_object_or_404(Word, image=image, word=word)
        mask = Mask.objects.filter(image=image, word=word_obj)
        
        if not mask:
            return Response({"detail": "Mask not found for the given image and word."}, status=status.HTTP_404_NOT_FOUND)
        
        serializer = self.get_serializer(mask, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'], url_path='contours/(?P<file_hash>[^/.]+)/(?P<word>[^/.]+)')
    def get_contours(self, request, file_hash=None, word=None):
        image = get_object_or_404(Image, file_hash=file_hash)
        word_obj = get_object_or_404(Word, image=image, word=word)
        mask = get_object_or_404(Mask, image=image, word=word_obj)
        
        return Response(mask.contours, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['get'], url_path='contours/(?P<file_hash>[^/.]+)')
    def get_all_contours(self, request, file_hash=None):
        image = get_object_or_404(Image, file_hash=file_hash)
        
        masks = Mask.objects.filter(image=image)
        
        contours_dict = {}
        
        for mask in masks:
            word = mask.word.word if mask.word else 'unassociated'

            if word in contours_dict:
                contours_dict[word].append(mask.contours)
            else:
                contours_dict[word] = [mask.contours]

        return Response({'contours': contours_dict}, status=status.HTTP_200_OK)
    
class DeleteMaskView(APIView):
    def delete(self, request, *args, **kwargs):
        image_hash = request.query_params.get('image_hash')
        word_text = request.query_params.get('word')

        if not image_hash or not word_text:
            return Response(
                {"error": "Both 'image_hash' and 'word' parameters are required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Get the Image instance with the specified file_hash
        image = get_object_or_404(Image, file_hash=image_hash)

        # Get the Word instance associated with the image and the specified word
        word = get_object_or_404(Word, image=image, word=word_text)

        # Get the Mask instance associated with the image and word
        mask = get_object_or_404(Mask, image=image, word=word)

        # Delete the mask and its associated image file
        mask.delete()

        return Response(
            {"message": "Mask deleted successfully."},
            status=status.HTTP_204_NO_CONTENT
        )
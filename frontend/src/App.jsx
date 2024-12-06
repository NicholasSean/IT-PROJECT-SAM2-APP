import { useState, useEffect } from 'react';
import { MdOutlineFileUpload } from 'react-icons/md';
import Thumbnail from './components/Thumbnail.jsx';
import Prompt from './components/Prompt.jsx';
import Toolbar from './components/Toolbar.jsx';
import Endpoint from './services/Endpoints.jsx';
import HelpIcon from './components/icons/HelpIcon.jsx';
import HelpPopup from './components/HelpPopup.jsx';
import SettingsIcon from './components/icons/SettingsIcon.jsx';
import SettingsPopup from './components/SettingsPopup.jsx';
import './styles/App.css';

const App = () => {
  // state for managing images
  const [images, setImages] = useState([]);
  // state for managing index of currently selected image
  const [selectedImageIndex, setSelectedImageIndex] = useState(null);

  // state for displaying help instructions
  const [isDisplayingHelp, setIsDisplayingHelp] = useState(false);
  // state for displaying settings
  const [isDisplayingSettings, setIsDisplayingSettings] = useState(false);

  const [autoSegmentToolSetting, setAutoSegmentToolSetting] = useState(3);
  const [jsonContourSetting, setJsonContourSetting] = useState(2);

  const selectedImage = images[selectedImageIndex] || null;

  const handleOptimisticImageUpload = async (event) => {
    const file = event.target.files[0];
    if (file) {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        alert('Please upload a valid image file (JPEG, PNG, or WebP).');
        return;
      }

      // Generate a temporary URL for local display
      const reader = new FileReader();
      let loaded = false;
      reader.onloadend = () => {
        const tempImage = {
          src: reader.result, // Temporary local URL
          name: file.name,
          annotations: [],
          status: 'uploading', // New status field to track upload
          inclusionPoints: [],
          exclusionPoints: [],
          boundingBoxes: [],
          selectedWord: null,
          masks: [],
        };

        // Optimistically add to frontend before starting the upload
        setImages((prevImages) => {
          const newImages = [...prevImages, tempImage];
          setSelectedImageIndex(newImages.length - 1); // Set selected image index to the new image
          return newImages;
        });
        loaded = true;

        // create Image object to get natural/pixel dimensions
        const imgElement = new Image();
        imgElement.src = reader.result;

        // wait for Image to load
        imgElement.onload = () => {
          const naturalWidth = imgElement.naturalWidth;
          const naturalHeight = imgElement.naturalHeight;

          // Update the tempImage in images state with natural dimensions
          setImages((prevImages) =>
            prevImages.map((img) =>
              img.name === tempImage.name && img.status === tempImage.status
                ? { ...img, naturalWidth, naturalHeight }
                : img,
            ),
          );
        };
      };
      reader.readAsDataURL(file);

      // Now handle backend upload
      try {
        const formData = new FormData();
        formData.append('image', file);
        formData.append('name', file.name);

        const response = await Endpoint.post('upload/', formData);

        // Wait for images to contain the uploaded image to avoid premature update
        // This would only occur in cases where a response is receved before the
        // first call to setImages
        while (!loaded) {
          await new Promise((resolve) => setTimeout(resolve, 10));
        }

        // Once upload completes, update the image in the frontend with backend data
        setImages((prevImages) =>
          prevImages.map((img) =>
            img.name === response.data.imageName && img.status === 'uploading'
              ? {
                  ...img,
                  // Update following properties
                  src: response.data.imageLocation,
                  file_hash: response.data.file_hash,
                  status: 'uploaded',
                } // Sync with backend
              : img,
          ),
        );
      } catch (error) {
        // handle duplicate detected
        if (error.response && error.response.status === 400) {
          // Check if the error message matches the "duplicate image" message
          if (error.response.data.message === 'This image has already been uploaded.') {
            // Wait for images to contain the uploaded image to avoid premature update
            while (!loaded) {
              await new Promise((resolve) => setTimeout(resolve, 10));
            }
            setImages((prevImages) =>
              prevImages.filter((img) => !(img.name === file.name && img.status === 'uploading')),
            );
            setSelectedImageIndex((prevImages) => prevImages.length - 1);
          }
        }
      }

      // reset file input for re-upload
      event.target.value = '';
    }
  };

  // handle backend fetch images, and display said images
  const handleImageRefresh = async () => {
    try {
      const imagesResponse = await Endpoint.get('images/');
      const imageData = imagesResponse.data;

      // Map the image data to match the structure used in your frontend
      const newImages = await Promise.all(
        imageData.map(async (image, index) => {
          // sort word_masks by word (so indexes of masks and annotations array are uniform)
          imageData[index].word_masks.sort((a, b) => {
            if (a.word < b.word) {
              return -1;
            } else if (a.word === b.word) {
              return 0;
            } else {
              return 1;
            }
          });

          const newImage = {
            src: image.file, // URL of the image
            name: image.name, // Name of the image
            file_hash: image.file_hash,
            annotations: [],
            inclusionPoints: [],
            exclusionPoints: [],
            boundingBoxes: [],
            selectedWord: null,
            masks: imageData[index].word_masks.map((word_mask) => {
              if (!word_mask.associated_masks) {
                return null;
              }

              return word_mask.associated_masks[0];
            }),
          };

          const wordResponse = await Endpoint.get('word/', {
            params: {
              image_hash: image.file_hash, // Pass the file hash of the selected image
            },
          });

          // Extract words from the response, AND sort alphabetically (REQUIRED for mask to word mapping)
          const words = wordResponse.data.words.map((wordObj) => wordObj.word).sort();
          newImage.annotations = words;

          // create Image object to get natural/pixel dimensions
          const imgElement = new Image();
          imgElement.src = newImage.src;

          // wait for Image to load
          imgElement.onload = () => {
            newImage.naturalWidth = imgElement.naturalWidth;
            newImage.naturalHeight = imgElement.naturalHeight;
          };

          return newImage;
        }),
      );

      //update array
      setImages(newImages);
      setSelectedImageIndex(newImages.length - 1);

      console.log();
    } catch (error) {
      console.error('Error fetching images:', error);
    }
  };

  // fetch iamges when website mounted
  useEffect(() => {
    handleImageRefresh(); // Initial image load
  }, []);

  // Call this to update the backend with the selected image.
  const handleSelectImage = (index) => {
    setSelectedImageIndex(index);
    const selectedImage = images[index];
    updateLastSelectedImage(selectedImage);
  };

  // Update the backend with the newly selected image
  const updateLastSelectedImage = async (selectedImage) => {
    try {
      console.log('Sending selected image to backend:', { imageHash: selectedImage.file_hash });
      await Endpoint.post('select-image/', { imageHash: selectedImage.file_hash });
      console.log('Last selected image updated successfully.', selectedImage);
    } catch (error) {
      console.error('Error updating last selected image:', error);
    }
  };

  // effect to initialize the CSRF cookie by making a GET request
  useEffect(() => {
    const initializeCsrf = async () => {
      try {
        // make GET request to any Django endpoint to set CSRF cookie
        await Endpoint.get('csrf-token/');
      } catch (error) {
        console.error('Error initializing CSRF token:', error);
      }
    };

    initializeCsrf();
  }, []);

  useEffect(() => {}, [selectedImage]);

  // handles frontend image deletion and state update
  const handleDeleteImage = (index) => {
    setImages((prevImages) => {
      // remove deleted image from old images array
      const updatedImages = prevImages.filter((_, i) => i !== index);

      // determine new selected index
      let newIndex = selectedImageIndex;

      if (index === selectedImageIndex) {
        let newBufLen = updatedImages.length;

        // try to select next image
        if (newBufLen >= 1) {
          if (selectedImageIndex >= newBufLen) {
            --newIndex;
          }
          // if final image was deleted, clear image preview
        } else {
          newIndex = null;
        }
      } else if (selectedImageIndex >= 1) {
        // preserve previous selection based on its position relative to `index`
        newIndex -= index > selectedImageIndex ? 0 : 1;
      } else {
        newIndex = 0;
      }

      setSelectedImageIndex(newIndex);
      return updatedImages;
    });
  };

  // CSRF token retrieval
  // one difference
  const getCsrfToken = () => {
    const cookieValue = document.cookie
      .split('; ')
      .find((row) => row.startsWith('csrftoken='))
      ?.split('=')[1];
    return cookieValue || '';
  };

  // handle backend image deletion
  const handleDeletionRequest = async (index) => {
    const imageToDelete = images[index];

    if (!imageToDelete) return;

    try {
      // fetch the CSRF token from cookies
      const csrfToken = getCsrfToken();
      const headers = {
        // include CSRF token in the headers
        'X-CSRFToken': csrfToken,
      };

      // send DELETE request with CSRF token
      await Endpoint.delete(`delete/${imageToDelete.file_hash}/`, { headers });

      // remove the image from the frontend state
      handleDeleteImage(index);
    } catch (error) {
      console.error('Error deleting image:', error);
    }
  };

  // determine if there are images to display
  const hasImages = images.length > 0;

  // get the currently selected image
  return (
    <div
      className={`app ${hasImages ? 'tool-layout' : 'prompt-layout'} ${
        isDisplayingHelp || isDisplayingSettings ? 'disable' : ''
      }`}
    >
      {!hasImages && <Prompt />}

      {selectedImage && (
        <Toolbar
          setImages={setImages}
          selectedImageIndex={selectedImageIndex}
          selectedImage={selectedImage}
          autoSegmentToolSetting={autoSegmentToolSetting}
          jsonContourSetting={jsonContourSetting}
        />
      )}

      <div className="bottom-row">
        {hasImages && (
          <button className="icon-button settings" onClick={() => setIsDisplayingSettings(true)}>
            <SettingsIcon />
          </button>
        )}

        <div className={`img-input ${!hasImages ? 'pulsate' : ''}`}>
          {hasImages && (
            <div className="img-buf">
              {images.map((image, index) => (
                <Thumbnail
                  key={index}
                  image={image}
                  index={index}
                  isSelected={selectedImageIndex === index}
                  onSelect={handleSelectImage}
                  onDelete={handleDeletionRequest}
                />
              ))}
            </div>
          )}
          <label htmlFor="img-input-elem" className="img-upload-btn">
            <MdOutlineFileUpload className="img-upload-btn-icon" />
            <div className="img-upload-btn-text">Upload</div>
            <input
              data-testid="img-input-elem"
              id="img-input-elem"
              type="file"
              onChange={handleOptimisticImageUpload}
              accept="image/jpeg, image/png, image/webp"
            />
          </label>
        </div>

        {hasImages && (
          <button className="icon-button" onClick={() => setIsDisplayingHelp(true)}>
            <HelpIcon />
          </button>
        )}
      </div>

      {isDisplayingSettings && (
        <SettingsPopup
          className="settings-popup-component"
          isVisible={isDisplayingSettings}
          onClose={() => setIsDisplayingSettings(false)}
          autoSegmentToolSetting={autoSegmentToolSetting}
          setAutoSegmentToolSetting={setAutoSegmentToolSetting}
          jsonContourSetting={jsonContourSetting}
          setJsonContourSetting={setJsonContourSetting}
        />
      )}

      {isDisplayingHelp && (
        <HelpPopup
          className="help-popup-component"
          isVisible={isDisplayingHelp}
          onClose={() => setIsDisplayingHelp(false)}
        />
      )}
    </div>
  );
};

export default App;

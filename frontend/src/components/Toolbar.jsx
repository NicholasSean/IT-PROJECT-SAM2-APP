import { useState, useEffect, useRef } from 'react';
import JSZip from 'jszip';
import Endpoint from '../services/Endpoints';
import '../styles/Toolbar.css';
import ImagePreview from './ImagePreview';
import AnnotationItem from './AnnotationItem';
import AutoSegmentIcon from './icons/AutoSegmentIcon';
import InclusionPointIcon from './icons/InclusionPointIcon';
import ExclusionPointIcon from './icons/ExclusionPointIcon';
import BoundingBoxIcon from './icons/BoundingBoxIcon';
import EraserIcon from './icons/EraserIcon';
import ClearAllIcon from './icons/ClearAllIcon';
import DownloadSelectedIcon from './icons/DownloadSelectedIcon';
import DownloadAllIcon from './icons/DownloadAllIcon';

const Toolbar = ({
  setImages,
  selectedImageIndex,
  selectedImage,
  autoSegmentToolSetting,
  jsonContourSetting,
}) => {
  // state for determining whether annotation input is active
  const [isAddingAnnotation, setIsAddingAnnotation] = useState(false);
  // state for managing new annotation text
  const [newAnnotation, setNewAnnotation] = useState('');
  // ref for annotation input element
  const annotationInputRef = useRef(null);
  // state for toggling inclusion point tool
  const [activeTool, setActiveTool] = useState(null);
  // state for checking if auto segment tool is in progress
  const [autoSegmentInProgress, setAutoSegmentInProgress] = useState(false);
  // state for the text inside the Auto Segment button
  const [autoSegmentButtonText, setAutoSegmentButtonText] = useState('Auto Segment');
  // state for showing blinking cursor in Auto Segment button typing effect
  const [showBlinkingCursor, setShowBlinkingCursor] = useState(false);

  const [isDownloadAsJson, setIsDownloadAsJson] = useState(true);

  // handle clicks outside the annotation input
  const handleClickOutside = (event) => {
    if (!annotationInputRef.current?.contains(event.target)) {
      setNewAnnotation('');
      setIsAddingAnnotation(false);
    }
  };

  // effect to handle a click outside input box, cancelling annotation input
  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Fetches the annotations from the backend and updates the state
  //  const fetchAnnotations = async () => {
  //   if (!selectedImage || !selectedImage.file_hash) {
  //     console.log('No selected image to fetch annotations for.');
  //     return;
  //   }

  //   try {
  //     const response = await Endpoint.get('word/', {
  //       params: {
  //         image_hash: selectedImage.file_hash, // Pass the file hash of the selected image
  //       },
  //     });

  //     const words = response.data.words.map((wordObj) => wordObj.word); // Extract words from the response

  //     // Update the selected image's annotations in the state
  //     setImages((prevImages) => {
  //       const updatedImages = [...prevImages];
  //       const selectedImageCopy = { ...updatedImages[selectedImageIndex] };
  //       selectedImageCopy.annotations = words;
  //       updatedImages[selectedImageIndex] = selectedImageCopy;
  //       return updatedImages;
  //     });

  //     console.log('Annotations fetched successfully:', words);
  //   } catch (error) {
  //     console.error('Error fetching annotations:', error);
  //   }
  // };

  // Call fetchAnnotations when the component loads or when selectedImage changes
  // useEffect(() => {
  //   fetchAnnotations();
  // }, []);

  // handle changes in annotation input field
  const handleAnnotationChange = (event) => {
    setNewAnnotation(event.target.value);
  };

  // handle keypress events in annotation input
  const handleKeyPress = (event) => {
    if (event.key === 'Enter' && newAnnotation.trim() !== '') {
      optimisticAddAnnotation(newAnnotation.trim());
      setNewAnnotation('');
      // setIsAddingAnnotation(false);
    } else if (event.key === 'Escape' || event.key === 'Tab') {
      setNewAnnotation('');
      setIsAddingAnnotation(false);
    }
  };

  // Function to handle the optimistic addition of a new annotation
  const optimisticAddAnnotation = (annotation) => {
    setImages((prevImages) => {
      if (selectedImageIndex === null) return prevImages;

      const updatedImages = [...prevImages];
      const selectedImage = { ...updatedImages[selectedImageIndex] };

      // Check for duplicate annotations
      if (!selectedImage.annotations.includes(annotation)) {
        // Add the new annotation to the annotations array
        selectedImage.annotations = [...selectedImage.annotations, annotation];
        updatedImages[selectedImageIndex] = selectedImage;

        // Call the backend upload function
        handleWordUpload(selectedImage.file_hash, annotation);
      }

      return updatedImages;
    });
  };

  // Function to handle the backend upload of a word
  const handleWordUpload = async (image_hash, word) => {
    const formData = new FormData();
    formData.append('associated_image', image_hash);
    formData.append('word', word);

    try {
      const response = await Endpoint.post('word/', formData);
      console.log('Word uploaded successfully:', response.data);
    } catch (error) {
      console.error('Error uploading word:', error);
      // Optionally, revert the optimistic update in case of an error
      setImages((prevImages) => {
        const updatedImages = [...prevImages];
        const selectedImage = { ...updatedImages[selectedImageIndex] };
        selectedImage.annotations = selectedImage.annotations.filter(
          (annotation) => annotation !== word,
        );
        updatedImages[selectedImageIndex] = selectedImage;
        return updatedImages;
      });
    }
  };

  // activates annotation input
  const handleInputAnnotation = () => {
    setIsAddingAnnotation(true);
  };

  // Function to handle the backend update of a word
  const handleWordUpdate = async (image_hash, oldWord, newWord, rollback) => {
    // Prepare query parameters
    const params = new URLSearchParams({
      associated_image: image_hash,
      old_word: oldWord,
      new_word: newWord,
    }).toString();

    try {
      const response = await Endpoint.put(`/word/?${params}`);
      console.log('Word updated successfully:', response.data);
    } catch (error) {
      console.error('Error updating word:', error);
      // Rollback to the old state in case of an error
      rollback();
    }
  };

  // update the annotation stored at the given index of the currently selected image
  const handleEditAnnotation = (index, updatedAnnotation) => {
    if (selectedImageIndex === null) return;

    const oldAnnotation = selectedImage.annotations[index];
    const newAnnotation = updatedAnnotation.trim();

    // Only proceed if new annotation does not already exist
    if (selectedImage.annotations.includes(newAnnotation)) {
      return;
    }

    // Only proceed if the new annotation is different from the old one
    if (newAnnotation && newAnnotation !== oldAnnotation) {
      // Update selected word if necessary
      if (oldAnnotation === selectedImage.selectedWord) {
        selectedImage.selectedWord = newAnnotation;
      }

      // Prepare a rollback function to revert changes if the backend update fails
      const rollback = () => {
        setImages((prevImages) => {
          const updatedImages = [...prevImages];
          const selectedImageCopy = { ...updatedImages[selectedImageIndex] };
          selectedImageCopy.annotations[index] = oldAnnotation; // Revert to the old annotation
          updatedImages[selectedImageIndex] = selectedImageCopy;
          return updatedImages;
        });
      };

      // Optimistically update the frontend state
      setImages((prevImages) => {
        const updatedImages = [...prevImages];
        const selectedImageCopy = { ...updatedImages[selectedImageIndex] };
        selectedImageCopy.annotations[index] = newAnnotation; // Update to the new annotation
        updatedImages[selectedImageIndex] = selectedImageCopy;
        return updatedImages;
      });

      // Call the backend update function with the rollback logic
      handleWordUpdate(selectedImage.file_hash, oldAnnotation, newAnnotation, rollback);
    }
  };

  // handle deleting an existing annotation
  const handleDeleteAnnotation = async (event, index) => {
    // prevent annotation from being selected as selectedWord
    event.stopPropagation();

    if (selectedImageIndex === null) return;

    const imageAssociatedWithWord = selectedImage; // This is the image associated with the word being modified.
    const maskAssociatedWithWord = selectedImage.masks[index]; // may not exist since no mask generated for word yet
    const annotationToDelete = imageAssociatedWithWord.annotations[index];

    if (!annotationToDelete) return;

    // If annotation is selected, set selected annotation word to null
    if (annotationToDelete === selectedImage.selectedWord) {
      selectedImage.selectedWord = null;
    }

    console.log('image hash: ', imageAssociatedWithWord.file_hash);
    console.log('word: ', annotationToDelete);
    try {
      // TODO: delete mask logic should also be inside here
      // use maskAssociatedWithWord to get relevant info for backend deletion

      // Prepare query parameters for the DELETE request
      const params = new URLSearchParams({
        associated_image: selectedImage.file_hash,
        word: annotationToDelete,
      }).toString();

      // Send the DELETE request to the backend with query parameters
      const response = await Endpoint.delete(`/word/?${params}`);

      if (response.status === 200) {
        // Under Strict mode, this runs twice when the annotation is also the selected word,
        // causing an additional annotation at the next index to also be deleted
        // from the front-end (back-end annotation remains).
        setImages((prevImages) => {
          const updatedImages = [...prevImages];
          const selectedImage = updatedImages[selectedImageIndex];
          selectedImage.annotations = selectedImage.annotations.filter((_, i) => i !== index); // also delete corresponding mask from frontend
          selectedImage.masks = selectedImage.masks.filter((_, i) => i !== index);
          updatedImages[selectedImageIndex] = selectedImage;
          return updatedImages;
        });
      } else {
        console.error('Failed to delete annotation:', response.data.message);
      }
    } catch (error) {
      console.error('Error deleting annotation:', error);
    }
  };

  const addInclusionPoint = (x, y) => {
    if (activeTool !== 'Inclusion Point') {
      return;
    }

    const updatedImage = { ...selectedImage };

    if (!updatedImage.inclusionPoints) {
      updatedImage.inclusionPoints = [];
    }

    updatedImage.inclusionPoints.push({ x, y });

    setImages((prevImages) =>
      prevImages.map((prevImage, index) =>
        index === selectedImageIndex ? updatedImage : prevImage,
      ),
    );
  };

  const removeInclusionPoint = (x, y) => {
    const updatedImage = { ...selectedImage };

    updatedImage.inclusionPoints = updatedImage.inclusionPoints.filter(
      (point) => point.x !== x || point.y !== y,
    );

    setImages((prevImages) =>
      prevImages.map((prevImage, index) =>
        index === selectedImageIndex ? updatedImage : prevImage,
      ),
    );
  };

  const addExclusionPoint = (x, y) => {
    if (activeTool !== 'Exclusion Point') {
      return;
    }

    const updatedImage = { ...selectedImage };

    if (!updatedImage.exclusionPoints) {
      updatedImage.exclusionPoints = [];
    }

    updatedImage.exclusionPoints.push({ x, y });

    setImages((prevImages) =>
      prevImages.map((prevImage, index) =>
        index === selectedImageIndex ? updatedImage : prevImage,
      ),
    );
  };

  const removeExclusionPoint = (x, y) => {
    const updatedImage = { ...selectedImage };

    updatedImage.exclusionPoints = updatedImage.exclusionPoints.filter(
      (point) => point.x !== x || point.y !== y,
    );

    setImages((prevImages) =>
      prevImages.map((prevImage, index) =>
        index === selectedImageIndex ? updatedImage : prevImage,
      ),
    );
  };

  const addBoundingBox = (x1, y1, x2, y2) => {
    if (activeTool !== 'Bounding Box') {
      return;
    }

    const updatedImage = { ...selectedImage };

    if (!updatedImage.boundingBoxes) {
      updatedImage.boundingBoxes = [];
    }

    updatedImage.boundingBoxes.push([x1, y1, x2, y2]);

    setImages((prevImages) =>
      prevImages.map((prevImage, index) =>
        index === selectedImageIndex ? updatedImage : prevImage,
      ),
    );
  };

  const removeBoundingBox = (x1, y1, x2, y2) => {
    const updatedImage = { ...selectedImage };

    updatedImage.boundingBoxes = updatedImage.boundingBoxes.filter(
      ([x1_, y1_, x2_, y2_]) => x1_ !== x1 || y1_ !== y1 || x2_ !== x2 || y2_ !== y2,
    );

    setImages((prevImages) =>
      prevImages.map((prevImage, index) =>
        index === selectedImageIndex ? updatedImage : prevImage,
      ),
    );
  };

  const handleClearAll = () => {
    // remove all SAM2 points from image
    const updatedImage = {
      ...selectedImage,
      inclusionPoints: [],
      exclusionPoints: [],
      boundingBoxes: [],
    };

    setImages((prevImages) =>
      prevImages.map((prevImage, index) =>
        index === selectedImageIndex ? updatedImage : prevImage,
      ),
    );
  };

  const handleToolClick = (tool) => {
    setActiveTool(activeTool === tool ? null : tool);
  };

  const setSelectedWordOfSelectedImage = (newSelectedWord) => {
    // Update selected word
    setImages((prevImages) =>
      prevImages.map((prevImage) =>
        prevImage === selectedImage ? { ...prevImage, selectedWord: newSelectedWord } : prevImage,
      ),
    );
  };

  const handleSAM2request = async () => {
    console.log('handle sam2 request');
    const imageTarget = selectedImage.file_hash || null;
    if (!selectedImage) {
      console.log('Selected Image was not found');
      return;
    }

    // check if selected word already has a mask associated with it
    const indexOfSelectedWord = selectedImage.annotations.indexOf(selectedImage.selectedWord);
    if (selectedImage.masks[indexOfSelectedWord]) {
      console.log(`deleting existing mask for ${selectedImage.annotations[indexOfSelectedWord]}`);
      // if it does, delete it from backend, so that the newly created one replaces it
      handleBackendMaskDelete(selectedImage.file_hash, selectedImage.selectedWord);
    }

    const formData = new FormData();
    formData.append('file_hash', imageTarget);
    formData.append('inclusion_points', JSON.stringify(selectedImage.inclusionPoints));
    formData.append('exclusion_points', JSON.stringify(selectedImage.exclusionPoints));
    formData.append('bounding_box', JSON.stringify(selectedImage.boundingBoxes));
    formData.append('word', selectedImage.selectedWord);
    formData.append('model', autoSegmentToolSetting);
    formData.append('contour_fidelity', jsonContourSetting);

    try {
      setAutoSegmentInProgress(true);
      startTypingEffect();

      const response = await Endpoint.post('sam2/', formData);
      fetchMasksByImageByWord(selectedImage.file_hash, selectedImage.selectedWord);

      setAutoSegmentInProgress(false);
      endTypingEffect();
    } catch (error) {
      console.error('Error uploading image:', error);
    }
  };

  // typing effect to indicate Auto Segment tool is loading
  const startTypingEffect = () => {
    const baseText = 'Auto Segment';
    // text that is to be added to the base text
    const suffix = 'ing...';
    const typingDelay = 60;

    setShowBlinkingCursor(true);

    let currText = baseText;
    suffix.split('').forEach((char, i) => {
      setTimeout(() => {
        currText += char;
        setAutoSegmentButtonText(currText);
      }, (i + 1) * typingDelay);
    });
  };

  // deletes text added by startTypingEffect
  const endTypingEffect = () => {
    const baseText = 'Auto Segment';
    const suffix = 'ing...';
    const typingDelay = 66;

    let currText = baseText + suffix;
    for (let i = 0; i < suffix.length; i++) {
      setTimeout(() => {
        currText = currText.slice(0, -1);
        setAutoSegmentButtonText(currText);

        // remove blinking cursor once last character deleted
        if (i === suffix.length - 1) {
          setShowBlinkingCursor(false);
        }
      }, (i + 1) * typingDelay);
    }
  };

  // Function to fetch masks by image file_hash
  const fetchMasksByImage = async (fileHash) => {
    try {
      const response = await Endpoint.get(`api/masks/by-image/${fileHash}/`);
      console.log('Masks fetched successfully:', response.data);
    } catch (error) {
      console.error('Error fetching masks:', error);
    }
  };

  // Function to fetch masks by image file_hash
  const fetchMasksByImageByWord = async (fileHash, selected_word) => {
    try {
      console.log(selectedImage + 'word: ' + selected_word);
      const response = await Endpoint.get(
        `api/masks/by-image/${fileHash}/by-word/${selected_word}/`,
      );
      console.log('Masks fetched successfully:', response.data);

      // add masks to index i where i is the index of word in annotations list
      const indexOfSelectedWord = selectedImage.annotations.indexOf(selected_word);
      const updatedMasks = [...selectedImage.masks];
      updatedMasks[indexOfSelectedWord] = response.data[0];

      setImages((prevImages) =>
        prevImages.map((prevImage) =>
          prevImage === selectedImage
            ? {
                ...selectedImage,
                masks: updatedMasks,
                // reset SAM2 inputs
                inclusionPoints: [],
                exclusionPoints: [],
                boundingBoxes: [],
              }
            : prevImage,
        ),
      );
    } catch (error) {
      console.error('Error fetching masks:', error);
    }
  };

  const handleBackendMaskDelete = async (image_hash, word) => {
    try {
      // Send the DELETE request to the new endpoint with query parameters
      const response = await Endpoint.delete('delete-mask/', {
        params: {
          image_hash: image_hash,
          word: word,
        },
      });

      if (response.status === 204) {
        // Remove mask from frontend state
        console.log('Mask deleted successfully');
      } else {
        console.error('Failed to delete mask:', response.data.message);
      }
    } catch (error) {
      console.error('Error deleting mask:', error);
    }
  };

  // Function to fetch contours by image file_hash and word
  const fetchContoursByImageAndWord = async (fileHash, word) => {
    try {
      // just dont include the word here and youll get one big json
      const response = await Endpoint.get(`api/masks/contours/${fileHash}/${word}/`);
      console.log('Contours fetched successfully:', response.data);

      //
      // write in saving contours here or just return the contours
      //
    } catch (error) {
      console.error('Error fetching contours:', error);
    }
  };

  const handleDownloadSelectedMask = async () => {
    if (!selectedImage.selectedWord) {
      console.log('failed to download selected mask: no word selected');
      return;
    }

    const indexOfSelectedWord = selectedImage.selectedWord
      ? selectedImage.annotations.indexOf(selectedImage.selectedWord)
      : null;

    const selectedMask = selectedImage.masks[indexOfSelectedWord];

    const filename = `${selectedImage.selectedWord}-mask`;

    const link = document.createElement('a');
    if (isDownloadAsJson) {
      const maskData = {
        item: selectedImage.selectedWord,
        contours: selectedMask.contours.contours,
      };
      const jsonStr = JSON.stringify(maskData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });

      link.href = URL.createObjectURL(blob);
      link.download = `${filename}.json`;
    } else {
      try {
        // fetch png mask from server
        const response = await fetch(selectedMask.maskImage);

        if (!response.ok) {
          throw new Error('Issue with backend response');
        }

        const blob = await response.blob();
        link.href = URL.createObjectURL(blob);
        link.download = `${filename}.png`;
      } catch (error) {
        console.error('Failed to download PNG mask:', error);
        return;
      }
    }

    document.body.appendChild(link);
    link.click();

    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };

  const handleDownloadAllMasks = async () => {
    if (!selectedImage.masks.some((mask) => Boolean(mask))) {
      console.log('failed to download all masks: there are no masks to download');
      return;
    }

    const filename = 'all-masks';
    // get all defined masks
    const masks = selectedImage.masks.filter((mask) => Boolean(mask));

    if (isDownloadAsJson) {
      const allContours = masks.map((mask) => mask.contours);

      const masksData = {
        image_id: selectedImage.name,
        segments: allContours.map((contour) => ({
          item: contour.label,
          contours: contour.contours,
        })),
      };

      const jsonStr = JSON.stringify(masksData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });

      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${filename}.json`;

      document.body.appendChild(link);
      link.click();

      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    } else {
      const zip = new JSZip();

      for (let index = 0; index < selectedImage.masks.length; index++) {
        const mask = selectedImage.masks[index];

        if (!mask) {
          continue;
        }

        try {
          // Fetch png mask from server
          const response = await fetch(mask.maskImage);

          if (!response.ok) {
            throw new Error('Issue with backend response');
          }

          const blob = await response.blob();
          zip.file(`${filename}/${selectedImage.annotations[index]}-mask.png`, blob);
        } catch (error) {
          console.error('Failed to download PNG mask:', error);
          return;
        }
      }

      // Generate the ZIP file and trigger download
      zip
        .generateAsync({ type: 'blob' })
        .then((content) => {
          const zipFileName = 'all-masks.zip';
          const link = document.createElement('a');
          link.href = URL.createObjectURL(content);
          link.download = zipFileName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(link.href);
        })
        .catch((error) => {
          console.error('Error generating ZIP file:', error);
        });
    }
  };

  const canAutoSegment = selectedImage.inclusionPoints.length || selectedImage.boundingBoxes.length;

  // required to find the index of the mask to highlight
  const indexOfSelectedWord = selectedImage.selectedWord
    ? selectedImage.annotations.indexOf(selectedImage.selectedWord)
    : null;

  return (
    <>
      <div
        className={`toolbar ${selectedImage.selectedWord ? '' : 'hidden'}`}
        style={{ pointerEvents: autoSegmentInProgress ? 'none' : 'auto' }}
      >
        <button
          className={`auto-segment ${autoSegmentInProgress ? 'loading' : ''}`}
          onClick={handleSAM2request}
          disabled={!canAutoSegment || !selectedImage.selectedWord || autoSegmentInProgress}
        >
          <div className="button-content-container">
            <AutoSegmentIcon />
            <div>
              {autoSegmentButtonText}
              {showBlinkingCursor && <span className="blinking-cursor">|</span>}
            </div>
          </div>
        </button>

        <button
          className={`${activeTool === 'Inclusion Point' ? 'active' : ''}`}
          onClick={() => handleToolClick('Inclusion Point')}
          disabled={!selectedImage.selectedWord || selectedImage.boundingBoxes.length}
        >
          <div className="button-content-container">
            <InclusionPointIcon />
            Inclusion Point
          </div>
        </button>

        <button
          className={`${activeTool === 'Exclusion Point' ? 'active' : ''}`}
          onClick={() => handleToolClick('Exclusion Point')}
          disabled={!selectedImage.selectedWord}
        >
          <div className="button-content-container">
            <ExclusionPointIcon />
            Exclusion Point
          </div>
        </button>

        <button
          className={`${activeTool === 'Bounding Box' ? 'active' : ''}`}
          onClick={() => handleToolClick('Bounding Box')}
          disabled={!selectedImage.selectedWord || selectedImage.inclusionPoints.length}
        >
          <div className="button-content-container">
            <BoundingBoxIcon />
            Bounding Box
          </div>
        </button>

        <button
          className={`${activeTool === 'Eraser' ? 'active' : ''}`}
          onClick={() => handleToolClick('Eraser')}
        >
          <div className="button-content-container">
            <EraserIcon />
            Eraser
          </div>
        </button>

        <button className="clear-all" onClick={handleClearAll}>
          <div className="button-content-container">
            <ClearAllIcon />
            Clear All Prompts
          </div>
        </button>
      </div>
      <div
        className="annotations-preview-split"
        style={{ pointerEvents: autoSegmentInProgress ? 'none' : 'auto' }}
      >
        <div className="annotations-container">
          <div
            className={`annotations ${
              !selectedImage.annotations.length && !isAddingAnnotation ? 'pulsate' : ''
            }`}
          >
            <div className="annotation-input">
              {isAddingAnnotation && (
                <input
                  type="text"
                  value={newAnnotation}
                  onChange={handleAnnotationChange}
                  onKeyDown={handleKeyPress}
                  autoFocus
                  placeholder="Enter word..."
                  className="annotation-input-elem"
                  ref={annotationInputRef}
                />
              )}
              {/* TODO: make this an icon */}
              <button onClick={handleInputAnnotation} className={'annotation-input-btn'}>
                Add Annotation
              </button>
            </div>
            <div
              className="annotations-wrapper"
              style={{ marginBottom: selectedImage.annotations.length ? '0.3rem' : '0' }}
            >
              {selectedImage.annotations
                .map((annotation, index) => (
                  <AnnotationItem
                    key={index}
                    annotation={annotation}
                    index={index}
                    handleDeleteAnnotation={handleDeleteAnnotation}
                    handleEditAnnotation={handleEditAnnotation}
                    selectedWordOfSelectedImage={selectedImage.selectedWord}
                    setSelectedWordOfSelectedImage={setSelectedWordOfSelectedImage}
                  />
                ))
                .reverse()}
            </div>
          </div>
        </div>

        <ImagePreview
          image={selectedImage}
          activeTool={activeTool}
          addInclusionPoint={addInclusionPoint}
          removeInclusionPoint={removeInclusionPoint}
          addExclusionPoint={addExclusionPoint}
          removeExclusionPoint={removeExclusionPoint}
          addBoundingBox={addBoundingBox}
          removeBoundingBox={removeBoundingBox}
          toolsAreDisabled={!selectedImage.selectedWord}
          indexOfMaskToHighlight={indexOfSelectedWord}
        />

        <div className="download-buttons-container">
          <div className="download-buttons">
            <div
              className="switch-container"
              onClick={() => setIsDownloadAsJson(!isDownloadAsJson)}
            >
              <div
                className={`toggle ${isDownloadAsJson ? 'first-option' : 'second-option'}`}
              ></div>
              <div className="options">
                <span className={`first ${isDownloadAsJson ? 'active' : ''}`}>JSON </span>
                <span className={`second ${!isDownloadAsJson ? 'active' : ''}`}>PNG</span>
              </div>
            </div>

            <button
              // disable if no word selected, or selected word has no masks
              disabled={!selectedImage.selectedWord || !selectedImage.masks[indexOfSelectedWord]}
              className="download-selected-mask"
              onClick={handleDownloadSelectedMask}
            >
              <div className="button-content-container">
                <DownloadSelectedIcon />
                Download Selected
                <br />
                Segment
              </div>
            </button>
            <button
              disabled={!selectedImage.masks.some((mask) => Boolean(mask))} // if no masks, disable
              className="download-all-masks"
              onClick={handleDownloadAllMasks}
            >
              <div className="button-content-container">
                <DownloadAllIcon />
                Download All
                <br />
                Segments
              </div>
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default Toolbar;

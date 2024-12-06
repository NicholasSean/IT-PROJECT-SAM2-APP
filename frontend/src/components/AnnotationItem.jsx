import { useState, useEffect, useRef, useCallback } from 'react';
import { MdEdit } from 'react-icons/md';
import { RxCross2 } from 'react-icons/rx';
import '../styles/AnnotationItem.css';

const AnnotationItem = ({
  annotation,
  index,
  handleEditAnnotation,
  handleDeleteAnnotation,
  selectedWordOfSelectedImage,
  setSelectedWordOfSelectedImage,
}) => {
  // state for determining whether annotation is in 'edit' mode
  const [isEditingAnnotation, setIsEditingAnnotation] = useState(false);
  // state for managing edited annotation text
  const [editedAnnotation, setEditedAnnotation] = useState('');
  // ref for editing annotation div element
  const editingDivRef = useRef(null);

  // set initial edited annotation to the current annotation
  useEffect(() => {
    setEditedAnnotation(annotation);
  }, [annotation]);

  // memoize the handleClickOutside function to prevent unnecessary re-creations
  const handleClickOutside = useCallback(
    (event) => {
      if (isEditingAnnotation && !editingDivRef.current?.contains(event.target)) {
        setIsEditingAnnotation(false);
      }
    },
    [isEditingAnnotation],
  );

  // effect to handle a click outside editing annotation div, cancelling edit
  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [handleClickOutside]);

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && editedAnnotation.trim() !== '') {
      handleEditAnnotation(index, editedAnnotation);
      setIsEditingAnnotation(false);
      return;
    }

    if (event.key === 'Escape' || event.key === 'Tab') {
      setIsEditingAnnotation(false);
      return;
    }
  };

  const handleDoneClick = (event) => {
    // prevent annotation from being selected as selectedWord
    event.stopPropagation();

    if (editedAnnotation.trim() === '') {
      return;
    }

    handleEditAnnotation(index, editedAnnotation);
    setIsEditingAnnotation(false);
  };

  const handleEditButton = (event) => {
    // prevent annotation from being selected as selectedWord
    event.stopPropagation();
    setIsEditingAnnotation(true);
  };

  const handleAnnotationDivClick = () => {
    if (annotation === selectedWordOfSelectedImage) {
      setSelectedWordOfSelectedImage(null);
    } else {
      setSelectedWordOfSelectedImage(annotation);
    }
  };

  const handleEditedAnnotation = (event) => setEditedAnnotation(event.target.value);

  return (
    <div
      className={`annotation-item ${annotation === selectedWordOfSelectedImage ? 'selected' : ''} ${
        isEditingAnnotation ? 'editing' : ''
      }`}
      onClick={handleAnnotationDivClick}
      ref={editingDivRef}
    >
      {!isEditingAnnotation ? (
        <>
          <span className="annotation-text">{annotation}</span>
          <div className="annotation-actions">
            <button onClick={handleEditButton} aria-label="Edit Annotation">
              <MdEdit />
            </button>
            <button
              onClick={(event) => handleDeleteAnnotation(event, index)}
              aria-label="Delete Annotation"
            >
              <RxCross2 />
            </button>
          </div>
        </>
      ) : (
        <>
          <span className="annotation-text">
            <input
              type="text"
              value={editedAnnotation}
              onKeyDown={handleKeyDown}
              onChange={handleEditedAnnotation}
              autoFocus
              aria-label="Edit Annotation Input"
            />
          </span>
        </>
      )}
    </div>
  );
};

export default AnnotationItem;

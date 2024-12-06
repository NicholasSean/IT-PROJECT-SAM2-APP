import { useState, useRef } from 'react';
import '../styles/ImagePreview.css';

const ImagePreview = ({
  image,
  activeTool,
  addInclusionPoint,
  removeInclusionPoint,
  addExclusionPoint,
  removeExclusionPoint,
  addBoundingBox,
  removeBoundingBox,
  toolsAreDisabled,
  indexOfMaskToHighlight,
}) => {
  // state for managing 'shrink' animation of SAM2 points when they are removed
  const [inclusionPointShrinkIndex, setInclusionPointShrinkIndex] = useState(null);
  const [exclusionPointShrinkIndex, setExclusionPointShrinkIndex] = useState(null);
  const [boundingBoxShrinkIndex, setBoundingBoxShrinkIndex] = useState(null);
  // states for managing bounding boxes
  const [mouseIsDown, setMouseIsDown] = useState(false);
  const [startCoord, setStartCoord] = useState(null);
  const [currCoord, setCurrCoord] = useState(null);

  // png array of all masks to be displayed
  const pngMaskSrcs = image.masks.map((mask) => (mask ? mask.maskImage : null));

  // handles the addition of inclusion and exclusion points when img is clicked on
  const handleImageClick = (event) => {
    if (toolsAreDisabled) {
      return;
    }

    if (activeTool !== 'Inclusion Point' && activeTool !== 'Exclusion Point') {
      return;
    }

    const targetDiv = event.currentTarget;
    const rect = targetDiv.getBoundingClientRect();

    const relativeX = event.clientX - rect.left;
    const relativeY = event.clientY - rect.top;

    // value between 0 and 1, where (0,0) represents top-left corner, and (1,1) represents bottom-right corner
    const relativePixelX = relativeX / rect.width;
    const relativePixelY = relativeY / rect.height;

    // these functions handle whichever tool is active (i.e., wont add a point unless the corresponding tool is active)
    addExclusionPoint(relativePixelX, relativePixelY);
    addInclusionPoint(relativePixelX, relativePixelY);
  };

  // Handles the deletion of the clicked on inclusion point
  const handleInclusionPointClick = (x, y, index) => {
    if (activeTool !== 'Eraser') {
      return;
    }

    setInclusionPointShrinkIndex(index);
    setTimeout(() => {
      removeInclusionPoint(x, y);
      setInclusionPointShrinkIndex(null);
    }, 100); // 0.1s - the same as transition duration in ImagePreview.css
  };

  // Handles the deletion of the clicked on exclusion point
  const handleExclusionPointClick = (x, y, index) => {
    if (activeTool !== 'Eraser') {
      return;
    }

    setExclusionPointShrinkIndex(index);
    setTimeout(() => {
      removeExclusionPoint(x, y);
      setExclusionPointShrinkIndex(null);
    }, 100); // 0.1s - the same as transition duration in ImagePreview.css
  };

  const handleMouseDown = (event) => {
    if (toolsAreDisabled) {
      return;
    }

    if (activeTool !== 'Bounding Box') {
      return;
    }

    setMouseIsDown(true);
    console.log('mouse down');

    const rect = event.currentTarget.getBoundingClientRect();

    const relativeX = event.clientX - rect.left;
    const relativeY = event.clientY - rect.top;

    // value between 0 and 1, where (0,0) represents top-left corner, and (1,1) represents bottom-right corner
    const relativePixelX = relativeX / rect.width;
    const relativePixelY = relativeY / rect.height;

    setStartCoord({
      x: relativePixelX,
      y: relativePixelY,
    });

    setCurrCoord({
      x: relativePixelX,
      y: relativePixelY,
    });
  };

  const handleMouseMove = (event) => {
    if (toolsAreDisabled) {
      return;
    }

    if (activeTool !== 'Bounding Box') {
      return;
    }

    if (!mouseIsDown) {
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();

    const relativeX = event.clientX - rect.left;
    const relativeY = event.clientY - rect.top;

    // value between 0 and 1, where (0,0) represents top-left corner, and (1,1) represents bottom-right corner
    const relativePixelX = relativeX / rect.width;
    const relativePixelY = relativeY / rect.height;

    setCurrCoord({
      x: relativePixelX,
      y: relativePixelY,
    });
  };

  const handleMouseUp = () => {
    if (toolsAreDisabled) {
      return;
    }

    if (activeTool !== 'Bounding Box') {
      return;
    }

    setMouseIsDown(false);
    console.log('mouse is up');
    console.log(startCoord, currCoord);

    // record points to img

    // TO DO: enforce a minimum size of bounding box - tiny boxes shouldnt be recorded
    if (startCoord.x === currCoord.x || startCoord.y === currCoord.y) {
      console.log('aborting, bounding box must have +ve area');
      return;
    }

    addBoundingBox(startCoord.x, startCoord.y, currCoord.x, currCoord.y);
  };

  const handleBoundingBoxClick = (x1, y1, x2, y2, index) => {
    if (activeTool !== 'Eraser') {
      return;
    }
    console.log('erasing');
    setBoundingBoxShrinkIndex(index);
    setTimeout(() => {
      removeBoundingBox(x1, y1, x2, y2);
      setBoundingBoxShrinkIndex(null);
    }, 200); // 0.2s - the same as transition duration in ImagePreview.css
  };

  const inclusionPoints = image.inclusionPoints || [];
  const exclusionPoints = image.exclusionPoints || [];
  const boundingBoxes = image.boundingBoxes || [];

  return (
    <div
      className="img-preview"
      style={{
        aspectRatio:
          image.naturalWidth && image.naturalHeight
            ? `${image.naturalWidth} / ${image.naturalHeight}`
            : 'auto',
      }}
      onClick={handleImageClick}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      <img
        src={image.src}
        alt="Selected source-image preview"
        className="img-preview-image"
        draggable="false"
      />

      {pngMaskSrcs.map((pngMaskSrc, index) => {
        // if no mask defined for annotations[index]
        if (!pngMaskSrc) {
          return;
        }

        return (
          <img
            key={pngMaskSrc}
            src={pngMaskSrc}
            className={`img-preview-mask ${indexOfMaskToHighlight === index ? 'highlight' : ''}`}
            draggable="false"
          />
        );
      })}

      {/* for actively drawing a bounding box when bounding box tool is in use */}
      {activeTool === 'Bounding Box' && mouseIsDown && (
        <div
          className="bounding-box"
          style={{
            left: `${Math.min(startCoord.x, currCoord.x) * 100}%`,
            top: `${Math.min(startCoord.y, currCoord.y) * 100}%`,
            width: `${Math.abs((currCoord.x - startCoord.x) * 100)}%`,
            height: `${Math.abs((currCoord.y - startCoord.y) * 100)}%`,
          }}
        />
      )}

      {boundingBoxes.map(([x1, y1, x2, y2], index) => (
        <div
          key={`${x1}, ${y1}, ${x2}, ${y2}`}
          className={`bounding-box ${index === boundingBoxShrinkIndex ? 'shrink' : ''} ${
            activeTool === 'Eraser' ? 'erasable' : ''
          }`}
          onClick={() => handleBoundingBoxClick(x1, y1, x2, y2, index)}
          style={{
            left: `${Math.min(x1, x2) * 100}%`,
            top: `${Math.min(y1, y2) * 100}%`,
            width: `${Math.abs((x1 - x2) * 100)}%`,
            height: `${Math.abs((y1 - y2) * 100)}%`,
          }}
        />
      ))}

      {inclusionPoints.map(({ x, y }, index) => (
        <div
          key={`${x}, ${y}`}
          className={`point inclusion ${index === inclusionPointShrinkIndex ? 'shrink' : ''} ${
            activeTool === 'Eraser' ? 'erasable' : ''
          }`}
          style={{ left: `${x * 100}%`, top: `${y * 100}%` }}
          onClick={() => handleInclusionPointClick(x, y, index)}
        />
      ))}

      {exclusionPoints.map(({ x, y }, index) => (
        <div
          key={`${x}, ${y}`}
          className={`point exclusion ${index === exclusionPointShrinkIndex ? 'shrink' : ''} ${
            activeTool === 'Eraser' ? 'erasable' : ''
          }`}
          style={{ left: `${x * 100}%`, top: `${y * 100}%` }}
          onClick={() => handleExclusionPointClick(x, y, index)}
        />
      ))}
    </div>
  );
};

export default ImagePreview;

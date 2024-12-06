import { useState, useEffect, useRef } from 'react';
import ExitIcon from './icons/ExitIcon';
import LeftArrowIcon from './icons/LeftArrowIcon';
import RightArrowIcon from './icons/RightArrowIcon';
import '../styles/HelpPopup.css';

const titles = [
  'Adding, Editing & Deleting Annotations',
  'Using the Auto Segment Tool',
  'Replacing a Segment',
  'Settings',
];

const demoVideoSrcs = [
  '/videos/word-demo.mp4',
  '/videos/segment-demo.mp4',
  '/videos/replace-segment-demo.mp4',
  '/videos/settings-demo.mp4',
];

const instructions = [
  `To add an annotation, click the Add Annotation button, and type in the annotation. Then hit enter to add another annotation, or click outside the annotation list to finish. To edit an annotation, hover over the annotation and click the Edit icon. Similarly, to delete an annotation (and its associated segment, if it has one), hover over it and click the Delete icon.`,
  `The Auto Segment Tool is a powerful feature that allows you to automatically segment an image into different objects. To use it, first select the annotation you wish to generate a segment for. Then use one of the Inclusion Points or Bounding Boxes to specify the area of the image you want to segment. Optionally, you can also use Exclusion Points to specify areas you don't want as part of the segment. Finally, click the Auto Segment button to generate the segment.`,
  `If you are unhappy with a segment, you can replace it with a new segment. To do this, simply generate a new segment using the Auto Segment Tool and the new segment will replace the old one.`,
  `The 'Auto Segment Tool' setting allows you to set how quickly or precisely the Auto Segment Tool generates segments. For example, setting it to 'Fast' will produce segments the quickest, but with the lowest precision. Setting it to 'Precise' will produce segments with the highest precision, but the slowest. The 'JSON Contour Fidelity' setting allows you to select the level of detail of the contours for segments downloaded as JSON files. For example, setting it to 'Low' will produce contours with fewer points, while setting it to 'High' will produce contours with more points.`,
];

const HelpPopup = ({ isVisible, onClose }) => {
  // state for tracking help instruction page
  const [currHelpPage, setCurrHelpPage] = useState(0);
  // ref for listening to click outside HelpPopup
  const helpPopupRef = useRef();

  const handleNextHelpPage = () => {
    setCurrHelpPage((prevPage) => (prevPage + 1) % instructions.length);
  };

  const handlePrevHelpPage = () => {
    setCurrHelpPage((prevPage) => (prevPage - 1 + instructions.length) % instructions.length);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (helpPopupRef.current && !helpPopupRef.current.contains(event.target)) {
        onClose(); // Close popup if clicked outside
      }
    };

    if (isVisible) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  return (
    <div className="help-popup" ref={helpPopupRef}>
      <div className="header">
        <span className="page-num">{currHelpPage + 1}</span>
        <span className="title">{titles[currHelpPage]}</span>
        <button className="exit-button" onClick={onClose}>
          <ExitIcon />
        </button>
      </div>

      <div className="body">
        <div className="nav" onClick={handlePrevHelpPage}>
          <LeftArrowIcon />
        </div>

        <div className="content">
          <div className="demo-video">
            <video src={demoVideoSrcs[currHelpPage]} autoPlay preload="metadata" loop></video>
          </div>
          <div className="text">{instructions[currHelpPage]}</div>
        </div>

        <div className="nav" onClick={handleNextHelpPage}>
          <RightArrowIcon />
        </div>
      </div>

      <div className="dots">
        {instructions.map((_, index) => (
          <div
            key={index}
            className={`dot ${index === currHelpPage ? 'current' : ''}`}
            onClick={() => setCurrHelpPage(index)}
          ></div>
        ))}
      </div>
    </div>
  );
};

export default HelpPopup;

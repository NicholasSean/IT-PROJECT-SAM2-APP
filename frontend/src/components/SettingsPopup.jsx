import React, { useState, useEffect, useRef } from 'react';
import '../styles/SettingsPopup.css'; // Make sure to import your CSS file

const SettingsPopup = ({
  isVisible,
  onClose,
  autoSegmentToolSetting,
  setAutoSegmentToolSetting,
  jsonContourSetting,
  setJsonContourSetting,
}) => {
  // ref for listening to click outside settings popup
  const settingsPopupRef = useRef();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (settingsPopupRef.current && !settingsPopupRef.current.contains(event.target)) {
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

  return (
    <div className="settings-popup" ref={settingsPopupRef}>
      <div className="auto-segment-tool">
        <span className="title">Auto Segment Tool</span>
        <div className="setting-container">
          <span className="left-setting">Fast</span>
          <div className="button-container">
            <div
              className="slider"
              style={{
                left: `calc(${autoSegmentToolSetting * (100 / 3)}% - ${
                  (autoSegmentToolSetting / 3) * 16
                }px)`,
              }}
            ></div>
            {[...Array(4)].map((_, i) => {
              return (
                <button
                  key={i}
                  className={i === autoSegmentToolSetting ? 'active' : ''}
                  onClick={() => setAutoSegmentToolSetting(i)}
                ></button>
              );
            })}
          </div>
          <span>Precise</span>
        </div>
      </div>

      <div className="json-contour-fidelity">
        <span className="title">JSON Contour Fidelity</span>
        <div className="setting-container">
          <span className="left-setting">Low</span>
          <div className="button-container">
            <div
              className="slider"
              style={{
                left: `calc(${jsonContourSetting * 50}% - ${(jsonContourSetting / 2) * 16}px)`,
              }}
            ></div>
            {[...Array(3)].map((_, i) => {
              return (
                <button
                  key={i}
                  className={i === jsonContourSetting ? 'active' : ''}
                  onClick={() => setJsonContourSetting(i)}
                ></button>
              );
            })}
          </div>
          <span>High</span>
        </div>
      </div>
    </div>
  );
};

export default SettingsPopup;

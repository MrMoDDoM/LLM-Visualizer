import React, { useState, useEffect, useRef } from 'react';
import './NavigationControls.css';

function NavigationControls({ 
  currentTokenIndex, 
  totalTokens, 
  currentTokenText,
  onTokenChange,
  disabled = false
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playSpeed, setPlaySpeed] = useState(1000);
  const playIntervalRef = useRef(null);

  // Play functionality
  useEffect(() => {
    if (isPlaying && !disabled) {
      playIntervalRef.current = setInterval(() => {
        onTokenChange((prev) => {
          if (prev >= totalTokens - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, playSpeed);
    } else {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
      }
    }

    return () => {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
      }
    };
  }, [isPlaying, playSpeed, totalTokens, disabled, onTokenChange]);

  const handlePrev = () => {
    onTokenChange((prev) => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    onTokenChange((prev) => Math.min(totalTokens - 1, prev + 1));
  };

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  return (
    <div className="navigation-controls">
      <button 
        onClick={handlePrev} 
        disabled={currentTokenIndex === 0 || isPlaying || disabled}
        className="nav-button"
      >
        ◀
      </button>
      
      <button 
        onClick={togglePlay}
        disabled={disabled}
        className={`nav-button play-button ${isPlaying ? 'playing' : ''}`}
      >
        {isPlaying ? '⏸' : '▶'}
      </button>
      
      <button 
        onClick={handleNext} 
        disabled={currentTokenIndex === totalTokens - 1 || isPlaying || disabled}
        className="nav-button"
      >
        ▶
      </button>

      <div className="token-info-compact">
        <span className="token-counter">
          {currentTokenIndex + 1} / {totalTokens}
        </span>
        <span className="token-text">"{currentTokenText}"</span>
      </div>

      {isPlaying && (
        <div className="speed-control-compact">
          <label>Speed:</label>
          <input
            type="range"
            min="200"
            max="3000"
            step="100"
            value={playSpeed}
            onChange={(e) => setPlaySpeed(parseInt(e.target.value))}
            className="speed-slider"
          />
          <span className="speed-value">{(1000 / playSpeed).toFixed(1)} tok/s</span>
        </div>
      )}
    </div>
  );
}

export default NavigationControls;
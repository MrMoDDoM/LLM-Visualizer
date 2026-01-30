import React, { useState, useEffect, useRef } from 'react';
import './VisualizationPanel.css';

function VisualizationPanel({ apiBaseUrl, generationResult }) {
  const [currentTokenIndex, setCurrentTokenIndex] = useState(0);
  const [normalizationMode, setNormalizationMode] = useState('auto');
  const [vmin, setVmin] = useState(-1.0);
  const [vmax, setVmax] = useState(1.0);
  const [actualVmin, setActualVmin] = useState(null);
  const [actualVmax, setActualVmax] = useState(null);
  
  const [mainImage, setMainImage] = useState(null);
  const [embeddingImage, setEmbeddingImage] = useState(null);
  const [timelineImage, setTimelineImage] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Zoom and pan state
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  const canvasRef = useRef(null);
  const timelineCanvasRef = useRef(null);

  useEffect(() => {
    if (generationResult) {
      setCurrentTokenIndex(0);
      loadVisualization(0);
      loadTimeline();
    }
  }, [generationResult]);

  useEffect(() => {
    if (generationResult) {
      loadVisualization(currentTokenIndex);
    }
  }, [currentTokenIndex, normalizationMode, vmin, vmax]);

  const loadVisualization = async (tokenIndex) => {
    setLoading(true);
    try {
      const normConfig = {
        mode: normalizationMode,
        vmin: normalizationMode === 'fixed' ? vmin : null,
        vmax: normalizationMode === 'fixed' ? vmax : null
      };

      const response = await fetch(`${apiBaseUrl}/visualize_token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token_index: tokenIndex,
          normalization: normConfig
        }),
      });

      const data = await response.json();
      setMainImage(data.image);
      setEmbeddingImage(data.embedding_image);
      setActualVmin(data.vmin);
      setActualVmax(data.vmax);

    } catch (err) {
      console.error('Error loading visualization:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadTimeline = async () => {
    try {
      const normConfig = {
        mode: normalizationMode,
        vmin: normalizationMode === 'fixed' ? vmin : null,
        vmax: normalizationMode === 'fixed' ? vmax : null
      };

      const response = await fetch(`${apiBaseUrl}/visualize_timeline`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(normConfig),
      });

      const data = await response.json();
      setTimelineImage(data.image);

    } catch (err) {
      console.error('Error loading timeline:', err);
    }
  };

  const handlePrevToken = () => {
    if (currentTokenIndex > 0) {
      setCurrentTokenIndex(currentTokenIndex - 1);
    }
  };

  const handleNextToken = () => {
    if (currentTokenIndex < generationResult.num_tokens_generated - 1) {
      setCurrentTokenIndex(currentTokenIndex + 1);
    }
  };

  const handleZoomIn = () => {
    setScale(s => Math.min(s * 1.5, 10));
  };

  const handleZoomOut = () => {
    setScale(s => Math.max(s / 1.5, 0.5));
  };

  const handleResetView = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setScale(s => Math.max(0.5, Math.min(10, s * delta)));
  };

  const downloadImage = () => {
    if (!mainImage) return;
    
    const link = document.createElement('a');
    link.href = `data:image/png;base64,${mainImage}`;
    link.download = `hidden_states_token_${currentTokenIndex}.png`;
    link.click();
  };

  const downloadTimeline = () => {
    if (!timelineImage) return;
    
    const link = document.createElement('a');
    link.href = `data:image/png;base64,${timelineImage}`;
    link.download = `hidden_states_timeline.png`;
    link.click();
  };

  const handleTimelineClick = (e) => {
    if (!timelineImage || !generationResult) return;
    
    const canvas = timelineCanvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const y = e.clientY - rect.top;
    
    // Calculate which token was clicked based on y position
    const numLayers = generationResult.num_layers;
    const numTokens = generationResult.num_tokens_generated;
    const layerHeight = canvas.height / (numLayers * numTokens);
    const tokenIndex = Math.floor(y / (layerHeight * numLayers));
    
    if (tokenIndex >= 0 && tokenIndex < numTokens) {
      setCurrentTokenIndex(tokenIndex);
    }
  };

  if (!generationResult) {
    return (
      <div className="visualization-panel">
        <p>No generation to visualize</p>
      </div>
    );
  }

  return (
    <div className="visualization-panel">
      <h2>📊 Hidden States Visualization</h2>

      {/* Controls */}
      <div className="controls-section">
        <div className="token-navigation">
          <button onClick={handlePrevToken} disabled={currentTokenIndex === 0}>
            ◀ Prev
          </button>
          <span className="token-info">
            Token {currentTokenIndex + 1} / {generationResult.num_tokens_generated}
            <strong> "{generationResult.tokens[currentTokenIndex]}"</strong>
          </span>
          <button 
            onClick={handleNextToken} 
            disabled={currentTokenIndex === generationResult.num_tokens_generated - 1}
          >
            Next ▶
          </button>
        </div>

        <div className="normalization-controls">
          <label>
            <input
              type="radio"
              value="auto"
              checked={normalizationMode === 'auto'}
              onChange={() => setNormalizationMode('auto')}
            />
            Auto Normalize
          </label>
          <label>
            <input
              type="radio"
              value="fixed"
              checked={normalizationMode === 'fixed'}
              onChange={() => setNormalizationMode('fixed')}
            />
            Fixed Range
          </label>
          
          {normalizationMode === 'fixed' && (
            <div className="range-inputs">
              <input
                type="number"
                value={vmin}
                onChange={(e) => setVmin(parseFloat(e.target.value))}
                step="0.1"
                placeholder="Min"
              />
              <input
                type="number"
                value={vmax}
                onChange={(e) => setVmax(parseFloat(e.target.value))}
                step="0.1"
                placeholder="Max"
              />
            </div>
          )}
        </div>

        {actualVmin !== null && (
          <div className="value-range">
            Range: [{actualVmin.toFixed(4)}, {actualVmax.toFixed(4)}]
          </div>
        )}
      </div>

      {/* Embedding Visualization */}
      {embeddingImage && (
        <div className="embedding-section">
          <h3>🎯 Input Embedding</h3>
          <div className="embedding-container">
            <img 
              src={`data:image/png;base64,${embeddingImage}`}
              alt="Input Embedding"
              style={{ width: '100%', height: 'auto', imageRendering: 'pixelated' }}
            />
          </div>
        </div>
      )}

      {/* Main Visualization */}
      <div className="main-visualization">
        <div className="visualization-header">
          <h3>🔥 Layer Hidden States</h3>
          <div className="zoom-controls">
            <button onClick={handleZoomOut}>-</button>
            <span>{(scale * 100).toFixed(0)}%</span>
            <button onClick={handleZoomIn}>+</button>
            <button onClick={handleResetView}>Reset</button>
            <button onClick={downloadImage}>💾 Download</button>
          </div>
        </div>

        <div 
          className="canvas-container"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
        >
          {loading && <div className="loading-overlay">Loading...</div>}
          {mainImage && (
            <img
              ref={canvasRef}
              src={`data:image/png;base64,${mainImage}`}
              alt="Hidden States Heatmap"
              style={{
                transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
                transformOrigin: 'top left',
                cursor: isDragging ? 'grabbing' : 'grab',
                imageRendering: 'pixelated',
              }}
              draggable={false}
            />
          )}
        </div>
        
        <div className="layer-labels">
          <span>Layer 0 (Top)</span>
          <span>Layer {generationResult.num_layers - 1} (Bottom)</span>
        </div>
      </div>

      {/* Timeline */}
      {timelineImage && (
        <div className="timeline-section">
          <div className="timeline-header">
            <h3>📈 Complete Timeline</h3>
            <button onClick={downloadTimeline}>💾 Download</button>
          </div>
          <p className="timeline-description">
            Click on the timeline to jump to a specific token
          </p>
          <div className="timeline-container" onClick={handleTimelineClick}>
            <canvas
              ref={timelineCanvasRef}
              width={800}
              height={200}
              style={{ display: 'none' }}
            />
            <img
              src={`data:image/png;base64,${timelineImage}`}
              alt="Timeline"
              style={{ 
                width: '100%', 
                height: 'auto',
                cursor: 'pointer',
                imageRendering: 'pixelated'
              }}
              onLoad={(e) => {
                // Copy to canvas for click detection
                const canvas = timelineCanvasRef.current;
                const ctx = canvas.getContext('2d');
                canvas.width = e.target.naturalWidth;
                canvas.height = e.target.naturalHeight;
                ctx.drawImage(e.target, 0, 0);
              }}
            />
            {/* Token markers */}
            <div className="token-markers">
              {generationResult.tokens.map((token, idx) => (
                <div
                  key={idx}
                  className={`token-marker ${idx === currentTokenIndex ? 'active' : ''}`}
                  style={{
                    left: `${(idx / generationResult.num_tokens_generated) * 100}%`
                  }}
                  title={`Token ${idx + 1}: "${token}"`}
                >
                  {idx === currentTokenIndex && '▼'}
                </div>
              ))}
            </div>
          </div>
          
          <div className="token-list">
            {generationResult.tokens.map((token, idx) => (
              <span
                key={idx}
                className={`token-chip ${idx === currentTokenIndex ? 'active' : ''}`}
                onClick={() => setCurrentTokenIndex(idx)}
              >
                {token}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Generated Text */}
      <div className="generated-text">
        <h3>📝 Generated Text</h3>
        <div className="text-content">
          {generationResult.generated_text}
        </div>
      </div>
    </div>
  );
}

export default VisualizationPanel;

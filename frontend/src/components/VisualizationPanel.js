import React, { useState, useEffect, useRef } from 'react';
import './VisualizationPanel.css';
import SteeringRadarChart from './SteeringRadarChart';
import NavigationControls from './NavigationControls';

function VisualizationPanel({ apiBaseUrl, generationResult, currentTokenIndex, onTokenChange, steeringConfigs, onCoefficientChange }) {
  // Remove internal token index management - now controlled by parent
  const [normalizationMode, setNormalizationMode] = useState('auto');
  const [vmin, setVmin] = useState(-1.0);
  const [vmax, setVmax] = useState(1.0);
  const [actualVmin, setActualVmin] = useState(null);
  const [actualVmax, setActualVmax] = useState(null);
  
  const [mainImage, setMainImage] = useState(null);
  const [embeddingImage, setEmbeddingImage] = useState(null);
  const [timelineImage, setTimelineImage] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Collapse state for legend boxes
  const [isEmbeddingLegendOpen, setIsEmbeddingLegendOpen] = useState(false);
  const [isMainLegendOpen, setIsMainLegendOpen] = useState(false);
  const [isTimelineLegendOpen, setIsTimelineLegendOpen] = useState(false);
  
  // Zoom and pan state for main image
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  // Zoom and pan state for embedding image
  const [embScale, setEmbScale] = useState(1);
  const [embPosition, setEmbPosition] = useState({ x: 0, y: 0 });
  const [isEmbDragging, setIsEmbDragging] = useState(false);
  const [embDragStart, setEmbDragStart] = useState({ x: 0, y: 0 });
  
  // Tab state for visualizations panel
  const [activeTab, setActiveTab] = useState('hidden-states'); // 'hidden-states' or 'steering'
  
  const canvasRef = useRef(null);
  const embeddingCanvasRef = useRef(null);
  const timelineCanvasRef = useRef(null);

  useEffect(() => {
    if (generationResult) {
      loadVisualization(currentTokenIndex);
    }
  }, [currentTokenIndex, normalizationMode, vmin, vmax]);

  useEffect(() => {
    if (generationResult) {
      loadTimeline();
    }
  }, [generationResult, normalizationMode, vmin, vmax]);

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

  // Zoom handlers for main image

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

  // Embedding zoom handlers
  const handleEmbZoomIn = () => {
    setEmbScale(s => Math.min(s * 1.5, 10));
  };

  const handleEmbZoomOut = () => {
    setEmbScale(s => Math.max(s / 1.5, 0.5));
  };

  const handleEmbResetView = () => {
    setEmbScale(1);
    setEmbPosition({ x: 0, y: 0 });
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

  // Embedding pan handlers
  const handleEmbMouseDown = (e) => {
    setIsEmbDragging(true);
    setEmbDragStart({ x: e.clientX - embPosition.x, y: e.clientY - embPosition.y });
  };

  const handleEmbMouseMove = (e) => {
    if (isEmbDragging) {
      setEmbPosition({
        x: e.clientX - embDragStart.x,
        y: e.clientY - embDragStart.y
      });
    }
  };

  const handleEmbMouseUp = () => {
    setIsEmbDragging(false);
  };

  const handleEmbWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setEmbScale(s => Math.max(0.5, Math.min(10, s * delta)));
  };

  const downloadImage = () => {
    if (!mainImage) return;
    
    const link = document.createElement('a');
    link.href = `data:image/png;base64,${mainImage}`;
    link.download = `hidden_states_token_${currentTokenIndex}.png`;
    link.click();
  };

  const downloadEmbedding = () => {
    if (!embeddingImage) return;
    
    const link = document.createElement('a');
    link.href = `data:image/png;base64,${embeddingImage}`;
    link.download = `embedding_token_${currentTokenIndex}.png`;
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
      // Call parent to update token index
      if (window.updateTokenIndex) {
        window.updateTokenIndex(tokenIndex);
      }
    }
  };

  const handleTokenChipClick = (tokenIndex) => {
    onTokenChange(tokenIndex);
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
      {/* Generated Text Panel - Only text, no tokens */}
      <div className="text-panel">
        <div className="text-panel-header">
          <h2>📝 Generated Text</h2>
        </div>
        <div className="text-content">
          {generationResult.generated_text}
        </div>
      </div>

      {/* Visualizations Panel with Tabs */}
      <div className="visualizations-panel">
        {/* Tab Navigation */}
        <div className="viz-tab-navigation">
          <button
            className={`viz-tab-button ${activeTab === 'hidden-states' ? 'active' : ''}`}
            onClick={() => setActiveTab('hidden-states')}
          >
            🔥 Hidden States
          </button>
          <button
            className={`viz-tab-button ${activeTab === 'steering' ? 'active' : ''}`}
            onClick={() => setActiveTab('steering')}
          >
            🎯 Steering
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'hidden-states' ? (
          <div className="viz-tab-content">
            {/* Current Token and Navigation Controls */}
            <div className="token-navigation-section">
              <div className="current-token-display">
                <span className="token-label"><strong>Current Token:</strong></span>
                <span className="token-counter">{currentTokenIndex + 1} / {generationResult.num_tokens_generated}</span>
                <span className="token-text">"{generationResult.tokens[currentTokenIndex]}"</span>
              </div>
              
              <NavigationControls
                currentTokenIndex={currentTokenIndex}
                totalTokens={generationResult.num_tokens_generated}
                currentTokenText={generationResult.tokens[currentTokenIndex]}
                onTokenChange={onTokenChange}
              />
            </div>

            {/* Token chips for navigation */}
            <div className="token-chips">
              {generationResult.tokens.map((token, idx) => (
                <span 
                  key={idx} 
                  className={`token-chip ${idx === currentTokenIndex ? 'active' : ''}`}
                  onClick={() => handleTokenChipClick(idx)}
                  title={`Click to view token ${idx}: "${token}"`}
                >
                  {token}
                </span>
              ))}
            </div>

            {/* Normalization Controls Only */}
            <div className="controls-section">
          <div className="normalization-controls">
            <div className="normalization-modes">
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
          </div>

          {actualVmin !== null && (
            <div className="value-range-display">
              <span className="range-label">Current Range:</span>
              <span className="range-values">
                <span className="range-min">{actualVmin.toFixed(4)}</span>
                <span className="range-separator">→</span>
                <span className="range-max">{actualVmax.toFixed(4)}</span>
              </span>
            </div>
          )}
          
          {normalizationMode === 'fixed' && (
            <div className="range-inputs">
              <label>Min:</label>
              <input
                type="number"
                value={vmin}
                onChange={(e) => setVmin(parseFloat(e.target.value))}
                step="0.1"
                placeholder="Min"
              />
              <label>Max:</label>
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
      </div>

      {/* Embedding Visualization */}
      {embeddingImage && (
        <div className="embedding-section">
          <div className="visualization-header">
            <h3>🎯 Input Embedding</h3>
            <div className="zoom-controls">
              <button onClick={handleEmbZoomOut}>-</button>
              <span>{(embScale * 100).toFixed(0)}%</span>
              <button onClick={handleEmbZoomIn}>+</button>
              <button onClick={handleEmbResetView}>Reset</button>
              <button onClick={downloadEmbedding}>💾 Download</button>
            </div>
          </div>
          <div className="legend-box">
            <div 
              className="legend-header" 
              onClick={() => setIsEmbeddingLegendOpen(!isEmbeddingLegendOpen)}
            >
              <span className={`legend-arrow ${isEmbeddingLegendOpen ? 'open' : ''}`}>▶</span>
              <span>Legend</span>
            </div>
            {isEmbeddingLegendOpen && (
              <div className="legend-content">
                <p>📍 <strong>What:</strong> Initial token representation before processing</p>
                <p>📐 <strong>Format:</strong> 1 row × {generationResult.hidden_size} dimensions</p>
                <p>🎨 <strong>Colors:</strong> <span className="legend-blue">Blue (negative)</span> → White (zero) → <span className="legend-red">Red (positive)</span></p>
              </div>
            )}
          </div>
          <div 
            className="embedding-container"
            onMouseDown={handleEmbMouseDown}
            onMouseMove={handleEmbMouseMove}
            onMouseUp={handleEmbMouseUp}
            onMouseLeave={handleEmbMouseUp}
            onWheel={handleEmbWheel}
          >
            <img 
              ref={embeddingCanvasRef}
              src={`data:image/png;base64,${embeddingImage}`}
              alt="Input Embedding"
              style={{
                transform: `scale(${embScale}) translate(${embPosition.x / embScale}px, ${embPosition.y / embScale}px)`,
                transformOrigin: 'top left',
                cursor: isEmbDragging ? 'grabbing' : 'grab',
                imageRendering: 'pixelated',
              }}
              draggable={false}
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

        <div className="legend-box">
          <div 
            className="legend-header" 
            onClick={() => setIsMainLegendOpen(!isMainLegendOpen)}
          >
            <span className={`legend-arrow ${isMainLegendOpen ? 'open' : ''}`}>▶</span>
            <span>Legend</span>
          </div>
          {isMainLegendOpen && (
            <div className="legend-content">
              <p>📍 <strong>What:</strong> Hidden state activations for each layer processing this token</p>
              <p>📐 <strong>Format:</strong> {generationResult.num_layers} layers (rows) × {generationResult.hidden_size} neurons (columns)</p>
              <p>📖 <strong>Read:</strong> Top → Bottom = Layer 0 → Layer {generationResult.num_layers - 1}</p>
              <p>🎨 <strong>Colors:</strong> <span className="legend-blue">Blue (negative)</span> → White (zero) → <span className="legend-red">Red (positive)</span></p>
            </div>
          )}
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
                width: '100%',
                height: 'auto',
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
          <div className="legend-box">
            <div 
              className="legend-header" 
              onClick={() => setIsTimelineLegendOpen(!isTimelineLegendOpen)}
            >
              <span className={`legend-arrow ${isTimelineLegendOpen ? 'open' : ''}`}>▶</span>
              <span>Legend</span>
            </div>
            {isTimelineLegendOpen && (
              <div className="legend-content">
                <p>📍 <strong>What:</strong> All tokens stacked vertically showing full generation sequence</p>
                <p>📐 <strong>Format:</strong> Each block of {generationResult.num_layers} rows = 1 token</p>
                <p>📖 <strong>Read:</strong> Top → Bottom = First token → Last token generated</p>
                <p>🎯 <strong>Interact:</strong> Click on any part to jump to that token</p>
              </div>
            )}
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
                    top: `${(idx / generationResult.num_tokens_generated) * 100}%`
                  }}
                  title={`Token ${idx + 1}: "${token}"`}
                >
                  {idx === currentTokenIndex && '◀'}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
          </div>
        ) : (
          <div className="viz-tab-content">
            <SteeringRadarChart 
              steeringConfigs={steeringConfigs || []}
              onCoefficientChange={onCoefficientChange}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default VisualizationPanel;
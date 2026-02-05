import React, { useState } from 'react';
import './SteeringVectorManager.css';

function SteeringVectorManager({ apiBaseUrl, steeringVectors, onVectorsChanged, onError }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedVector, setSelectedVector] = useState(null);
  const [vectorImage, setVectorImage] = useState(null);
  const [normalizationMode, setNormalizationMode] = useState('auto');
  const [vmin, setVmin] = useState(-1.0);
  const [vmax, setVmax] = useState(1.0);
  const [showModal, setShowModal] = useState(false);
  
  // Zoom and pan state for modal
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    // Validate all files first
    const invalidFiles = files.filter(file => !file.name.endsWith('.pt'));
    if (invalidFiles.length > 0) {
      setError(`Please upload only .pt files. Invalid: ${invalidFiles.map(f => f.name).join(', ')}`);
      return;
    }

    setUploading(true);
    setError(null);

    const results = {
      success: [],
      failed: []
    };

    // Upload files sequentially to avoid overwhelming the server
    for (const file of files) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('name', file.name.replace('.pt', ''));

        const response = await fetch(`${apiBaseUrl}/upload_steering_vector`, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          results.failed.push({ name: file.name, error: errorData.detail || 'Upload failed' });
        } else {
          await response.json();
          results.success.push(file.name);
        }

      } catch (err) {
        results.failed.push({ name: file.name, error: err.message });
      }
    }

    // Show results summary
    if (results.failed.length > 0) {
      const errorMessage = `Uploaded ${results.success.length}/${files.length} files.\nFailed: ${results.failed.map(f => f.name).join(', ')}`;
      if (onError) {
        onError({ message: errorMessage, stacktrace: null });
      } else {
        setError(errorMessage);
      }
    }

    // Refresh vectors list if at least one succeeded
    if (results.success.length > 0) {
      onVectorsChanged();
    }
    
    // Clear file input
    e.target.value = '';
    setUploading(false);
  };

  const handleDeleteVector = async (name) => {
    if (!window.confirm(`Delete steering vector "${name}"?`)) {
      return;
    }

    try {
      const response = await fetch(`${apiBaseUrl}/steering_vectors/${name}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Delete failed');
      }

      if (selectedVector === name) {
        setSelectedVector(null);
        setVectorImage(null);
      }
      
      onVectorsChanged();

    } catch (err) {
      setError(err.message);
    }
  };

  const handleVisualizeVector = async (name) => {
    setSelectedVector(name);
    setShowModal(true);
    
    try {
      const normConfig = {
        mode: normalizationMode,
        vmin: normalizationMode === 'fixed' ? vmin : null,
        vmax: normalizationMode === 'fixed' ? vmax : null
      };

      const response = await fetch(`${apiBaseUrl}/visualize_steering_vector/${name}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(normConfig),
      });

      if (!response.ok) {
        throw new Error('Visualization failed');
      }

      const data = await response.json();
      setVectorImage(data.image);

    } catch (err) {
      setError(err.message);
      setShowModal(false);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedVector(null);
    setVectorImage(null);
    // Reset zoom and pan
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  // Zoom and pan handlers
  const zoomIn = () => {
    setScale(prevScale => Math.min(prevScale * 1.2, 5));
  };

  const zoomOut = () => {
    setScale(prevScale => Math.max(prevScale / 1.2, 0.5));
  };

  const handleMouseDown = (e) => {
    if (e.button === 0) { // Left click only
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
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

  const resetZoom = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleDownloadVector = async (name) => {
    try {
      const response = await fetch(`${apiBaseUrl}/download_steering_vector/${name}`);

      if (!response.ok) {
        throw new Error('Download failed');
      }

      // Convert response to blob
      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${name}.pt`;
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

    } catch (err) {
      setError(err.message);
      console.error('Error downloading vector:', err);
    }
  };

  return (
    <div className="steering-vector-manager">
      <h2>🎛️ Steering Vector Library</h2>

      <div className="upload-section">
        <label className="upload-button">
          {uploading ? '⏳ Uploading...' : '📁 Upload Vector (.pt)'}
          <input
            type="file"
            accept=".pt"
            multiple
            onChange={handleFileUpload}
            disabled={uploading}
            style={{ display: 'none' }}
          />
        </label>
      </div>

      {error && <div className="error-message">❌ {error}</div>}

      <div className="vectors-list">
        <h3>Loaded Vectors ({steeringVectors.length})</h3>
        {steeringVectors.length === 0 ? (
          <p className="empty-message">No vectors loaded</p>
        ) : (
          <div className="vector-items">
            {steeringVectors.map(vector => (
              <div key={vector.name} className="vector-item">
                <div className="vector-name">
                  <strong>{vector.name}</strong>
                </div>
                <div className="vector-actions">
                  <button
                    onClick={() => handleVisualizeVector(vector.name)}
                    className="visualize-button"
                    title="Visualize vector"
                  >
                    👁️
                  </button>
                  <button
                    onClick={() => handleDownloadVector(vector.name)}
                    className="download-button"
                    title="Download vector (.pt)"
                  >
                    💾
                  </button>
                  <button
                    onClick={() => handleDeleteVector(vector.name)}
                    className="delete-button"
                    title="Delete vector"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal for vector visualization */}
      {showModal && (
        <div className="vector-modal-overlay" onClick={closeModal}>
          <div className="vector-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>👁️ Vector Preview: {selectedVector}</h3>
              <button className="modal-close-button" onClick={closeModal}>✕</button>
            </div>

            <div className="normalization-controls">
              <label>
                <input
                  type="radio"
                  value="auto"
                  checked={normalizationMode === 'auto'}
                  onChange={() => setNormalizationMode('auto')}
                />
                Auto
              </label>
              <label>
                <input
                  type="radio"
                  value="fixed"
                  checked={normalizationMode === 'fixed'}
                  onChange={() => setNormalizationMode('fixed')}
                />
                Fixed
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
              
              <button onClick={() => handleVisualizeVector(selectedVector)}>
                🔄 Refresh
              </button>
            </div>

            {/* Zoom Controls */}
            <div className="zoom-controls">
              <button onClick={zoomOut} title="Zoom Out" disabled={scale <= 0.5}>
                🔍− Zoom Out
              </button>
              <button onClick={resetZoom} title="Reset zoom">
                ⊙ Reset
              </button>
              <button onClick={zoomIn} title="Zoom In" disabled={scale >= 5}>
                🔍+ Zoom In
              </button>
            </div>

            {/* Vector Info Box */}
            {steeringVectors.find(v => v.name === selectedVector) && (
              <div className="modal-vector-info">
                <div className="info-item">
                  <strong>Shape:</strong> [{steeringVectors.find(v => v.name === selectedVector).shape.join(', ')}]
                </div>
                <div className="info-item">
                  <strong>Norm:</strong> {steeringVectors.find(v => v.name === selectedVector).norm.toFixed(6)}
                </div>
                <div className="info-item">
                  <strong>Zoom:</strong> {(scale * 100).toFixed(0)}%
                </div>
              </div>
            )}

            <div 
              className="vector-image-container"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
            >
              {vectorImage ? (
                <div style={{ 
                  transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                  transformOrigin: 'center center',
                  transition: isDragging ? 'none' : 'transform 0.1s ease-out'
                }}>
                  <img
                    src={`data:image/png;base64,${vectorImage}`}
                    alt="Steering Vector"
                    style={{ 
                      width: '100%', 
                      height: 'auto', 
                      imageRendering: 'pixelated',
                      pointerEvents: 'none',
                      userSelect: 'none'
                    }}
                  />
                </div>
              ) : (
                <div className="loading-message">Loading visualization...</div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="info-box">
        <h4>ℹ️ About Steering Vectors</h4>
        <p>
          Steering vectors are added to hidden states at specific layers during generation.
          Upload .pt files containing torch tensors matching your model's hidden dimension.
        </p>
        <p>
          Use the coefficient to control the strength and direction of steering (negative values reverse the effect).
        </p>
      </div>
    </div>
  );
}

export default SteeringVectorManager;

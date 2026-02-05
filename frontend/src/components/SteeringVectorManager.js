import React, { useState } from 'react';
import './SteeringVectorManager.css';

function SteeringVectorManager({ apiBaseUrl, steeringVectors, onVectorsChanged }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedVector, setSelectedVector] = useState(null);
  const [vectorImage, setVectorImage] = useState(null);
  const [normalizationMode, setNormalizationMode] = useState('auto');
  const [vmin, setVmin] = useState(-1.0);
  const [vmax, setVmax] = useState(1.0);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.pt')) {
      setError('Please upload a .pt file');
      return;
    }

    setUploading(true);
    setError(null);

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
        throw new Error(errorData.detail || 'Upload failed');
      }

      await response.json();
      onVectorsChanged();
      
      // Clear file input
      e.target.value = '';

    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
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
      setSelectedVector(name);

    } catch (err) {
      setError(err.message);
    }
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
                <div className="vector-info">
                  <strong>{vector.name}</strong>
                  <div className="vector-stats">
                    Shape: [{vector.shape.join(', ')}] | Norm: {vector.norm.toFixed(4)}
                  </div>
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

      {vectorImage && selectedVector && (
        <div className="vector-visualization">
          <h3>Vector Preview: {selectedVector}</h3>
          
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

          <div className="vector-image-container">
            <img
              src={`data:image/png;base64,${vectorImage}`}
              alt="Steering Vector"
              style={{ width: '100%', height: 'auto', imageRendering: 'pixelated' }}
            />
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

import React, { useState } from 'react';
import './SteeringVectorManager.css';

function SteeringVectorManager({ apiBaseUrl, steeringVectors, onVectorsChanged, onError }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedVector, setSelectedVector] = useState(null);
  const [showModal, setShowModal] = useState(false);

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
        formData.append('category', 'extra');  // Default to 'extra' for uploaded vectors

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
      }
      
      onVectorsChanged();

    } catch (err) {
      setError(err.message);
    }
  };

  const handleVisualizeVector = (name) => {
    setSelectedVector(name);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedVector(null);
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

      {/* Modal for vector metadata */}
      {showModal && selectedVector && (
        <div className="vector-modal-overlay" onClick={closeModal}>
          <div className="vector-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>ℹ️ Vector Metadata: {selectedVector}</h3>
              <button className="modal-close-button" onClick={closeModal}>✕</button>
            </div>

            {/* Vector Metadata Display */}
            {(() => {
              const vector = steeringVectors.find(v => v.name === selectedVector);
              if (!vector) return <div className="loading-message">Vector not found</div>;
              
              return (
                <div className="vector-metadata">
                  <div className="metadata-section">
                    <h4>📊 Basic Information</h4>
                    <div className="metadata-grid">
                      <div className="metadata-item">
                        <span className="metadata-label">Name:</span>
                        <span className="metadata-value">{vector.name}</span>
                      </div>
                      <div className="metadata-item">
                        <span className="metadata-label">Category:</span>
                        <span className={`metadata-value category-badge category-${vector.category || 'extra'}`}>
                          {vector.category === 'emotion' ? '😊 Emotion' : 
                           vector.category === 'alignment' ? '⚖️ Alignment' : 
                           '⚙️ Extra'}
                        </span>
                      </div>
                      <div className="metadata-item">
                        <span className="metadata-label">Layer:</span>
                        <span className="metadata-value">{vector.layer || 'unknown'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="metadata-section">
                    <h4>🔢 Technical Details</h4>
                    <div className="metadata-grid">
                      <div className="metadata-item">
                        <span className="metadata-label">Shape:</span>
                        <span className="metadata-value">[{vector.shape.join(', ')}]</span>
                      </div>
                      <div className="metadata-item">
                        <span className="metadata-label">Norm:</span>
                        <span className="metadata-value">{vector.norm.toFixed(6)}</span>
                      </div>
                      <div className="metadata-item">
                        <span className="metadata-label">Dimensions:</span>
                        <span className="metadata-value">{vector.shape[0]}</span>
                      </div>
                    </div>
                  </div>

                  <div className="metadata-section">
                    <h4>💡 Usage Information</h4>
                    <div className="usage-info">
                      {vector.category === 'emotion' && (
                        <p>🎯 <strong>Emotion vectors</strong> are controlled via the radar chart in the Generation Results section.</p>
                      )}
                      {vector.category === 'alignment' && (
                        <p>⚖️ <strong>Alignment vectors</strong> are controlled via the moral alignment grid. Select this vector in the X or Y axis selector.</p>
                      )}
                      {(vector.category === 'extra' || !vector.category) && (
                        <p>⚙️ <strong>Extra vectors</strong> are controlled via sliders in the Extra Steering Vectors section.</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}
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

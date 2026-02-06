import React, { useState, useEffect } from 'react';
import './ContrastiveSearch.css';

function ContrastiveSearch({ apiBaseUrl, modelInfo, onVectorGenerated, onError }) {
  const [presets, setPresets] = useState([]);
  const [selectedPreset, setSelectedPreset] = useState('');
  const [loadingPresets, setLoadingPresets] = useState(false);
  const [executingPreset, setExecutingPreset] = useState(false);
  const [presetProgress, setPresetProgress] = useState(null);
  const [uploadingDataset, setUploadingDataset] = useState(false);

  useEffect(() => {
    loadPresets();
  }, []);

  const loadPresets = async () => {
    setLoadingPresets(true);
    try {
      const response = await fetch(`${apiBaseUrl}/presets`);
      if (response.ok) {
        const data = await response.json();
        setPresets(data.presets || []);
      }
    } catch (err) {
      console.error('Error loading presets:', err);
    } finally {
      setLoadingPresets(false);
    }
  };

  const executePreset = async () => {
    if (!selectedPreset) {
      alert('Please select a preset');
      return;
    }

    setExecutingPreset(true);
    setPresetProgress({ current: 0, total: 0, status: 'Starting...' });

    try {
      const response = await fetch(`${apiBaseUrl}/execute_preset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preset_name: selectedPreset })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to execute preset');
      }

      const data = await response.json();
      setPresetProgress(null);
      
      let message = `✅ Preset "${data.preset_name}" executed!\n\n✓ Generated: ${data.processed} vectors\n`;
      
      if (data.failed > 0) {
        message += `✗ Failed: ${data.failed} datasets\n\nErrors:\n` + data.errors.join('\n');
      }
      
      if (data.vectors.length > 0) {
        message += '\n\nGenerated vectors:\n';
        data.vectors.forEach(v => {
          message += `• ${v.name} (Layer ${v.layer}, ${v.pair_count} pairs)\n`;
        });
      }
      
      alert(message);
      
      if (onVectorGenerated) {
        onVectorGenerated();
      }
      
      setSelectedPreset('');
      
    } catch (err) {
      setPresetProgress(null);
      alert(`❌ Error executing preset: ${err.message}`);
      console.error('Error executing preset:', err);
    } finally {
      setExecutingPreset(false);
    }
  };

  const uploadDataset = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploadingDataset(true);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const imported = JSON.parse(e.target.result);
        let vectorName, pairs, targetLayer;
        
        if (imported.metadata && Array.isArray(imported.pairs)) {
          vectorName = imported.metadata.name;
          pairs = imported.pairs;
          targetLayer = imported.metadata.target_layer;
        } else if (Array.isArray(imported)) {
          vectorName = file.name.replace('.json', '');
          pairs = imported;
          targetLayer = null;
        } else {
          throw new Error('Invalid file format');
        }

        const response = await fetch(`${apiBaseUrl}/generate_steering_vector`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            vector_name: vectorName,
            pairs: pairs.map(pair => ({
              positive: pair.positive,
              negative: pair.negative
            })),
            target_layer: targetLayer,
            category: imported.metadata?.category || 'extra'  // Add category from metadata
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          if (onError) {
            onError(errorData);
          } else {
            throw new Error(errorData.detail || 'Failed to generate steering vector');
          }
          return;
        }

        const data = await response.json();
        
        alert(`✅ Successfully generated steering vector "${data.name}"!\n\nShape: [${data.shape.join(', ')}]\nNorm: ${data.norm.toFixed(4)}\nLayer: ${data.layer}\nPairs used: ${data.num_pairs}`);
        
        if (onVectorGenerated) {
          onVectorGenerated();
        }
        
      } catch (err) {
        if (onError) {
          onError({ message: err.message, stacktrace: null });
        } else {
          alert('❌ Error processing file: ' + err.message);
        }
        console.error('Error uploading dataset:', err);
      } finally {
        setUploadingDataset(false);
        event.target.value = '';
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="contrastive-search">
      <div className="contrastive-header">
        <h2>🔍 Steering Vector Generation</h2>
        <p className="header-description">
          Generate steering vectors from preset collections or upload individual dataset files
        </p>
      </div>

      <div className="preset-manager">
        <div className="preset-header">
          <h3>📦 Preset Collections</h3>
          <button 
            onClick={loadPresets} 
            className="refresh-button"
            disabled={loadingPresets || executingPreset}
            title="Refresh presets list"
          >
            🔄 {loadingPresets ? 'Loading...' : 'Refresh'}
          </button>
        </div>
        
        <div className="preset-content">
          <div className="preset-selector">
            <label>Select Preset:</label>
            <select 
              value={selectedPreset} 
              onChange={(e) => setSelectedPreset(e.target.value)}
              disabled={executingPreset || presets.length === 0}
            >
              <option value="">-- Choose a preset --</option>
              {presets.map(preset => (
                <option key={preset.name} value={preset.name}>
                  {preset.name} ({preset.dataset_count} dataset{preset.dataset_count !== 1 ? 's' : ''})
                </option>
              ))}
            </select>
          </div>

          {selectedPreset && (
            <div className="preset-details">
              <h4>Datasets in this preset:</h4>
              {presets.find(p => p.name === selectedPreset)?.datasets.map((dataset, idx) => (
                <div key={idx} className="dataset-info">
                  <div className="dataset-header">
                    <span className="dataset-name">{dataset.metadata.name || dataset.filename}</span>
                    {dataset.metadata.category && (
                      <span className={`category-badge badge-${dataset.metadata.category}`}>
                        {dataset.metadata.category === 'emotion' ? '😊 Emotion' : 
                         dataset.metadata.category === 'alignment' ? '⚖️ Alignment' : 
                         '⚙️ Extra'}
                      </span>
                    )}
                  </div>
                  <span className="dataset-meta">
                    Layer {dataset.metadata.target_layer || 'auto'} • {dataset.pair_count} pair{dataset.pair_count !== 1 ? 's' : ''}
                  </span>
                  {dataset.metadata.description && (
                    <span className="dataset-description">{dataset.metadata.description}</span>
                  )}
                </div>
              ))}
            </div>
          )}

          <button
            onClick={executePreset}
            disabled={!selectedPreset || executingPreset}
            className="execute-preset-button"
          >
            {executingPreset ? `⏳ Processing preset...` : `🚀 Execute Preset`}
          </button>

          {presetProgress && (
            <div className="preset-progress">
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${(presetProgress.current / presetProgress.total) * 100}%` }}
                />
              </div>
              <div className="progress-text">{presetProgress.status}</div>
            </div>
          )}
        </div>
      </div>

      <div className="upload-section">
        <div className="upload-header">
          <h3>📂 Upload Dataset File</h3>
        </div>
        <div className="upload-content">
          <p className="upload-description">
            Upload a JSON file containing contrastive pairs to generate a steering vector
          </p>
          <label className="upload-button">
            {uploadingDataset ? '⏳ Processing...' : '📤 Upload Dataset JSON'}
            <input
              type="file"
              accept=".json"
              onChange={uploadDataset}
              disabled={uploadingDataset || executingPreset}
              style={{ display: 'none' }}
            />
          </label>
        </div>
      </div>

      {presets.length === 0 && !loadingPresets && (
        <div className="empty-state">
          <p>📁 No presets found. Create preset folders in the <code>backend/Preset/</code> directory.</p>
        </div>
      )}
    </div>
  );
}

export default ContrastiveSearch;

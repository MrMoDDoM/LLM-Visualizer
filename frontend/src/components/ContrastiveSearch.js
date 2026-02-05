import React, { useState, useEffect } from 'react';
import './ContrastiveSearch.css';

function ContrastiveSearch({ apiBaseUrl, modelInfo, onVectorGenerated, onError }) {
  const [contrastivePairs, setContrastivePairs] = useState([
    {
      id: Date.now(),
      positive: 'Love and compassion are wonderful',
      negative: 'Hate and cruelty are terrible'
    }
  ]);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [vectorName, setVectorName] = useState('');
  const [targetLayer, setTargetLayer] = useState(null); // null = use default (middle layer)
  const [datasetDescription, setDatasetDescription] = useState('');
  
  // Preset management
  const [presets, setPresets] = useState([]);
  const [selectedPreset, setSelectedPreset] = useState('');
  const [loadingPresets, setLoadingPresets] = useState(false);
  const [executingPreset, setExecutingPreset] = useState(false);
  const [presetProgress, setPresetProgress] = useState(null);

  const addPair = () => {
    setContrastivePairs([
      ...contrastivePairs,
      {
        id: Date.now(),
        positive: '',
        negative: ''
      }
    ]);
  };

  const removePair = (id) => {
    if (contrastivePairs.length === 1) {
      alert('At least one pair is required');
      return;
    }
    setContrastivePairs(contrastivePairs.filter(pair => pair.id !== id));
  };

  const updatePair = (id, field, value) => {
    setContrastivePairs(contrastivePairs.map(pair =>
      pair.id === id ? { ...pair, [field]: value } : pair
    ));
  };

  const duplicatePair = (id) => {
    const pairToDuplicate = contrastivePairs.find(pair => pair.id === id);
    if (pairToDuplicate) {
      setContrastivePairs([
        ...contrastivePairs,
        {
          id: Date.now(),
          positive: pairToDuplicate.positive,
          negative: pairToDuplicate.negative
        }
      ]);
    }
  };

  const handleGenerate = async () => {
    // Validate input
    const emptyPairs = contrastivePairs.filter(
      pair => !pair.positive.trim() || !pair.negative.trim()
    );
    
    if (emptyPairs.length > 0) {
      alert('All pairs must have both positive and negative text');
      return;
    }

    if (!vectorName.trim()) {
      alert('Please enter a name for the steering vector');
      return;
    }

    setGenerating(true);
    setError(null);

    try {
      const response = await fetch(`${apiBaseUrl}/generate_steering_vector`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          vector_name: vectorName,
          pairs: contrastivePairs.map(pair => ({
            positive: pair.positive,
            negative: pair.negative
          })),
          target_layer: targetLayer // Use specified layer or null for default (middle layer)
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
      
      alert(`✅ Successfully generated steering vector "${data.name}"!\n\n` +
            `Shape: [${data.shape.join(', ')}]\n` +
            `Norm: ${data.norm.toFixed(4)}\n` +
            `Layer: ${data.layer}\n` +
            `Pairs used: ${data.num_pairs}`);
      
      // Notify parent to reload vectors list
      if (onVectorGenerated) {
        onVectorGenerated();
      }
      
      // Reset only the vector name, keep the dataset
      setVectorName('');
      
    } catch (err) {
      if (onError) {
        onError({ message: err.message, stacktrace: null });
      } else {
        setError(err.message);
      }
      console.error('Error generating steering vector:', err);
    } finally {
      setGenerating(false);
    }
  };

  // Load available presets on mount
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
      
      let message = `✅ Preset "${data.preset_name}" executed!\n\n`;
      message += `✓ Generated: ${data.processed} vectors\n`;
      
      if (data.failed > 0) {
        message += `✗ Failed: ${data.failed} datasets\n\n`;
        message += 'Errors:\n' + data.errors.join('\n');
      }
      
      if (data.vectors.length > 0) {
        message += '\n\nGenerated vectors:\n';
        data.vectors.forEach(v => {
          message += `• ${v.name} (Layer ${v.layer}, ${v.pair_count} pairs)\n`;
        });
      }
      
      alert(message);
      
      // Notify parent to reload vectors list
      if (onVectorGenerated) {
        onVectorGenerated();
      }
      
      // Reset selection
      setSelectedPreset('');
      
    } catch (err) {
      setPresetProgress(null);
      alert(`❌ Error executing preset: ${err.message}`);
      console.error('Error executing preset:', err);
    } finally {
      setExecutingPreset(false);
    }
  };

  const exportDataset = () => {
    const dataset = {
      metadata: {
        name: vectorName || 'Untitled Dataset',
        target_layer: targetLayer,
        description: datasetDescription || '',
        created_at: new Date().toISOString(),
        version: '1.0'
      },
      pairs: contrastivePairs
    };
    
    const dataStr = JSON.stringify(dataset, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    const filename = vectorName ? `${vectorName}_dataset.json` : `contrastive_dataset_${Date.now()}.json`;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importDataset = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target.result);
        
        // Check if new format (with metadata) or old format (array only)
        if (imported.metadata && Array.isArray(imported.pairs)) {
          // New format with metadata
          const { metadata, pairs } = imported;
          
          // Populate UI fields from metadata
          if (metadata.name) setVectorName(metadata.name);
          if (metadata.target_layer !== undefined) setTargetLayer(metadata.target_layer);
          if (metadata.description) setDatasetDescription(metadata.description);
          
          // Ensure each pair has an ID
          const withIds = pairs.map(pair => ({
            ...pair,
            id: pair.id || Date.now() + Math.random()
          }));
          setContrastivePairs(withIds);
          
          alert(`✅ Imported dataset "${metadata.name}" with ${withIds.length} pairs`);
        } else if (Array.isArray(imported)) {
          // Old format (backward compatibility)
          const withIds = imported.map(pair => ({
            ...pair,
            id: pair.id || Date.now() + Math.random()
          }));
          setContrastivePairs(withIds);
          alert(`✅ Imported ${withIds.length} pairs (legacy format)`);
        } else {
          alert('❌ Invalid file format');
        }
      } catch (err) {
        alert('❌ Error parsing JSON file: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="contrastive-search">
      <div className="contrastive-header">
        <div className="header-content">
          <h2>🔍 Contrastive Activation Search</h2>
          <div className="info-section-inline">
            <h4>ℹ️ How it works:</h4>
            <ol>
              <li><strong>Create pairs:</strong> Each pair should represent the same concept but with opposite sentiment/meaning</li>
              <li><strong>Positive examples:</strong> Text that represents the desired behavior/concept</li>
              <li><strong>Negative examples:</strong> Text that represents the opposite behavior/concept</li>
              <li><strong>Generate:</strong> The algorithm will compute the difference in activations to create a steering vector</li>
            </ol>
          </div>
        </div>
        <div className="header-actions">
          <button onClick={exportDataset} className="export-button" disabled={generating}>
            💾 Export Dataset
          </button>
          <label className="import-button">
            📂 Import Dataset
            <input
              type="file"
              accept=".json"
              onChange={importDataset}
              disabled={generating}
              style={{ display: 'none' }}
            />
          </label>
        </div>
      </div>

      {/* Preset Manager Section */}
      <div className="preset-manager">
        <div className="preset-header">
          <h3>📦 Preset Manager</h3>
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
              {presets.find(p => p.name === selectedPreset)?.datasets.map((dataset, idx) => (
                <div key={idx} className="dataset-info">
                  <span className="dataset-name">{dataset.metadata.name || dataset.filename}</span>
                  <span className="dataset-meta">
                    Layer {dataset.metadata.target_layer || 'auto'} • {dataset.pair_count} pair{dataset.pair_count !== 1 ? 's' : ''}
                  </span>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={executePreset}
            disabled={!selectedPreset || executingPreset}
            className="execute-preset-button"
          >
            {executingPreset 
              ? `⏳ Processing preset...` 
              : `🚀 Execute Preset`}
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

      <div className="vector-config-section">
        <div className="vector-naming">
          <label>Steering Vector Name:</label>
          <input
            type="text"
            value={vectorName}
            onChange={(e) => setVectorName(e.target.value)}
            placeholder="e.g., positive_sentiment, honesty, creativity"
            disabled={generating}
            className="vector-name-input"
          />
        </div>

        <div className="layer-selection">
          <label>Target Layer:</label>
          <input
            type="number"
            value={targetLayer === null ? '' : targetLayer}
            onChange={(e) => {
              const val = e.target.value;
              setTargetLayer(val === '' ? null : parseInt(val));
            }}
            placeholder={`Auto (${modelInfo ? Math.floor(modelInfo.num_layers / 2) : 'N/A'})`}
            disabled={generating}
            min={0}
            max={modelInfo ? modelInfo.num_layers - 1 : 0}
            className="layer-input"
          />
          <span className="layer-info">
            {targetLayer === null 
              ? `Using middle layer (${modelInfo ? Math.floor(modelInfo.num_layers / 2) : 'N/A'})` 
              : `Layer ${targetLayer} of ${modelInfo ? modelInfo.num_layers - 1 : 'N/A'}`
            }
          </span>
        </div>

        <div className="dataset-description">
          <label>Dataset Description (optional):</label>
          <textarea
            value={datasetDescription}
            onChange={(e) => setDatasetDescription(e.target.value)}
            placeholder="Describe the purpose and characteristics of this dataset..."
            disabled={generating}
            className="description-textarea"
            rows={3}
          />
        </div>
      </div>

      <button
        onClick={handleGenerate}
        disabled={generating || contrastivePairs.length === 0 || !vectorName.trim()}
        className="generate-vector-button"
      >
        {generating ? '⏳ Generating Steering Vector...' : '🚀 Generate Steering Vector'}
      </button>

      <div className="dataset-container">
        <div className="dataset-header">
          <h3>📝 Contrastive Pairs ({contrastivePairs.length})</h3>
          <button onClick={addPair} disabled={generating} className="add-pair-button">
            + Add Pair
          </button>
        </div>

        <div className="pairs-grid-header">
          <div className="column-label positive-label">✅ Positive Examples</div>
          <div className="column-label negative-label">❌ Negative Examples</div>
        </div>

        <div className="pairs-list">
          {contrastivePairs.map((pair, index) => (
            <div key={pair.id} className="pair-row">
              <div className="pair-number">{index + 1}</div>
              
              <div className="pair-content">
                <textarea
                  value={pair.positive}
                  onChange={(e) => updatePair(pair.id, 'positive', e.target.value)}
                  placeholder="Enter positive example..."
                  disabled={generating}
                  className="pair-textarea positive-textarea"
                  rows={3}
                />
                
                <textarea
                  value={pair.negative}
                  onChange={(e) => updatePair(pair.id, 'negative', e.target.value)}
                  placeholder="Enter negative example..."
                  disabled={generating}
                  className="pair-textarea negative-textarea"
                  rows={3}
                />
              </div>

              <div className="pair-actions">
                <button
                  onClick={() => duplicatePair(pair.id)}
                  disabled={generating}
                  className="duplicate-button"
                  title="Duplicate this pair"
                >
                  📋
                </button>
                <button
                  onClick={() => removePair(pair.id)}
                  disabled={generating || contrastivePairs.length === 1}
                  className="remove-pair-button"
                  title="Remove this pair"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {error && <div className="error-message">❌ {error}</div>}
    </div>
  );
}

export default ContrastiveSearch;

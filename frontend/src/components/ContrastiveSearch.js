import React, { useState } from 'react';
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

  const exportDataset = () => {
    const dataStr = JSON.stringify(contrastivePairs, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `contrastive_dataset_${Date.now()}.json`;
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
        if (Array.isArray(imported)) {
          // Ensure each pair has an ID
          const withIds = imported.map(pair => ({
            ...pair,
            id: pair.id || Date.now() + Math.random()
          }));
          setContrastivePairs(withIds);
          alert(`✅ Imported ${withIds.length} pairs`);
        } else {
          alert('Invalid file format');
        }
      } catch (err) {
        alert('Error parsing JSON file');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="contrastive-search">
      <div className="contrastive-header">
        <div className="header-content">
          <h2>🔍 Contrastive Activation Search</h2>
          <p className="description">
            Generate steering vectors by providing pairs of positive and negative examples.
            The model will learn to distinguish between the two concepts.
          </p>
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
        <div className="layer-input-group">
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
      </div>

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

      <div className="info-section">
        <h4>ℹ️ How it works:</h4>
        <ol>
          <li><strong>Create pairs:</strong> Each pair should represent the same concept but with opposite sentiment/meaning</li>
          <li><strong>Positive examples:</strong> Text that represents the desired behavior/concept</li>
          <li><strong>Negative examples:</strong> Text that represents the opposite behavior/concept</li>
          <li><strong>Generate:</strong> The algorithm will compute the difference in activations to create a steering vector</li>
        </ol>
      </div>

      <button
        onClick={handleGenerate}
        disabled={generating || contrastivePairs.length === 0 || !vectorName.trim()}
        className="generate-vector-button"
      >
        {generating ? '⏳ Generating Steering Vector...' : '🚀 Generate Steering Vector'}
      </button>

      {error && <div className="error-message">❌ {error}</div>}
    </div>
  );
}

export default ContrastiveSearch;

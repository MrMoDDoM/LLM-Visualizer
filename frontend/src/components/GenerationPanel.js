import React, { useState, useEffect } from 'react';
import './GenerationPanel.css';

function GenerationPanel({ apiBaseUrl, modelInfo, steeringVectors, onGenerationComplete, onError, steeringConfigs, onSteeringConfigsChange }) {
  const [prompt, setPrompt] = useState('Tell me a short story about a robot.');
  const [maxTokens, setMaxTokens] = useState(20);
  const [temperature, setTemperature] = useState(1.0);
  const [topK, setTopK] = useState(50);
  const [topP, setTopP] = useState(0.9);
  const [doSample, setDoSample] = useState(true);
  const [useSeed, setUseSeed] = useState(false);
  const [seed, setSeed] = useState(42);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);

  // Handle spacebar shortcut for generation
  useEffect(() => {
    const handleKeyPress = (e) => {
      // Only trigger if spacebar is pressed and we're not in an input/textarea
      if (e.code === 'Space' && 
          !generating && 
          prompt && 
          e.target.tagName !== 'INPUT' && 
          e.target.tagName !== 'TEXTAREA' &&
          e.target.tagName !== 'SELECT') {
        e.preventDefault();
        handleGenerate();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [generating, prompt]); // Re-bind when these change

  const addSteeringConfig = () => {
    if (steeringVectors.length === 0) {
      alert('Please upload a steering vector first');
      return;
    }
    
    const defaultLayer = 16; // Default layer is now fixed at 16
    const newConfig = {
      id: Date.now(),
      vector_name: steeringVectors[0].name,
      layer: defaultLayer,
      coefficient: 0.0, // Default coefficient is 0
      enabled: true
    };
    onSteeringConfigsChange([...steeringConfigs, newConfig]);
  };

  const removeSteeringConfig = (id) => {
    onSteeringConfigsChange(steeringConfigs.filter(config => config.id !== id));
  };

  const updateSteeringConfig = (id, field, value) => {
    onSteeringConfigsChange(steeringConfigs.map(config =>
      config.id === id ? { ...config, [field]: value } : config
    ));
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);

    try {
      const requestBody = {
        prompt,
        max_new_tokens: maxTokens,
        temperature,
        top_k: topK,
        top_p: topP,
        do_sample: doSample,
        steering_configs: steeringConfigs.map(({ id, ...rest }) => rest)
      };

      // Add seed only if enabled
      if (useSeed) {
        requestBody.seed = seed;
      }

      const response = await fetch(`${apiBaseUrl}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (onError) {
          onError(errorData);
        } else {
          throw new Error(errorData.detail || 'Generation failed');
        }
        return;
      }

      const data = await response.json();
      onGenerationComplete(data);

    } catch (err) {
      if (onError) {
        onError({ message: err.message, stacktrace: null });
      } else {
        setError(err.message);
      }
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="generation-panel">
      <h2>🎯 Generation Settings</h2>

      <div className="form-group">
        <label>Prompt:</label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={4}
          disabled={generating}
          placeholder="Enter your prompt here..."
        />
      </div>

      <div className="params-grid">
        <div className="form-group">
          <label>Max Tokens: {maxTokens}</label>
          <input
            type="range"
            min="1"
            max="100"
            value={maxTokens}
            onChange={(e) => setMaxTokens(parseInt(e.target.value))}
            disabled={generating}
          />
        </div>

        <div className="form-group">
          <label>Temperature: {temperature.toFixed(2)}</label>
          <input
            type="range"
            min="0.1"
            max="2.0"
            step="0.1"
            value={temperature}
            onChange={(e) => setTemperature(parseFloat(e.target.value))}
            disabled={generating || !doSample}
          />
        </div>

        <div className="form-group">
          <label>Top-K: {topK}</label>
          <input
            type="range"
            min="1"
            max="100"
            value={topK}
            onChange={(e) => setTopK(parseInt(e.target.value))}
            disabled={generating || !doSample}
          />
        </div>

        <div className="form-group">
          <label>Top-P: {topP.toFixed(2)}</label>
          <input
            type="range"
            min="0.1"
            max="1.0"
            step="0.05"
            value={topP}
            onChange={(e) => setTopP(parseFloat(e.target.value))}
            disabled={generating || !doSample}
          />
        </div>
      </div>

      {/* Generate Button - Always visible after sliders */}
      <button
        onClick={handleGenerate}
        disabled={generating || !prompt}
        className="generate-button primary"
        title="Press spacebar to generate (when not in input field)"
      >
        {generating ? '⏳ Generating...' : '🚀 Generate (Space)'}
      </button>

      {error && <div className="error-message">❌ {error}</div>}

      {/* Reproducibility Controls */}
      <div className="reproducibility-section">
        <h3>🎲 Reproducibility Settings</h3>
        
        <div className="reproducibility-controls">
          <div className="form-group-inline">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={!doSample}
                onChange={(e) => setDoSample(!e.target.checked)}
                disabled={generating}
              />
              <span>Deterministic (Greedy Decoding)</span>
            </label>
            <p className="help-text">
              {doSample 
                ? "⚠️ Sampling enabled: results will vary even with same seed" 
                : "✓ Greedy decoding: always selects most likely token (fully deterministic)"}
            </p>
          </div>

          <div className="form-group-inline">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={useSeed}
                onChange={(e) => setUseSeed(e.target.checked)}
                disabled={generating}
              />
              <span>Use Fixed Seed</span>
            </label>
            {useSeed && (
              <div className="seed-input-group">
                <label>Seed:</label>
                <input
                  type="number"
                  value={seed}
                  onChange={(e) => setSeed(parseInt(e.target.value) || 0)}
                  disabled={generating}
                  className="seed-input"
                  min="0"
                />
                <button
                  onClick={() => setSeed(Math.floor(Math.random() * 1000000))}
                  disabled={generating}
                  className="random-seed-button"
                >
                  🎲 Random
                </button>
              </div>
            )}
            <p className="help-text">
              {useSeed 
                ? `Using seed ${seed} for reproducibility` 
                : "No seed: each generation will be different"}
            </p>
          </div>

          <div className="reproducibility-info">
            <strong>ℹ️ For exact reproducibility:</strong>
            <ul>
              <li>Enable "Deterministic" mode (disables sampling)</li>
              <li>Use same prompt and parameters</li>
              <li>Optional: Fix seed for sampling mode (less deterministic)</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="steering-section">
        <div className="section-header">
          <h3>⚡ Steering Vectors</h3>
          <button
            onClick={addSteeringConfig}
            disabled={generating || steeringVectors.length === 0}
            className="add-button"
          >
            + Add Steering
          </button>
        </div>

        {steeringConfigs.length === 0 ? (
          <p className="empty-message">No steering vectors configured</p>
        ) : (
          <div className="steering-configs">
            {steeringConfigs.map(config => (
              <div key={config.id} className="steering-config">
                <div className="config-row">
                  <input
                    type="checkbox"
                    checked={config.enabled}
                    onChange={(e) => updateSteeringConfig(config.id, 'enabled', e.target.checked)}
                    disabled={generating}
                  />
                  
                  <select
                    value={config.vector_name}
                    onChange={(e) => updateSteeringConfig(config.id, 'vector_name', e.target.value)}
                    disabled={generating}
                    className="vector-select"
                  >
                    {steeringVectors.map(vec => (
                      <option key={vec.name} value={vec.name}>
                        {vec.name}
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={() => removeSteeringConfig(config.id)}
                    disabled={generating}
                    className="remove-button"
                  >
                    ×
                  </button>
                </div>

                <div className="config-row">
                  <label>Layer:</label>
                  <input
                    type="number"
                    min="0"
                    max={modelInfo.num_layers - 1}
                    value={config.layer}
                    onChange={(e) => updateSteeringConfig(config.id, 'layer', parseInt(e.target.value) || 0)}
                    disabled={generating}
                    className="layer-number-input"
                  />
                  <span className="layer-range-info">
                    (0-{modelInfo.num_layers - 1})
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default GenerationPanel;

import React, { useState } from 'react';
import './ModelLoader.css';

const PRESET_MODELS = [
  { name: 'meta-llama/Llama-3.2-1B-Instruct', label: 'LLaMA 3.2 1B Instruct' },
  { name: 'meta-llama/Llama-3.1-8B-Instruct', label: 'LLaMA 3.1 8B Instruct' },
  { name: 'meta-llama/Llama-2-7b-chat-hf', label: 'LLaMA 2 7B Chat' },
  { name: 'mistralai/Mistral-7B-Instruct-v0.2', label: 'Mistral 7B Instruct v0.2' },
  { name: 'gpt2', label: 'GPT-2 (Small)' },
  { name: 'gpt2-medium', label: 'GPT-2 Medium' },
];

function ModelLoader({ apiBaseUrl, onModelLoaded }) {
  const [selectedModel, setSelectedModel] = useState('meta-llama/Llama-3.1-8B-Instruct');
  const [customModel, setCustomModel] = useState('');
  const [useCustom, setUseCustom] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState('');

  const handleLoadModel = async () => {
    const modelName = useCustom ? customModel : selectedModel;
    
    if (!modelName.trim()) {
      setError('Please enter a model name');
      return;
    }

    setLoading(true);
    setError(null);
    setProgress('Downloading model...');

    try {
      const response = await fetch(`${apiBaseUrl}/load_model`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ model_name: modelName }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to load model');
      }

      const data = await response.json();
      setProgress('Model loaded successfully!');
      
      setTimeout(() => {
        onModelLoaded({
          model_name: data.model_name,
          num_layers: data.num_layers,
          hidden_size: data.hidden_size,
          device: data.device
        });
      }, 500);

    } catch (err) {
      setError(err.message);
      setLoading(false);
      setProgress('');
    }
  };

  return (
    <div className="model-loader">
      <h2>Load Language Model</h2>
      
      <div className="model-selection">
        <div className="radio-group">
          <label>
            <input
              type="radio"
              checked={!useCustom}
              onChange={() => setUseCustom(false)}
            />
            <span>Preset Models</span>
          </label>
          
          {!useCustom && (
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              disabled={loading}
              className="model-select"
            >
              {PRESET_MODELS.map(model => (
                <option key={model.name} value={model.name}>
                  {model.label}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="radio-group">
          <label>
            <input
              type="radio"
              checked={useCustom}
              onChange={() => setUseCustom(true)}
            />
            <span>Custom Model</span>
          </label>
          
          {useCustom && (
            <input
              type="text"
              value={customModel}
              onChange={(e) => setCustomModel(e.target.value)}
              placeholder="e.g., meta-llama/Llama-3.1-8B-Instruct"
              disabled={loading}
              className="model-input"
            />
          )}
        </div>
      </div>

      <button
        onClick={handleLoadModel}
        disabled={loading}
        className="load-button"
      >
        {loading ? 'Loading...' : 'Load Model'}
      </button>

      {progress && <div className="progress-message">{progress}</div>}
      {error && <div className="error-message">❌ {error}</div>}

      <div className="info-box">
        <h4>ℹ️ Note:</h4>
        <ul>
          <li>First-time loading downloads the model (may take several minutes)</li>
          <li>Requires sufficient RAM/VRAM for the model size</li>
          <li>LLaMA models may require HuggingFace authentication</li>
        </ul>
      </div>
    </div>
  );
}

export default ModelLoader;

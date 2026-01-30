import React, { useState, useEffect } from 'react';
import './App.css';
import ModelLoader from './components/ModelLoader';
import GenerationPanel from './components/GenerationPanel';
import VisualizationPanel from './components/VisualizationPanel';
import SteeringVectorManager from './components/SteeringVectorManager';
import NavigationControls from './components/NavigationControls';

const API_BASE_URL = 'http://localhost:8000';

function App() {
  const [modelLoaded, setModelLoaded] = useState(false);
  const [modelInfo, setModelInfo] = useState(null);
  const [generationResult, setGenerationResult] = useState(null);
  const [steeringVectors, setSteeringVectors] = useState([]);
  const [apiStatus, setApiStatus] = useState('checking');
  const [currentTokenIndex, setCurrentTokenIndex] = useState(0);

  // Check API status on mount
  useEffect(() => {
    checkApiStatus();
  }, []);

  const checkApiStatus = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/status`);
      const data = await response.json();
      setApiStatus('connected');
      setModelLoaded(data.model_loaded);
      if (data.model_loaded) {
        setModelInfo({
          model_name: data.model_name,
          device: data.device
        });
      }
    } catch (error) {
      console.error('API connection error:', error);
      setApiStatus('disconnected');
    }
  };

  const loadSteeringVectors = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/steering_vectors`);
      const data = await response.json();
      setSteeringVectors(data.vectors);
    } catch (error) {
      console.error('Error loading steering vectors:', error);
    }
  };

  useEffect(() => {
    if (modelLoaded) {
      loadSteeringVectors();
    }
  }, [modelLoaded]);

  // Expose updateTokenIndex to child components via window
  useEffect(() => {
    window.updateTokenIndex = setCurrentTokenIndex;
    return () => {
      delete window.updateTokenIndex;
    };
  }, []);

  const handleReset = async () => {
    if (!window.confirm('⚠️ Reset everything? This will unload the model and clear all data.')) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/reset`, {
        method: 'POST',
      });

      if (response.ok) {
        // Reset local state
        setModelLoaded(false);
        setModelInfo(null);
        setGenerationResult(null);
        setSteeringVectors([]);
        
        alert('✅ System reset successfully!');
      }
    } catch (error) {
      console.error('Error resetting:', error);
      alert('❌ Error during reset');
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <div className="header-row">
          <div className="header-left">
            <h1>🧠 LLM Hidden States Visualizer</h1>
            <div className="status-indicator">
              <span className={`status-dot ${apiStatus}`}></span>
              <span>API: {apiStatus}</span>
              {modelLoaded && <span className="model-name">| Model: {modelInfo?.model_name}</span>}
            </div>
          </div>
          
          <div className="header-right">
            {generationResult && (
              <NavigationControls
                currentTokenIndex={currentTokenIndex}
                totalTokens={generationResult.num_tokens_generated}
                currentTokenText={generationResult.tokens[currentTokenIndex]}
                onTokenChange={setCurrentTokenIndex}
              />
            )}
            
            {modelLoaded && (
              <button className="reset-button" onClick={handleReset}>
                🔄 Reset
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="main-container">
        {!modelLoaded ? (
          <div className="centered-container">
            <ModelLoader 
              apiBaseUrl={API_BASE_URL}
              onModelLoaded={(info) => {
                setModelLoaded(true);
                setModelInfo(info);
              }}
            />
          </div>
        ) : (
          <div className="workspace">
            <div className="left-panel">
              <GenerationPanel
                apiBaseUrl={API_BASE_URL}
                modelInfo={modelInfo}
                steeringVectors={steeringVectors}
                onGenerationComplete={(result) => {
                  setGenerationResult(result);
                  setCurrentTokenIndex(0); // Reset to first token on new generation
                }}
              />
              
              <SteeringVectorManager
                apiBaseUrl={API_BASE_URL}
                steeringVectors={steeringVectors}
                onVectorsChanged={loadSteeringVectors}
              />
            </div>

            <div className="right-panel">
              {generationResult ? (
                <VisualizationPanel
                  apiBaseUrl={API_BASE_URL}
                  generationResult={generationResult}
                  currentTokenIndex={currentTokenIndex}
                />
              ) : (
                <div className="placeholder">
                  <p>Generate text to see visualizations</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
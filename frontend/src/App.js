import React, { useState, useEffect } from 'react';
import './App.css';
import ModelLoader from './components/ModelLoader';
import GenerationPanel from './components/GenerationPanel';
import VisualizationPanel from './components/VisualizationPanel';
import SteeringVectorManager from './components/SteeringVectorManager';

const API_BASE_URL = 'http://localhost:8000';

function App() {
  const [modelLoaded, setModelLoaded] = useState(false);
  const [modelInfo, setModelInfo] = useState(null);
  const [generationResult, setGenerationResult] = useState(null);
  const [steeringVectors, setSteeringVectors] = useState([]);
  const [apiStatus, setApiStatus] = useState('checking');

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

  return (
    <div className="App">
      <header className="App-header">
        <h1>🧠 LLM Hidden States Visualizer</h1>
        <div className="status-indicator">
          <span className={`status-dot ${apiStatus}`}></span>
          <span>API: {apiStatus}</span>
          {modelLoaded && <span className="model-name">| Model: {modelInfo?.model_name}</span>}
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

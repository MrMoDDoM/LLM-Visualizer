import React, { useState, useEffect } from 'react';
import './App.css';
import ModelLoader from './components/ModelLoader';
import GenerationPanel from './components/GenerationPanel';
import VisualizationPanel from './components/VisualizationPanel';
import SteeringVectorManager from './components/SteeringVectorManager';
import ContrastiveSearch from './components/ContrastiveSearch';
import ErrorModal from './components/ErrorModal';

// API base URL is stored in state so the user can change it from the UI.
const DEFAULT_API_BASE = typeof window !== 'undefined' && window.localStorage
  ? (localStorage.getItem('apiBaseUrl') || 'http://localhost:8000')
  : 'http://localhost:8000';

function App() {
  const [modelLoaded, setModelLoaded] = useState(false);
  const [modelInfo, setModelInfo] = useState(null);
  const [generationResult, setGenerationResult] = useState(null);
  const [steeringVectors, setSteeringVectors] = useState([]);
  const [steeringConfigs, setSteeringConfigs] = useState([]);
  const [apiStatus, setApiStatus] = useState('checking');
  const [apiBaseUrl, setApiBaseUrl] = useState(DEFAULT_API_BASE);
  const [isEditingApi, setIsEditingApi] = useState(false);
  const [editingApiValue, setEditingApiValue] = useState(DEFAULT_API_BASE);
  const [activeTab, setActiveTab] = useState('generation'); // 'generation' or 'contrastive'
  const [currentError, setCurrentError] = useState(null); // { message: string, stacktrace: string }

  // Check API status on mount
  useEffect(() => {
    checkApiStatus();
  }, []);

  // Periodic API health check - runs every 10 seconds
  useEffect(() => {
    const healthCheckInterval = setInterval(() => {
      checkApiStatus();
    }, 10000); // Check every 10 seconds

    return () => clearInterval(healthCheckInterval);
  }, [apiBaseUrl]); // Restart interval when API URL changes

  const checkApiStatus = async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      const response = await fetch(`${apiBaseUrl}/status`, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

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
      // Clear model info if connection is lost
      if (error.name === 'AbortError') {
        console.error('API request timeout - endpoint unreachable');
      }
    }
  };

  const loadSteeringVectors = async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${apiBaseUrl}/steering_vectors`, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setSteeringVectors(data.vectors);
    } catch (error) {
      console.error('Error loading steering vectors:', error);
      if (error.name === 'AbortError' || error.message.includes('fetch')) {
        setApiStatus('disconnected');
      }
    }
  };

  // Handler for radar chart coefficient changes
  const handleCoefficientChange = (id, newCoefficient) => {
    setSteeringConfigs(configs => 
      configs.map(config => 
        config.id === id ? { ...config, coefficient: newCoefficient } : config
      )
    );
  };

  // Helper function to show error modal with optional stacktrace
  const showError = async (error) => {
    let message = error.message || String(error);
    let stacktrace = null;

    // If error has response property (from fetch), try to extract stacktrace
    if (error.response) {
      try {
        const data = await error.response.json();
        message = data.detail || message;
        stacktrace = data.stacktrace || null;
      } catch (e) {
        // ignore JSON parse errors
      }
    } else if (error.detail) {
      message = error.detail;
      stacktrace = error.stacktrace || null;
    }

    setCurrentError({ message, stacktrace });
  };

  useEffect(() => {
    if (modelLoaded) {
      loadSteeringVectors();
    }
  }, [modelLoaded]);

  // Auto-sync steeringConfigs when steeringVectors change
  useEffect(() => {
    if (steeringVectors.length === 0) {
      setSteeringConfigs([]);
      return;
    }

    console.log('Syncing steeringConfigs from steeringVectors:', steeringVectors);

    // Create a map of vector name to category for quick lookup
    const vectorCategoryMap = {};
    steeringVectors.forEach(vector => {
      vectorCategoryMap[vector.name] = vector.category || 'extra';
    });

    // Update existing configs with correct category
    const updatedConfigs = steeringConfigs
      .filter(config => vectorCategoryMap.hasOwnProperty(config.vector_name))
      .map(config => ({
        ...config,
        category: vectorCategoryMap[config.vector_name], // Update category from vector
        layer: config.layer || steeringVectors.find(v => v.name === config.vector_name)?.layer || 16
      }));

    // Get existing config vector names
    const existingVectorNames = updatedConfigs.map(c => c.vector_name);
    
    // Add new vectors as configs (only if not already present)
    const newConfigs = [];
    steeringVectors.forEach(vector => {
      if (!existingVectorNames.includes(vector.name)) {
        const newConfig = {
          id: Date.now() + Math.random(), // Unique ID
          vector_name: vector.name,
          layer: vector.layer || 16,
          coefficient: 0.0,
          enabled: true,
          category: vector.category || 'extra'
        };
        console.log(`Creating config for ${vector.name} with category: ${vector.category}`);
        newConfigs.push(newConfig);
      }
    });

    // Merge updated configs with new configs
    const finalConfigs = [...updatedConfigs, ...newConfigs];
    console.log('Final steeringConfigs:', finalConfigs);
    
    // Only update if there are changes
    if (JSON.stringify(finalConfigs) !== JSON.stringify(steeringConfigs)) {
      setSteeringConfigs(finalConfigs);
    }
  }, [steeringVectors]);

  const handleReset = async () => {
    if (!window.confirm('⚠️ Reset everything? This will unload the model and clear all data.')) {
      return;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${apiBaseUrl}/reset`, {
        method: 'POST',
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        // Reset local state
        setModelLoaded(false);
        setModelInfo(null);
        setGenerationResult(null);
        setSteeringVectors([]);
        
        alert('✅ System reset successfully!');
      } else {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error('Error resetting:', error);
      if (error.name === 'AbortError') {
        alert('❌ Error during reset: API timeout - endpoint unreachable');
        setApiStatus('disconnected');
      } else {
        alert('❌ Error during reset');
      }
    }
  };

  // Save editingApiValue into apiBaseUrl (persist in localStorage) and re-check status
  const saveApiBaseUrl = async () => {
    const url = editingApiValue.trim();
    if (!url) {
      alert('Please enter a valid API base URL');
      return;
    }

    setApiBaseUrl(url);
    try {
      localStorage.setItem('apiBaseUrl', url);
    } catch (e) {
      // ignore localStorage errors
    }
    setIsEditingApi(false);
    // Re-check API status for the new URL and reload vectors if model was loaded
    try {
      await checkApiStatus();
      if (modelLoaded) {
        await loadSteeringVectors();
      }
    } catch (e) {
      // handled in checkApiStatus
    }
  };

  // keep the input in sync when apiBaseUrl changes externally
  useEffect(() => {
    setEditingApiValue(apiBaseUrl);
  }, [apiBaseUrl]);

  return (
    <div className="App">
      <header className="App-header">
        <div className="header-row">
          <div className="header-left">
            <h1>🧠 LLM Hidden States Visualizer</h1>
          </div>
          
          <div className="header-right">
            <div className="status-indicator">
              <span className={`status-dot ${apiStatus}`}></span>
              <span>API: {apiStatus}</span>
              {!isEditingApi && (
                <button 
                  className="api-config-toggle" 
                  onClick={() => setIsEditingApi(true)}
                  title="Configure API endpoint"
                >
                  ⚙️
                </button>
              )}
            </div>
            {modelLoaded && (
              <div className="model-info-header">
                <span className="model-name">Model: {modelInfo?.model_name}</span>
                <button className="reset-button" onClick={handleReset} title="Reset system">
                  🔄 Reset
                </button>
              </div>
            )}
          </div>
        </div>
        
        {isEditingApi && (
          <div className="api-config-expanded">
            <label>API Endpoint:</label>
            <input
              type="text"
              value={editingApiValue}
              onChange={(e) => setEditingApiValue(e.target.value)}
              className="api-input"
              placeholder="http://localhost:8000"
            />
            <button className="api-save-button" onClick={saveApiBaseUrl}>✓ Save</button>
            <button className="api-cancel-button" onClick={() => { setIsEditingApi(false); setEditingApiValue(apiBaseUrl); }}>✗ Cancel</button>
          </div>
        )}
      </header>

      <div className="main-container">
        {!modelLoaded ? (
          <div className="centered-container">
            <ModelLoader 
              apiBaseUrl={apiBaseUrl}
              onModelLoaded={(info) => {
                setModelLoaded(true);
                setModelInfo(info);
              }}
            />
          </div>
        ) : (
          <>
            {/* Tab Navigation */}
            <div className="tab-navigation">
              <button
                className={`tab-button ${activeTab === 'generation' ? 'active' : ''}`}
                onClick={() => setActiveTab('generation')}
              >
                🎯 Generation & Steering
              </button>
              <button
                className={`tab-button ${activeTab === 'contrastive' ? 'active' : ''}`}
                onClick={() => setActiveTab('contrastive')}
              >
                🔍 Contrastive Search
              </button>
            </div>

            {/* Tab Content */}
            {activeTab === 'generation' ? (
              <div className="workspace">
                <div className="left-panel">
                  <GenerationPanel
                    apiBaseUrl={apiBaseUrl}
                    modelInfo={modelInfo}
                    steeringVectors={steeringVectors}
                    steeringConfigs={steeringConfigs}
                    onSteeringConfigsChange={setSteeringConfigs}
                    onGenerationComplete={(result) => {
                      setGenerationResult(result);
                    }}
                    onError={showError}
                  />
                  
                  <SteeringVectorManager
                    apiBaseUrl={apiBaseUrl}
                    steeringVectors={steeringVectors}
                    onVectorsChanged={loadSteeringVectors}
                    onError={showError}
                  />
                </div>

                <div className="right-panel">
                  {generationResult ? (
                    <VisualizationPanel
                      generationResult={generationResult}
                      steeringConfigs={steeringConfigs}
                      onCoefficientChange={handleCoefficientChange}
                    />
                  ) : (
                    <div className="placeholder">
                      <p>Generate text to see results</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="contrastive-tab-content">
                <ContrastiveSearch
                  apiBaseUrl={apiBaseUrl}
                  modelInfo={modelInfo}
                  onVectorGenerated={loadSteeringVectors}
                  onError={showError}
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* Error Modal */}
      <ErrorModal 
        error={currentError} 
        onClose={() => setCurrentError(null)} 
      />
    </div>
  );
}

export default App;

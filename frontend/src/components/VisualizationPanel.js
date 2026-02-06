import React, { useState } from 'react';
import './VisualizationPanel.css';
import SteeringRadarChart from './SteeringRadarChart';

function VisualizationPanel({ generationResult, steeringConfigs, onCoefficientChange }) {
  const [selectedAlignment, setSelectedAlignment] = useState(null);
  const [lawChaosVector, setLawChaosVector] = useState('');
  const [goodEvilVector, setGoodEvilVector] = useState('');

  const alignments = [
    { id: 'lawful-good', row: 0, col: 0, label: 'Lawful Good' },
    { id: 'neutral-good', row: 0, col: 1, label: 'Neutral Good' },
    { id: 'chaotic-good', row: 0, col: 2, label: 'Chaotic Good' },
    { id: 'lawful-neutral', row: 1, col: 0, label: 'Lawful Neutral' },
    { id: 'true-neutral', row: 1, col: 1, label: 'True Neutral' },
    { id: 'chaotic-neutral', row: 1, col: 2, label: 'Chaotic Neutral' },
    { id: 'lawful-evil', row: 2, col: 0, label: 'Lawful Evil' },
    { id: 'neutral-evil', row: 2, col: 1, label: 'Neutral Evil' },
    { id: 'chaotic-evil', row: 2, col: 2, label: 'Chaotic Evil' },
  ];

  // Get available vector names from steeringConfigs, filtered by category
  const emotionVectors = steeringConfigs.filter(v => v.enabled && v.category === 'emotion');
  const alignmentVectors = steeringConfigs.filter(v => v.enabled && v.category === 'alignment').map(v => v.vector_name);
  const extraVectors = steeringConfigs.filter(v => v.enabled && v.category === 'extra');

  // Debug logging
  console.log('VisualizationPanel - steeringConfigs:', steeringConfigs);
  console.log('VisualizationPanel - emotionVectors:', emotionVectors);
  console.log('VisualizationPanel - alignmentVectors:', alignmentVectors);
  console.log('VisualizationPanel - extraVectors:', extraVectors);

  // Apply alignment-based coefficients to selected vectors
  const applyAlignmentCoefficients = (alignmentId) => {
    if (!lawChaosVector || !goodEvilVector) {
      alert('⚠️ Please select both Law/Chaos and Good/Evil vectors first!');
      return;
    }

    const alignment = alignments.find(a => a.id === alignmentId);
    if (!alignment) return;

    // Find the config IDs for the selected vector names
    const lawChaosConfig = steeringConfigs.find(c => c.vector_name === lawChaosVector);
    const goodEvilConfig = steeringConfigs.find(c => c.vector_name === goodEvilVector);

    if (!lawChaosConfig || !goodEvilConfig) {
      alert('⚠️ Selected vectors not found in configurations!');
      return;
    }

    // Calculate coefficients based on grid position
    // X-axis (Law vs Chaos): col 0 = +5 (Lawful), col 1 = 0 (Neutral), col 2 = -5 (Chaotic)
    const lawChaosCoefficient = (1 - alignment.col) * 5;
    
    // Y-axis (Good vs Evil): row 0 = +5 (Good), row 1 = 0 (Neutral), row 2 = -5 (Evil)
    const goodEvilCoefficient = (1 - alignment.row) * 5;

    // Apply coefficients using config IDs
    onCoefficientChange(lawChaosConfig.id, lawChaosCoefficient);
    onCoefficientChange(goodEvilConfig.id, goodEvilCoefficient);

    console.log(`Applied alignment: ${alignment.label}`);
    console.log(`${lawChaosVector}: ${lawChaosCoefficient}`);
    console.log(`${goodEvilVector}: ${goodEvilCoefficient}`);
  };

  // Handle alignment selection
  const handleAlignmentClick = (alignmentId) => {
    if (selectedAlignment === alignmentId) {
      // Deselect: reset coefficients to 0
      const lawChaosConfig = steeringConfigs.find(c => c.vector_name === lawChaosVector);
      const goodEvilConfig = steeringConfigs.find(c => c.vector_name === goodEvilVector);
      
      if (lawChaosConfig) onCoefficientChange(lawChaosConfig.id, 0);
      if (goodEvilConfig) onCoefficientChange(goodEvilConfig.id, 0);
      setSelectedAlignment(null);
    } else {
      // Select: apply alignment coefficients
      setSelectedAlignment(alignmentId);
      applyAlignmentCoefficients(alignmentId);
    }
  };

  return (
    <div className="visualization-panel">
      <h2>📊 Generation Results</h2>

      <div className="viz-content">
        {/* Output Text Section */}
        <div className="output-section">
          <h3>📝 Generated Text</h3>
          <div className="output-text-display">
            {generationResult.generated_text}
          </div>
        </div>

        {/* Steering Radar Chart Section - Only Emotion Vectors */}
        <div className="steering-section">
          <h3>🎯 Emotion Steering Vectors</h3>
          <SteeringRadarChart
            steeringConfigs={emotionVectors}
            onCoefficientChange={onCoefficientChange}
          />
        </div>

        {/* Alignment Chart Section - Only Alignment Vectors */}
        <div className="alignment-section">
          <h3>⚖️ Moral Alignment</h3>
          
          {/* Axis Selectors */}
          <div className="alignment-axis-selectors">
            <div className="axis-selector horizontal">
              <label>📐 Law vs Chaos (X-axis):</label>
              <select 
                value={lawChaosVector} 
                onChange={(e) => setLawChaosVector(e.target.value)}
                className="axis-select"
              >
                <option value="">-- Select Vector --</option>
                {alignmentVectors.map(vectorName => (
                  <option key={vectorName} value={vectorName}>
                    {vectorName}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="axis-selector vertical">
              <label>📏 Good vs Evil (Y-axis):</label>
              <select 
                value={goodEvilVector} 
                onChange={(e) => setGoodEvilVector(e.target.value)}
                className="axis-select"
              >
                <option value="">-- Select Vector --</option>
                {alignmentVectors.map(vectorName => (
                  <option key={vectorName} value={vectorName}>
                    {vectorName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="alignment-chart">
            <div className="alignment-grid">
              {alignments.map((alignment) => (
                <button
                  key={alignment.id}
                  className={`alignment-cell ${selectedAlignment === alignment.id ? 'selected' : ''}`}
                  onClick={() => handleAlignmentClick(alignment.id)}
                  style={{
                    gridRow: alignment.row + 1,
                    gridColumn: alignment.col + 1
                  }}
                >
                  <span className="alignment-label">{alignment.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Extra Vectors Section - Sliders */}
        {extraVectors.length > 0 && (
          <div className="extra-vectors-section">
            <h3>⚙️ Extra Steering Vectors</h3>
            <div className="extra-vectors-controls">
              {extraVectors.map((vector) => (
                <div key={vector.id} className="extra-vector-control">
                  <label className="extra-vector-label">
                    {vector.vector_name}
                    <span className="coefficient-value">{vector.coefficient.toFixed(1)}</span>
                  </label>
                  <input
                    type="range"
                    min="-5"
                    max="5"
                    step="0.1"
                    value={vector.coefficient}
                    onChange={(e) => onCoefficientChange(vector.id, parseFloat(e.target.value))}
                    className="extra-vector-slider"
                  />
                  <div className="slider-labels">
                    <span>-5</span>
                    <span>0</span>
                    <span>+5</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default VisualizationPanel;

import React, { useState, useRef, useEffect } from 'react';
import './SteeringRadarChart.css';

function SteeringRadarChart({ steeringConfigs, onCoefficientChange }) {
  const canvasRef = useRef(null);
  const [draggingIndex, setDraggingIndex] = useState(null);
  const [hoveredIndex, setHoveredIndex] = useState(null);

  const centerX = 250;
  const centerY = 250;
  const maxRadius = 200;
  const minValue = -10;
  const maxValue = 10;

  useEffect(() => {
    drawRadarChart();
  }, [steeringConfigs, hoveredIndex]);

  const valueToRadius = (value) => {
    // Map value from [-10, 10] to [0, maxRadius]
    const normalized = (value - minValue) / (maxValue - minValue);
    return normalized * maxRadius;
  };

  const radiusToValue = (radius) => {
    // Map radius from [0, maxRadius] to [-10, 10]
    const normalized = radius / maxRadius;
    return minValue + normalized * (maxValue - minValue);
  };

  const getPointPosition = (index, coefficient) => {
    const numVectors = steeringConfigs.length;
    if (numVectors === 0) return { x: centerX, y: centerY };

    const angle = (index / numVectors) * 2 * Math.PI - Math.PI / 2; // Start from top
    const radius = valueToRadius(coefficient);
    
    return {
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle)
    };
  };

  const drawRadarChart = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const numVectors = steeringConfigs.length;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (numVectors === 0) {
      // Draw empty state
      ctx.fillStyle = '#9ca3af';
      ctx.font = '16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('No steering vectors loaded', centerX, centerY);
      return;
    }

    // Draw concentric circles for scale
    const circles = [0.25, 0.5, 0.75, 1.0];
    circles.forEach((scale) => {
      ctx.beginPath();
      ctx.arc(centerX, centerY, maxRadius * scale, 0, 2 * Math.PI);
      ctx.strokeStyle = scale === 0.5 ? '#667eea' : '#374151'; // Highlight 0 line
      ctx.lineWidth = scale === 0.5 ? 2 : 1;
      ctx.stroke();
    });

    // Draw axes
    for (let i = 0; i < numVectors; i++) {
      const angle = (i / numVectors) * 2 * Math.PI - Math.PI / 2;
      const endX = centerX + maxRadius * Math.cos(angle);
      const endY = centerY + maxRadius * Math.sin(angle);

      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(endX, endY);
      ctx.strokeStyle = '#374151';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Draw labels
      const labelRadius = maxRadius + 30;
      const labelX = centerX + labelRadius * Math.cos(angle);
      const labelY = centerY + labelRadius * Math.sin(angle);
      
      ctx.fillStyle = hoveredIndex === i ? '#667eea' : '#c4b5fd';
      ctx.font = hoveredIndex === i ? 'bold 14px sans-serif' : '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(steeringConfigs[i].vector_name, labelX, labelY);
    }

    // Draw scale labels
    const scaleValues = [-10, -5, 0, 5, 10];
    scaleValues.forEach((value) => {
      const radius = valueToRadius(value);
      ctx.fillStyle = value === 0 ? '#667eea' : '#6b7280';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(value.toString(), centerX + radius + 15, centerY - 5);
    });

    // Draw polygon connecting all points
    if (numVectors > 0) {
      ctx.beginPath();
      steeringConfigs.forEach((config, i) => {
        const pos = getPointPosition(i, config.coefficient);
        if (i === 0) {
          ctx.moveTo(pos.x, pos.y);
        } else {
          ctx.lineTo(pos.x, pos.y);
        }
      });
      ctx.closePath();
      ctx.fillStyle = 'rgba(102, 126, 234, 0.2)';
      ctx.fill();
      ctx.strokeStyle = '#667eea';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Draw control points
    steeringConfigs.forEach((config, i) => {
      const pos = getPointPosition(i, config.coefficient);
      
      // Draw point
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, hoveredIndex === i || draggingIndex === i ? 10 : 7, 0, 2 * Math.PI);
      ctx.fillStyle = hoveredIndex === i || draggingIndex === i ? '#764ba2' : '#667eea';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw coefficient value
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(config.coefficient.toFixed(1), pos.x, pos.y);
    });
  };

  const handleMouseDown = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Check if clicked on any point
    steeringConfigs.forEach((config, i) => {
      const pos = getPointPosition(i, config.coefficient);
      const distance = Math.sqrt((mouseX - pos.x) ** 2 + (mouseY - pos.y) ** 2);
      
      if (distance <= 10) {
        setDraggingIndex(i);
      }
    });
  };

  const handleMouseMove = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (draggingIndex !== null) {
      // Calculate new coefficient based on mouse position
      const dx = mouseX - centerX;
      const dy = mouseY - centerY;
      const radius = Math.sqrt(dx * dx + dy * dy);
      const newCoefficient = Math.max(minValue, Math.min(maxValue, radiusToValue(radius)));
      
      onCoefficientChange(steeringConfigs[draggingIndex].id, newCoefficient);
    } else {
      // Check if hovering over any point
      let foundHover = null;
      steeringConfigs.forEach((config, i) => {
        const pos = getPointPosition(i, config.coefficient);
        const distance = Math.sqrt((mouseX - pos.x) ** 2 + (mouseY - pos.y) ** 2);
        
        if (distance <= 10) {
          foundHover = i;
        }
      });
      setHoveredIndex(foundHover);
    }
  };

  const handleMouseUp = () => {
    setDraggingIndex(null);
  };

  const handleMouseLeave = () => {
    setDraggingIndex(null);
    setHoveredIndex(null);
  };

  const handleDoubleClick = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Check if double-clicked on any point
    steeringConfigs.forEach((config, i) => {
      const pos = getPointPosition(i, config.coefficient);
      const distance = Math.sqrt((mouseX - pos.x) ** 2 + (mouseY - pos.y) ** 2);
      
      if (distance <= 10) {
        // Reset coefficient to 0
        onCoefficientChange(config.id, 0.0);
      }
    });
  };

  return (
    <div className="steering-radar-chart">
      <div className="radar-header">
        <h3>🎯 Steering Vector Coefficients</h3>
        <p className="radar-description">
          Drag the points to adjust coefficient values (range: -10 to +10). Double-click to reset to 0.
        </p>
      </div>
      
      <div className="radar-container">
        <canvas
          ref={canvasRef}
          width={500}
          height={500}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onDoubleClick={handleDoubleClick}
          style={{ cursor: draggingIndex !== null ? 'grabbing' : hoveredIndex !== null ? 'grab' : 'default' }}
        />
      </div>

      {steeringConfigs.length === 0 && (
        <div className="radar-empty-state">
          <p>⚠️ No steering vectors loaded</p>
          <p className="empty-hint">Add steering vectors in the Generation Settings to visualize them here</p>
        </div>
      )}

      <div className="radar-legend">
        <div className="legend-item">
          <div className="legend-color" style={{ background: '#667eea' }}></div>
          <span>Zero line (neutral)</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ background: '#374151' }}></div>
          <span>Scale lines</span>
        </div>
      </div>
    </div>
  );
}

export default SteeringRadarChart;

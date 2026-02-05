import React, { useState } from 'react';
import './ErrorModal.css';

function ErrorModal({ error, onClose }) {
  const [isStacktraceExpanded, setIsStacktraceExpanded] = useState(false);

  if (!error) return null;

  const copyError = () => {
    const text = `Error: ${error.message}\n\n${error.stacktrace || 'No stacktrace available'}`;
    navigator.clipboard.writeText(text);
    alert('Error copied to clipboard!');
  };

  return (
    <div className="error-modal-overlay" onClick={onClose}>
      <div className="error-modal" onClick={(e) => e.stopPropagation()}>
        <div className="error-modal-header">
          <h3>⚠️ Error</h3>
          <button className="error-modal-close" onClick={onClose}>✕</button>
        </div>
        
        <div className="error-modal-content">
          <div className="error-message">
            <strong>Message:</strong>
            <pre>{error.message}</pre>
          </div>

          {error.stacktrace && (
            <div className="error-stacktrace-section">
              <button 
                className="error-stacktrace-toggle"
                onClick={() => setIsStacktraceExpanded(!isStacktraceExpanded)}
              >
                {isStacktraceExpanded ? '▼' : '▶'} Python Stacktrace
              </button>
              
              {isStacktraceExpanded && (
                <pre className="error-stacktrace">{error.stacktrace}</pre>
              )}
            </div>
          )}
        </div>

        <div className="error-modal-footer">
          <button className="error-modal-copy" onClick={copyError}>
            📋 Copy Error
          </button>
          <button className="error-modal-ok" onClick={onClose}>
            OK
          </button>
        </div>
      </div>
    </div>
  );
}

export default ErrorModal;

import React, { useState } from 'react';

export interface ActionButtonsProps {
  onGuess: (guess: 'real' | 'ai') => void;
  disabled: boolean;
  loading?: boolean;
}

export const ActionButtons: React.FC<ActionButtonsProps> = ({
  onGuess,
  disabled,
  loading = false,
}) => {
  const [pressedButton, setPressedButton] = useState<'real' | 'ai' | null>(null);

  const handleButtonPress = (guess: 'real' | 'ai') => {
    if (disabled || loading) return;
    
    setPressedButton(guess);
    onGuess(guess);
    
    // Clear pressed state after animation
    setTimeout(() => setPressedButton(null), 200);
  };

  const handleKeyDown = (event: React.KeyboardEvent, guess: 'real' | 'ai') => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleButtonPress(guess);
    }
  };

  const getButtonClasses = (buttonType: 'real' | 'ai') => {
    const baseClasses = `
      flex-1 font-bold py-4 px-6 rounded-lg text-lg
      transform transition-all duration-200 
      touch-manipulation focus:outline-none focus:ring-2 focus:ring-offset-2
      min-h-[64px] flex items-center justify-center
      select-none cursor-pointer
    `;

    const colorClasses = buttonType === 'real' 
      ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500 text-white'
      : 'bg-purple-600 hover:bg-purple-700 focus:ring-purple-500 text-white';

    const stateClasses = disabled || loading
      ? 'bg-gray-400 cursor-not-allowed opacity-60'
      : `${colorClasses} hover:scale-105 active:scale-95`;

    const pressedClasses = pressedButton === buttonType
      ? 'scale-95 shadow-inner'
      : '';

    return `${baseClasses} ${stateClasses} ${pressedClasses}`.trim();
  };

  return (
    <div className="flex space-x-4 max-w-md mx-auto">
      <button
        onClick={() => handleButtonPress('real')}
        onKeyDown={(e) => handleKeyDown(e, 'real')}
        disabled={disabled || loading}
        className={getButtonClasses('real')}
        aria-label="Classify as Real Photo"
        role="button"
        tabIndex={disabled ? -1 : 0}
      >
        <div className="flex items-center justify-center space-x-2">
          <span className="text-xl" role="img" aria-label="Camera">📷</span>
          <span>Real Photo</span>
        </div>
      </button>
      
      <button
        onClick={() => handleButtonPress('ai')}
        onKeyDown={(e) => handleKeyDown(e, 'ai')}
        disabled={disabled || loading}
        className={getButtonClasses('ai')}
        aria-label="Classify as AI Generated"
        role="button"
        tabIndex={disabled ? -1 : 0}
      >
        <div className="flex items-center justify-center space-x-2">
          <span className="text-xl" role="img" aria-label="Robot">🤖</span>
          <span>AI Generated</span>
        </div>
      </button>
      
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-50 rounded-lg">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span className="text-sm text-gray-600">Processing...</span>
          </div>
        </div>
      )}
    </div>
  );
};

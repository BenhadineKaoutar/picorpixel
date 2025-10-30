import React from 'react';
import { PersistedGameSession } from '../utils/sessionManager';

interface SessionRecoveryDialogProps {
  persistedSession: PersistedGameSession;
  onRecover: () => void;
  onDiscard: () => void;
  onCancel?: () => void;
}

/**
 * Dialog for handling session recovery
 */
export const SessionRecoveryDialog: React.FC<SessionRecoveryDialogProps> = ({
  persistedSession,
  onRecover,
  onDiscard,
  onCancel,
}) => {
  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  };

  const formatDate = (date: Date) => {
    const today = new Date();
    const sessionDate = new Date(date);
    
    if (sessionDate.toDateString() === today.toDateString()) {
      return 'Today';
    }
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (sessionDate.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    
    return sessionDate.toLocaleDateString();
  };

  const getProgressText = () => {
    const { guesses, score } = persistedSession;
    const totalGuesses = guesses.length;
    
    if (totalGuesses === 0) {
      return 'Game just started';
    }
    
    return `${totalGuesses} image${totalGuesses === 1 ? '' : 's'} completed • ${score}% score`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 animate-in fade-in duration-200">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-4xl mb-3">🔄</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Continue Previous Game?
          </h2>
          <p className="text-gray-600">
            We found a saved game session from earlier
          </p>
        </div>

        {/* Session Details */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-600">Started:</span>
              <span className="text-sm text-gray-900">
                {formatDate(persistedSession.startTime)} at {formatTime(persistedSession.startTime)}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-600">Last played:</span>
              <span className="text-sm text-gray-900">
                {formatDate(persistedSession.lastActivity)} at {formatTime(persistedSession.lastActivity)}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-600">Progress:</span>
              <span className="text-sm text-gray-900">
                {getProgressText()}
              </span>
            </div>
          </div>
        </div>

        {/* Progress Indicator */}
        {persistedSession.guesses.length > 0 && (
          <div className="mb-6">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Progress</span>
              <span>{persistedSession.guesses.length} images</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ 
                  width: `${Math.min((persistedSession.guesses.length / 10) * 100, 100)}%` 
                }}
              />
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={onRecover}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700
                       text-white font-bold py-3 px-6 rounded-lg
                       transform transition-all duration-200 hover:scale-105 active:scale-95
                       shadow-lg hover:shadow-xl"
          >
            🎮 Continue Game
          </button>
          
          <button
            onClick={onDiscard}
            className="w-full bg-gray-600 hover:bg-gray-700
                       text-white font-bold py-3 px-6 rounded-lg
                       transform transition-all duration-200 hover:scale-105 active:scale-95"
          >
            🗑️ Start Fresh
          </button>
          
          {onCancel && (
            <button
              onClick={onCancel}
              className="w-full text-gray-600 hover:text-gray-800 font-medium py-2"
            >
              Cancel
            </button>
          )}
        </div>

        {/* Info Note */}
        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-xs text-blue-700 text-center">
            💡 Your progress is automatically saved as you play
          </p>
        </div>
      </div>
    </div>
  );
};

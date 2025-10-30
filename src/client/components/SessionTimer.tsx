import React from 'react';
import { useTimedGameSessionContext } from '../contexts/TimedGameSessionContext';
import styles from './SessionTimer.module.css';

export interface SessionTimerProps {
  className?: string;
}

export const SessionTimer: React.FC<SessionTimerProps> = ({ className = '' }) => {
  const { timeRemaining, isTimerActive, pauseTimer, resumeTimer, sessionState } = useTimedGameSessionContext();

  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Determine if we should show warning (< 1 minute)
  const isLowTime = timeRemaining < 60;
  const isVeryLowTime = timeRemaining < 30;

  // Don't show timer if session is completed
  if (sessionState === 'completed') {
    return null;
  }

  const timerClasses = [
    styles['session-timer'],
    isLowTime ? styles['session-timer--warning'] : '',
    isVeryLowTime ? styles['session-timer--critical'] : '',
    !isTimerActive ? styles['session-timer--paused'] : '',
    className
  ].filter(Boolean).join(' ');

  const handleTimerClick = () => {
    if (isTimerActive) {
      pauseTimer();
    } else {
      resumeTimer();
    }
  };

  return (
    <div className={timerClasses}>
      <div className={styles['session-timer__display']} onClick={handleTimerClick}>
        <div className={styles['session-timer__icon']}>
          {isTimerActive ? '⏱️' : '⏸️'}
        </div>
        <div className={styles['session-timer__time']}>
          {formatTime(timeRemaining)}
        </div>
        {isLowTime && (
          <div className={styles['session-timer__warning-indicator']}>
            ⚠️
          </div>
        )}
      </div>
      
      {!isTimerActive && sessionState === 'playing' && (
        <div className={styles['session-timer__pause-message']}>
          Timer Paused - Click to Resume
        </div>
      )}
      
      {isLowTime && isTimerActive && (
        <div className={styles['session-timer__warning-text']}>
          {isVeryLowTime ? 'Time almost up!' : 'Less than 1 minute remaining'}
        </div>
      )}
    </div>
  );
};

export default SessionTimer;

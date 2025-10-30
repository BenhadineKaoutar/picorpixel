import React, { createContext, useContext, ReactNode } from 'react';
import { useTimedGameSession, TimedGameSessionHookState, TimedGameSessionActions } from '../hooks/useTimedGameSession';

type TimedGameSessionContextType = TimedGameSessionHookState & TimedGameSessionActions;

const TimedGameSessionContext = createContext<TimedGameSessionContextType | null>(null);

export interface TimedGameSessionProviderProps {
  children: ReactNode;
}

export const TimedGameSessionProvider: React.FC<TimedGameSessionProviderProps> = ({ children }) => {
  const sessionState = useTimedGameSession();

  return (
    <TimedGameSessionContext.Provider value={sessionState}>
      {children}
    </TimedGameSessionContext.Provider>
  );
};

export const useTimedGameSessionContext = (): TimedGameSessionContextType => {
  const context = useContext(TimedGameSessionContext);
  if (!context) {
    throw new Error('useTimedGameSessionContext must be used within a TimedGameSessionProvider');
  }
  return context;
};

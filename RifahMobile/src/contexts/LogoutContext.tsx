import React, { createContext, useContext } from 'react';

export type LogoutContextType = { onLogout: () => void };

export const LogoutContext = createContext<LogoutContextType | null>(null);

export function useLogout(): LogoutContextType | null {
  return useContext(LogoutContext);
}

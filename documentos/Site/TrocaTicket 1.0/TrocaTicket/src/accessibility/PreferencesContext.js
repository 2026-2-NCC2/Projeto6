import { createContext, useContext } from 'react';
export const PreferencesContext = createContext(null);
export const usePreferences = () => useContext(PreferencesContext);

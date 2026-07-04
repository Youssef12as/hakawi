import { createContext, useContext, useState } from 'react';

const AppContext = createContext();

export function AppProvider({ children }) {
  const [activeRegion, setActiveRegion] = useState(null);
  const [consentGiven, setConsentGiven] = useState(false);
  const [language, setLanguage] = useState('ar');

  return (
    <AppContext.Provider value={{
      activeRegion, setActiveRegion,
      consentGiven, setConsentGiven,
      language, setLanguage,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
}

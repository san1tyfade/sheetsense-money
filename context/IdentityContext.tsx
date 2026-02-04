import React, { createContext, useContext, useCallback } from 'react';
import { UserProfile, SheetConfig } from '../types';
import { useIndexedDB } from '../hooks/useIndexedDB';
import { signOut as googleSignOut } from '../services/authService';

interface IdentityContextType {
  userProfile: UserProfile | null;
  setUserProfile: (p: UserProfile | null) => void;
  authSession: { token: string, expires: number } | null;
  setAuthSession: (s: { token: string, expires: number } | null) => void;
  sheetConfig: SheetConfig;
  setSheetConfig: (c: SheetConfig) => void;
  sheetUrl: string;
  setSheetUrl: (u: string) => void;
  signOut: () => void;
}

const IdentityContext = createContext<IdentityContextType | undefined>(undefined);

export const IdentityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userProfile, setUserProfile] = useIndexedDB<UserProfile | null>('fintrack_user_profile', null);
  const [authSession, setAuthSession] = useIndexedDB<{token: string, expires: number} | null>('fintrack_auth_session', null);
  const [sheetConfig, setSheetConfig] = useIndexedDB<SheetConfig>('fintrack_sheet_config', {
    sheetId: '',
    clientId: '953749430238-3d0q078koppal8i2qs92ctfe5dbon994.apps.googleusercontent.com',
    tabNames: { assets: 'Assets', investments: 'Investments', trades: 'Trades', subscriptions: 'Subscriptions', accounts: 'Institutions', logData: 'logdata', portfolioLog: 'portfoliolog', debt: 'debt', income: 'Income', expenses: 'Expenses', journal: 'journal' }
  });
  const [sheetUrl, setSheetUrl] = useIndexedDB<string>('fintrack_sheet_url', '');

  const signOut = useCallback(() => {
    googleSignOut();
    setAuthSession(null);
    setUserProfile(null);
  }, [setAuthSession, setUserProfile]);

  return (
    <IdentityContext.Provider value={{ userProfile, setUserProfile, authSession, setAuthSession, sheetConfig, setSheetConfig, sheetUrl, setSheetUrl, signOut }}>
      {children}
    </IdentityContext.Provider>
  );
};

export const useIdentity = () => {
  const context = useContext(IdentityContext);
  if (!context) throw new Error('useIdentity must be used within IdentityProvider');
  return context;
};

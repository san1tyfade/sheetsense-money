import { UserProfile } from '../types';
import { googleClient } from './infrastructure/GoogleClient';
import { AppError, IEP } from './infrastructure/ErrorHandler';

declare global {
  interface Window {
    gapi?: any;
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: any) => any;
          revoke: (accessToken: string, done: () => void) => void;
        };
      };
      picker?: any;
    };
  }
}

let tokenClient: any = null;
let accessToken: string | null = null;
let tokenExpiration: number = 0;
let currentClientId: string | null = null;

let resolveQueue: Array<{ resolve: (token: string) => void }> = [];

const SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/userinfo.profile'
].join(' ');

export const restoreSession = (token: string, expiration: number) => {
  if (token && expiration && Date.now() < (expiration - 300000)) {
    accessToken = token;
    tokenExpiration = expiration;
    return true;
  }
  return false;
};

export const initGoogleAuth = (clientId: string) => {
  if (!window.google) {
    return false;
  }
  if (tokenClient && currentClientId === clientId) return true;

  try {
    tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPES,
      callback: (response: any) => {
        if (!response.error) {
          accessToken = response.access_token;
          tokenExpiration = Date.now() + (response.expires_in * 1000);
          resolveQueue.forEach(q => q.resolve(accessToken!));
        }
        resolveQueue = [];
      }
    });
    currentClientId = clientId;
    return true;
  } catch (e) {
    return false;
  }
};

export const signIn = async (forceConsent = false): Promise<{ token: string, expires: number }> => {
  if (accessToken && Date.now() < (tokenExpiration - 300000)) return { token: accessToken, expires: tokenExpiration };

  return new Promise((resolve, reject) => {
    if (!tokenClient) {
      return reject(new AppError(IEP.AUTH.GSI_MISSING, "Google Identity Library not initialized.", 'CRITICAL'));
    }
    resolveQueue.push({ resolve: (t) => resolve({ token: t, expires: tokenExpiration }) });
    tokenClient.requestAccessToken(forceConsent ? { prompt: 'consent' } : {});
  });
};

export const getAccessToken = () => (accessToken && Date.now() < (tokenExpiration - 60000)) ? accessToken : null;

export const signOut = () => {
  if (accessToken) window.google?.accounts?.oauth2.revoke(accessToken, () => { });
  accessToken = null;
  tokenExpiration = 0;
};

export const fetchUserProfile = async (token: string): Promise<UserProfile | null> => {
  try {
    const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new AppError(IEP.AUTH.PROFILE_FAIL, "Identity Handshake Failure.");
    return res.json();
  } catch (e) {
    return null;
  }
};

/**
 * Phase 1: Identity & Authentication Orchestration
 */
export const performFullSignIn = async (clientId: string): Promise<{ session: { token: string, expires: number }, profile: UserProfile }> => {
  const initialized = initGoogleAuth(clientId);
  if (!initialized) throw new AppError(IEP.AUTH.GSI_MISSING, "GSI infrastructure missing.", 'CRITICAL');

  const session = await signIn(true);
  const profile = await fetchUserProfile(session.token);

  if (!profile) {
    throw new AppError(IEP.AUTH.PROFILE_FAIL, "Failed to capture user identity profile.");
  }

  return { session, profile };
};

/**
 * Attempt to copy the master template. 
 */
const copyMasterTemplate = async (templateId: string, fileName: string) => {
  return googleClient.request(`https://www.googleapis.com/drive/v3/files/${templateId}/copy`, {
    method: 'POST',
    body: { name: fileName }
  }).then(data => ({
    id: data.id,
    url: `https://docs.google.com/spreadsheets/d/${data.id}/edit`
  }));
};

/**
 * Phase 2: Source Inception & Cloning Logic
 */
export const setupTemplateDataSource = async (masterId: string, prefix: string): Promise<{ id: string, url: string }> => {
  const dateStr = new Date().toLocaleDateString('en-CA', { month: 'short', day: 'numeric' });
  const fileName = `${prefix} - ${dateStr}`;
  return await copyMasterTemplate(masterId, fileName);
};
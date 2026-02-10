
import { getAccessToken } from './authService';

// --- Google Picker API Implementation ---

declare global {
  interface Window {
    // Harmonized Window interface declaration to resolve TypeScript modifier and type conflicts
    gapi?: any;
    // Harmonized google property declaration to match authService.ts exactly
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

interface PickerResult {
  id: string;
  name: string;
  url: string;
}

let isGapiLoading = false;

/**
 * Opens the Google Picker dialog to allow the user to select a spreadsheet.
 * Strictly uses OAuth Token and App ID without an API Developer Key.
 */
export const openPicker = async (clientId?: string): Promise<PickerResult | null> => {
  const token = getAccessToken();

  if (!token) {
    throw new Error("AUTH_EXPIRED: Authentication session expired. Please sign in again.");
  }

  return new Promise((resolve, reject) => {
    const showPicker = () => {
      try {
        const google = window.google;
        if (!google || !google.picker) {
          throw new Error("PICKER_UNINITIALIZED: Google Picker module not ready.");
        }

        const view = new google.picker.View(google.picker.ViewId.SPREADSHEETS);

        // Use a strictly formatted origin string (no trailing slash, explicit protocol)
        const origin = window.location.protocol + '//' + window.location.host;

        const builder = new google.picker.PickerBuilder()
          .addView(view)
          .setOAuthToken(token)
          .setOrigin(origin);

        // Use App ID derived from the Client ID (usually the numerical prefix)
        // This acts as the project identifier in lieu of an API Key
        if (clientId) {
          const appId = clientId.split('-')[0];
          builder.setAppId(appId);
        }

        builder.setCallback((data: any) => {
          if (data.action === google.picker.Action.PICKED) {
            const doc = data.docs[0];
            resolve({
              id: doc.id,
              name: doc.name,
              url: doc.url
            });
          } else if (data.action === google.picker.Action.CANCEL) {
            resolve(null);
          }
        });

        const picker = builder.build();
        picker.setVisible(true);
      } catch (err) {
        console.error("Error creating Google Picker:", err);
        reject(err instanceof Error ? err : new Error("Google Picker failed to initialize."));
      }
    };

    const loadPickerModule = () => {
      if (!window.gapi) {
        reject(new Error("GAPI_MISSING: GAPI script not loaded."));
        return;
      }

      window.gapi.load('picker', {
        callback: showPicker,
        onerror: () => reject(new Error("PICKER_LOAD_FAILED: Failed to load Picker library."))
      });
    };

    // If already loaded, show immediately
    if (window.gapi && window.google?.picker) {
      showPicker();
      return;
    }

    // If GAPI is here but picker module isn't, load it
    if (window.gapi) {
      loadPickerModule();
      return;
    }

    // If script is currently being injected, poll for it
    if (isGapiLoading) {
      const poll = setInterval(() => {
        if (window.gapi) {
          clearInterval(poll);
          loadPickerModule();
        }
      }, 100);
      return;
    }

    isGapiLoading = true;

    const script = document.createElement('script');
    script.src = 'https://apis.google.com/js/api.js';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      isGapiLoading = false;
      loadPickerModule();
    };
    script.onerror = () => {
      isGapiLoading = false;
      reject(new Error("GAPI_LOAD_FAILED: Failed to load Google API infrastructure."));
    };
    document.body.appendChild(script);
  });
};

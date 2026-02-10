import { googleClient } from './infrastructure/GoogleClient';

const VAULT_FILENAME = 'sheetsense_vault.json';
const DRIVE_API_URL = 'https://www.googleapis.com/drive/v3/files';
const UPLOAD_API_URL = 'https://www.googleapis.com/upload/drive/v3/files';

interface DriveFile {
  id: string;
  name: string;
  modifiedTime?: string;
}

/**
 * Searches for the Sheetsense vault file in the user's Drive.
 */
export const findVaultFile = async (): Promise<DriveFile | null> => {
  const q = encodeURIComponent(`name = '${VAULT_FILENAME}' and trashed = false`);
  const data = await googleClient.request(`${DRIVE_API_URL}?q=${q}&fields=files(id, name, modifiedTime)`);
  return data.files && data.files.length > 0 ? data.files[0] : null;
};

/**
 * Uploads the vault payload to Google Drive. 
 */
export const uploadVaultFile = async (payload: any, fileId?: string): Promise<string> => {
  const metadata = { name: VAULT_FILENAME, mimeType: 'application/json' };
  const fileContent = JSON.stringify(payload, null, 2);
  const boundary = '-------314159265358979323846';

  const multipartRequestBody =
    `\r\n--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}` +
    `\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n${fileContent}` +
    `\r\n--${boundary}--`;

  const url = fileId ? `${UPLOAD_API_URL}/${fileId}?uploadType=multipart` : `${UPLOAD_API_URL}?uploadType=multipart`;

  const data = await googleClient.request(url, {
    method: fileId ? 'PATCH' : 'POST',
    headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
    body: multipartRequestBody
  });

  return data.id;
};

/**
 * Downloads the content of the vault file from Google Drive.
 */
export const downloadVaultFile = async (fileId: string): Promise<string> => {
  return googleClient.request(`${DRIVE_API_URL}/${fileId}?alt=media`, {
    responseType: 'text'
  });
};
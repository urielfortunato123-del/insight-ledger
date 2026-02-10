// Google Drive backup integration using Google Identity Services (GIS)

const CLIENT_ID = '431342558610-bk4vqetosc2pfk09eofqdc14a02h5ibj.apps.googleusercontent.com';
const SCOPES = 'https://www.googleapis.com/auth/drive.file';

let tokenClient: google.accounts.oauth2.TokenClient | null = null;
let accessToken: string | null = null;

// Load the GIS script dynamically
function loadGisScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.getElementById('gis-script')) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.id = 'gis-script';
    script.src = 'https://accounts.google.com/gsi/client';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Falha ao carregar Google Identity Services'));
    document.head.appendChild(script);
  });
}

declare global {
  interface Window {
    google?: typeof google;
  }
}

declare namespace google.accounts.oauth2 {
  interface TokenClient {
    requestAccessToken: (opts?: { prompt?: string }) => void;
    callback: (response: TokenResponse) => void;
  }
  interface TokenResponse {
    access_token: string;
    error?: string;
  }
  function initTokenClient(config: {
    client_id: string;
    scope: string;
    callback: (response: TokenResponse) => void;
  }): TokenClient;
}

async function getAccessToken(): Promise<string> {
  await loadGisScript();

  return new Promise((resolve, reject) => {
    if (accessToken) {
      resolve(accessToken);
      return;
    }

    tokenClient = window.google!.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      callback: (response) => {
        if (response.error) {
          reject(new Error(response.error));
          return;
        }
        accessToken = response.access_token;
        resolve(response.access_token);
      },
    });

    tokenClient.requestAccessToken({ prompt: 'consent' });
  });
}

async function findOrCreateFolder(token: string, folderName: string): Promise<string> {
  // Search for existing folder
  const searchRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false&fields=files(id,name)`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const searchData = await searchRes.json();

  if (searchData.files?.length > 0) {
    return searchData.files[0].id;
  }

  // Create folder
  const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
    }),
  });
  const folder = await createRes.json();
  return folder.id;
}

export async function backupToGoogleDrive(data: Record<string, unknown>): Promise<{ fileName: string }> {
  const token = await getAccessToken();
  const folderId = await findOrCreateFolder(token, 'ContabIA Backups');

  const fileName = `contabia_backup_${new Date().toISOString().slice(0, 10)}.json`;
  const jsonStr = JSON.stringify(data, null, 2);

  // Check if file already exists today (to update instead of duplicate)
  const searchRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=name='${fileName}' and '${folderId}' in parents and trashed=false&fields=files(id)`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const searchData = await searchRes.json();

  const metadata = {
    name: fileName,
    mimeType: 'application/json',
    ...(searchData.files?.length ? {} : { parents: [folderId] }),
  };

  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', new Blob([jsonStr], { type: 'application/json' }));

  let url = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
  let method = 'POST';

  if (searchData.files?.length > 0) {
    url = `https://www.googleapis.com/upload/drive/v3/files/${searchData.files[0].id}?uploadType=multipart`;
    method = 'PATCH';
  }

  const res = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Erro no Google Drive: ${err}`);
  }

  return { fileName };
}

export async function restoreFromGoogleDrive(): Promise<{ data: Record<string, unknown>; fileName: string } | null> {
  const token = await getAccessToken();
  const folderId = await findOrCreateFolder(token, 'ContabIA Backups');

  // List backup files sorted by modified time
  const listRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q='${folderId}' in parents and trashed=false&orderBy=modifiedTime desc&fields=files(id,name,modifiedTime)&pageSize=10`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const listData = await listRes.json();

  if (!listData.files?.length) {
    return null;
  }

  const latestFile = listData.files[0];

  // Download file content
  const downloadRes = await fetch(
    `https://www.googleapis.com/drive/v3/files/${latestFile.id}?alt=media`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const data = await downloadRes.json();

  return { data, fileName: latestFile.name };
}

export function clearGoogleDriveToken() {
  accessToken = null;
}

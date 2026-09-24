const backupFileName = 'secret-keeper-vault.json'
const driveFilesUrl = 'https://www.googleapis.com/drive/v3/files'
const driveUploadUrl = 'https://www.googleapis.com/upload/drive/v3/files'

type DriveFile = {
  id: string
}

async function driveRequest(url: string, token: string, init: RequestInit = {}) {
  const response = await fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...(init.headers || {}) },
  })
  if (!response.ok) throw new Error(`Google Drive request failed (${response.status}).`)
  return response
}

async function findBackup(token: string) {
  const query = encodeURIComponent(`name = '${backupFileName}' and trashed = false`)
  const response = await driveRequest(`${driveFilesUrl}?spaces=appDataFolder&q=${query}&fields=files(id)`, token)
  const result = await response.json() as { files?: DriveFile[] }
  return result.files?.[0]
}

export async function backupVaultToDrive(token: string, encryptedVault: string) {
  const existingFile = await findBackup(token)
  const metadata = existingFile
    ? { name: backupFileName }
    : { name: backupFileName, parents: ['appDataFolder'] }
  const boundary = `secret-keeper-${crypto.randomUUID()}`
  const body = [
    `--${boundary}`, 'Content-Type: application/json; charset=UTF-8', '', JSON.stringify(metadata),
    `--${boundary}`, 'Content-Type: application/json', '', encryptedVault,
    `--${boundary}--`, '',
  ].join('\r\n')
  const url = existingFile
    ? `${driveUploadUrl}/${existingFile.id}?uploadType=multipart`
    : `${driveUploadUrl}?uploadType=multipart`
  await driveRequest(url, token, {
    method: existingFile ? 'PATCH' : 'POST',
    headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
    body,
  })
}

export async function downloadVaultFromDrive(token: string) {
  const backup = await findBackup(token)
  if (!backup) throw new Error('No Secret Keeper backup was found in this Google Drive.')
  const response = await driveRequest(`${driveFilesUrl}/${backup.id}?alt=media`, token)
  return response.text()
}
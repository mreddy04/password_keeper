export type GoogleAccount = {
  id: string
  email: string
  name: string
  picture?: string
  credential: string
}

export type GoogleTokenClient = {
  requestAccessToken: () => void
}

export type GoogleIdentityServices = {
  accounts: {
    id: {
      initialize: (options: { client_id: string; callback: (response: { credential: string }) => void }) => void
      renderButton: (element: HTMLElement, options: Record<string, string | number>) => void
    }
    oauth2: {
      initTokenClient: (options: {
        client_id: string
        scope: string
        callback: (response: { access_token?: string; error?: string }) => void
      }) => GoogleTokenClient
    }
  }
}

export type GoogleSignInPort = {
  signIn: () => Promise<GoogleAccount>
}

export const googleSignInConfig = {
  clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '',
}

export const googleDriveScope = 'https://www.googleapis.com/auth/drive.appdata'

export function requestGoogleDriveToken() {
  return new Promise<string>((resolve, reject) => {
    const google = window.google
    if (!google) {
      reject(new Error('Google services are not loaded.'))
      return
    }

    const tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: googleSignInConfig.clientId,
      scope: googleDriveScope,
      callback: (response) => {
        if (response.access_token) resolve(response.access_token)
        else reject(new Error(response.error || 'Google Drive access was not granted.'))
      },
    })
    tokenClient.requestAccessToken()
  })
}

declare global {
  interface Window {
    google?: GoogleIdentityServices
  }
}

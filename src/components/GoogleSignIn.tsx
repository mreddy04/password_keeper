import { useEffect, useRef, useState } from 'react'
import { googleSignInConfig, type GoogleAccount } from '../auth/google'

type GoogleSignInProps = {
  onSignedIn: (account: GoogleAccount) => void
}

function readGoogleAccount(credential: string): GoogleAccount {
  const payload = credential.split('.')[1]
  const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))) as {
    sub: string
    email: string
    name: string
    picture?: string
  }

  return { id: decoded.sub, email: decoded.email, name: decoded.name, picture: decoded.picture, credential }
}

function GoogleSignIn({ onSignedIn }: GoogleSignInProps) {
  const isConfigured = Boolean(googleSignInConfig.clientId)
  const buttonContainer = useRef<HTMLDivElement>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isConfigured || !buttonContainer.current) return

    const renderGoogleButton = () => {
      if (!window.google || !buttonContainer.current) return

      window.google.accounts.id.initialize({
        client_id: googleSignInConfig.clientId,
        callback: (response) => {
          try {
            onSignedIn(readGoogleAccount(response.credential))
          } catch {
            setError('Google returned an invalid sign-in response.')
          }
        },
      })
      buttonContainer.current.replaceChildren()
      window.google.accounts.id.renderButton(buttonContainer.current, { theme: 'outline', size: 'large', width: 340 })
    }

    const existingScript = document.querySelector('script[src="https://accounts.google.com/gsi/client"]')
    if (existingScript) {
      renderGoogleButton()
      return
    }

    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.onload = renderGoogleButton
    script.onerror = () => setError('Google sign-in could not be loaded.')
    document.head.appendChild(script)
  }, [isConfigured, onSignedIn])

  return (
    <main className="account-screen">
      <section className="account-panel">
        <p className="eyebrow">SECRET KEEPER</p>
        <h1>Sign in to continue</h1>
        <p className="muted">Use Google to access your account. Your vault password still protects your private records.</p>
        {isConfigured ? <div className="google-button-container" ref={buttonContainer} /> : (
          <button className="google-button" type="button" disabled>
            <span className="google-mark">G</span>
            Google sign-in not configured
          </button>
        )}
        {!isConfigured && <p className="setup-hint">Add a Google OAuth client ID before enabling real sign-in.</p>}
        {error && <p className="form-error" role="alert">{error}</p>}
      </section>
    </main>
  )
}

export default GoogleSignIn

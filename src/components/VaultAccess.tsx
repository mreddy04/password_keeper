import { useState, type FormEvent } from 'react'

type VaultAccessProps = {
  setup: boolean
  onUnlock: (password: string, recoveryKey?: string) => Promise<string | undefined>
}

function VaultAccess({ setup, onUnlock }: VaultAccessProps) {
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [useRecoveryKey, setUseRecoveryKey] = useState(false)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')

    if (!useRecoveryKey && password.length < 8) {
      setError('Use at least 8 characters.')
      return
    }

    if (setup && password !== confirmation) {
      setError('The passwords do not match.')
      return
    }

    setBusy(true)
    try {
      await onUnlock(useRecoveryKey ? '' : password, useRecoveryKey ? password : undefined)
    } catch {
      setError('The password is not correct.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="locked-screen">
      <form className="locked-panel access-form" onSubmit={submit}>
        <p className="eyebrow">SECRET KEEPER</p>
        <h1>{setup ? 'Create your vault' : 'Unlock your vault'}</h1>
        <p className="muted">{setup ? 'Choose a master password to protect your records.' : useRecoveryKey ? 'Enter your recovery key to continue.' : 'Enter your master password to continue.'}</p>
        <label className="form-field">
          <span>{useRecoveryKey ? 'Recovery key' : 'Master password'}</span>
          <input type={useRecoveryKey ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} autoFocus />
        </label>
        {setup && !useRecoveryKey && (
          <label className="form-field">
            <span>Confirm password</span>
            <input type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} />
          </label>
        )}
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="primary-button" type="submit" disabled={busy}>
          {busy ? 'Checking...' : setup ? 'Create vault' : 'Unlock vault'}
        </button>
        {!setup && (
          <button className="text-button access-switch" type="button" onClick={() => { setUseRecoveryKey(!useRecoveryKey); setPassword(''); setError('') }}>
            {useRecoveryKey ? 'Use master password' : 'Use recovery key'}
          </button>
        )}
      </form>
    </main>
  )
}

export default VaultAccess

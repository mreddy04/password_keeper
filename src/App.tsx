import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import AddItemMenu from './components/AddItemMenu'
import ItemDetails from './components/ItemDetails'
import ItemList from './components/ItemList'
import Sidebar from './components/Sidebar'
import VaultAccess from './components/VaultAccess'
import GoogleSignIn from './components/GoogleSignIn'
import { itemTypes, vaultItems } from './data/vaultItems'
import { createVault, getEncryptedVault, hasStoredVault, loadVault, saveVault, setEncryptedVault } from './storage/encryptedVault'
import { backupVaultToDrive, downloadVaultFromDrive } from './storage/googleDriveVault'
import { requestGoogleDriveToken, type GoogleAccount } from './auth/google'
import type { CustomField, VaultItem, VaultItemType } from './types/vault'

type ImportConflict = {
  current: VaultItem
  imported: VaultItem
}

function App() {
  const [items, setItems] = useState(vaultItems)
  const [activeType, setActiveType] = useState<'All items' | VaultItemType>('All items')
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState(1)
  const [showPassword, setShowPassword] = useState(false)
  const [showAddMenu, setShowAddMenu] = useState(false)
  const [showItemForm, setShowItemForm] = useState(false)
  const [vaultPassword, setVaultPassword] = useState('')
  const [accountReady, setAccountReady] = useState(false)
  const [googleAccount, setGoogleAccount] = useState<GoogleAccount | null>(null)
  const [recoveryKeyNotice, setRecoveryKeyNotice] = useState('')
  const [accessReady, setAccessReady] = useState(false)
  const [needsSetup, setNeedsSetup] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [draftType, setDraftType] = useState<VaultItem['type']>('Password')
  const [draftTitle, setDraftTitle] = useState('')
  const [draftFields, setDraftFields] = useState<Record<string, string>>({})
  const [draftCustomFields, setDraftCustomFields] = useState<CustomField[]>([])
  const [driveStatus, setDriveStatus] = useState('')
  const [fileStatus, setFileStatus] = useState('')
  const [importReview, setImportReview] = useState<{ items: VaultItem[]; conflicts: ImportConflict[]; index: number } | null>(null)
  const importInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setNeedsSetup(!hasStoredVault())
    setAccessReady(true)
  }, [])

  const unlockVault = async (password: string, recoveryKey?: string) => {
    let storedItems: VaultItem[]
    let generatedRecoveryKey = ''

    if (needsSetup) {
      storedItems = vaultItems
      generatedRecoveryKey = await createVault(password, storedItems)
    } else {
      const vaultResult = await loadVault(password, recoveryKey)
      storedItems = vaultResult.items
      generatedRecoveryKey = vaultResult.recoveryKey || ''
    }

    setItems(storedItems)
    setSelectedId(storedItems[0]?.id || 1)
    setVaultPassword(recoveryKey || password)
    setRecoveryKeyNotice(generatedRecoveryKey)
    return generatedRecoveryKey
  }

  const addItem = (type: VaultItem['type']) => {
    setEditingId(null)
    setDraftType(type)
    setDraftTitle('')
    setDraftFields({})
    setDraftCustomFields([])
    setShowItemForm(true)
    setShowAddMenu(false)
  }

  const saveItem = () => {
    const title = draftTitle.trim() || `New ${draftType.toLowerCase()}`
    const itemFields = Object.entries(draftFields)
      .filter(([label, value]) => value.trim() && !['Website', 'Username', 'Password'].includes(label))
      .map(([label, value]) => ({ label, value }))
    const customFields = draftCustomFields
      .filter((field) => field.label.trim() && field.value.trim())
      .map(({ label, value }) => ({ label, value, custom: true }))
    const updatedItem: VaultItem = {
      id: editingId ?? Date.now(),
      type: draftType,
      title,
      subtitle: draftFields.Website || draftFields['Account ID'] || 'New record',
      detail: draftType === 'Note' ? 'Personal note' : `New ${draftType.toLowerCase()} record`,
      username: draftFields.Username,
      password: draftFields.Password,
      fields: [...itemFields, ...customFields],
    }

    const nextItems = editingId === null
      ? [...items, updatedItem]
      : items.map((item) => item.id === editingId ? updatedItem : item)

    setItems(nextItems)
    void saveVault(vaultPassword, nextItems)
    setSelectedId(updatedItem.id)
    setActiveType('All items')
    setShowItemForm(false)
    setEditingId(null)
  }

  const deleteSelectedItem = () => {
    if (!selectedItem) return
    if (!window.confirm(`Delete "${selectedItem.title}"? This cannot be undone.`)) return

    const nextItems = items.filter((item) => item.id !== selectedItem.id)
    setItems(nextItems)
    void saveVault(vaultPassword, nextItems)
    setSelectedId(nextItems[0]?.id || 0)
    setShowPassword(false)
    setFileStatus('Item deleted')
  }

  const copyToClipboard = async (label: string, value: string) => {
    if (!value) {
      setFileStatus(`${label} is empty`)
      return
    }
    try {
      await navigator.clipboard.writeText(value)
      setFileStatus(`${label} copied`)
    } catch {
      setFileStatus('Copy failed. Allow clipboard access and try again.')
    }
  }

  const backupToDrive = async () => {
    if (!googleAccount) return
    setDriveStatus('Backing up...')
    try {
      const token = await requestGoogleDriveToken()
      await backupVaultToDrive(token, getEncryptedVault())
      setDriveStatus('Backed up to Google Drive')
    } catch (error) {
      setDriveStatus(error instanceof Error ? error.message : 'Drive backup failed.')
    }
  }

  const restoreFromDrive = async () => {
    if (!googleAccount) return
    setDriveStatus('Restoring...')
    const previousVault = getEncryptedVault()
    try {
      const token = await requestGoogleDriveToken()
      const downloadedVault = await downloadVaultFromDrive(token)
      setEncryptedVault(downloadedVault)
      const restoredItems = (await loadVault(vaultPassword)).items
      setItems(restoredItems)
      setSelectedId(restoredItems[0]?.id || 1)
      setDriveStatus('Restored from Google Drive')
    } catch (error) {
      setEncryptedVault(previousVault)
      setDriveStatus(error instanceof Error ? error.message : 'Drive restore failed.')
    }
  }

  const exportVault = () => {
    const file = new Blob([getEncryptedVault()], { type: 'application/json' })
    const url = URL.createObjectURL(file)
    const link = document.createElement('a')
    link.href = url
    link.download = 'secret-keeper-vault.encrypted.json'
    link.click()
    URL.revokeObjectURL(url)
    setFileStatus('Encrypted vault exported')
  }

  const copyRecoveryKey = async () => {
    if (!recoveryKeyNotice) return

    try {
      await navigator.clipboard.writeText(recoveryKeyNotice)
      setFileStatus('Recovery key copied')
    } catch {
      setFileStatus('Copy failed. Allow clipboard access and try again.')
    }
  }

  const importVault = async (file: File) => {
    setFileStatus('Importing...')
    const currentVault = getEncryptedVault()
    try {
      const importedVault = await file.text()
      setEncryptedVault(importedVault)
      let importedItems: VaultItem[]
      try {
        importedItems = (await loadVault(vaultPassword)).items
      } catch {
        const importedSecret = window.prompt('Enter the password or recovery key used to protect this imported vault.')
        if (!importedSecret) throw new Error('Import cancelled.')

        try {
          importedItems = (await loadVault(importedSecret)).items
        } catch {
          importedItems = (await loadVault('', importedSecret)).items
        }
      }

      setEncryptedVault(currentVault)
      const replace = window.confirm('Replace your current vault with this encrypted file? Select Cancel to merge it.')

      if (replace) {
        await saveVault(vaultPassword, importedItems)
        setItems(importedItems)
        setSelectedId(importedItems[0]?.id || 1)
        setActiveType('All items')
        setQuery('')
        setFileStatus('Encrypted vault imported')
        return
      }

      const conflicts = importedItems.flatMap((importedItem) => {
        const currentItem = items.find((item) => item.id === importedItem.id)
        return currentItem ? [{ current: currentItem, imported: importedItem }] : []
      })
      const uniqueImported = importedItems.filter((importedItem) => !items.some((item) => item.id === importedItem.id))
      const mergedItems = [...items, ...uniqueImported]

      if (conflicts.length) {
        setImportReview({ items: mergedItems, conflicts, index: 0 })
        setFileStatus('Review imported conflicts')
        return
      }

      await saveVault(vaultPassword, mergedItems)
      setItems(mergedItems)
      setSelectedId(mergedItems[0]?.id || 1)
      setActiveType('All items')
      setQuery('')
      setFileStatus('Encrypted vault merged')
    } catch (error) {
      setEncryptedVault(currentVault)
      setFileStatus(error instanceof Error ? error.message : 'Encrypted vault import failed.')
    }
  }

  const resolveImportConflict = (choice: 'current' | 'imported' | 'both') => {
    if (!importReview) return
    const conflict = importReview.conflicts[importReview.index]
    let nextItems = importReview.items

    if (choice === 'imported') {
      nextItems = nextItems.map((item) => item.id === conflict.current.id ? conflict.imported : item)
    } else if (choice === 'both') {
      nextItems = [...nextItems, { ...conflict.imported, id: Date.now() + nextItems.length }]
    }

    const nextIndex = importReview.index + 1
    if (nextIndex < importReview.conflicts.length) {
      setImportReview({ ...importReview, items: nextItems, index: nextIndex })
      return
    }

    void saveVault(vaultPassword, nextItems)
    setItems(nextItems)
    setSelectedId(nextItems[0]?.id || 1)
    setActiveType('All items')
    setQuery('')
    setImportReview(null)
    setFileStatus('Encrypted vault merged')
  }

  const updateDraftField = (label: string, value: string) => {
    setDraftFields((currentFields) => ({ ...currentFields, [label]: value }))
  }

  const startEditing = () => {
    const item = selectedItem
    const storedFields = item.fields || []
    const itemFields = Object.fromEntries(storedFields.filter((field) => !field.custom).map((field) => [field.label, field.value]))
    setEditingId(item.id)
    setDraftType(item.type)
    setDraftTitle(item.title)
    setDraftFields({
      ...itemFields,
      Website: item.type === 'Password' ? item.subtitle : itemFields.Website || '',
      Username: item.username || itemFields.Username || '',
      Password: item.password || itemFields.Password || '',
    })
    setDraftCustomFields(storedFields
      .filter((field) => field.custom)
      .map((field, index) => ({ id: index, label: field.label, value: field.value })))
    setShowItemForm(true)
  }

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.toLowerCase().trim()

    return items.filter((item) => {
      const matchesType = activeType === 'All items' || item.type === activeType
      const matchesQuery = [item.title, item.subtitle, item.detail]
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery)

      return matchesType && matchesQuery
    })
  }, [activeType, items, query])

  const selectedItem = items.find((item) => item.id === selectedId) ?? items[0]
  const firstName = googleAccount?.name.split(' ')[0] || 'there'

  if (!accountReady) return <GoogleSignIn onSignedIn={(account) => { setGoogleAccount(account); setAccountReady(true) }} />
  if (!accessReady) return null
  if (!vaultPassword) return <VaultAccess setup={needsSetup} onUnlock={unlockVault} />

  return (
    <main className="app-shell">
      <Sidebar
        items={items}
        activeType={activeType}
        onTypeChange={setActiveType}
      />
      <section className="workspace">
        <header className="topbar">
          <div>
            <h1>{firstName}'s Vault</h1>
          </div>
          <div className="topbar-actions">
            <button className="secondary-button" type="button" onClick={exportVault}>Export</button>
            <button className="secondary-button" type="button" onClick={() => importInput.current?.click()}>Import</button>
            <input
              ref={importInput}
              className="hidden-file-input"
              type="file"
              accept="application/json,.json"
              onChange={(event) => {
                const file = event.target.files?.[0]
                event.target.value = ''
                if (file) void importVault(file)
              }}
            />
            {googleAccount && <>
              <button className="secondary-button" type="button" onClick={() => void backupToDrive()}>Back up</button>
              <button className="secondary-button" type="button" onClick={() => void restoreFromDrive()}>Restore</button>
            </>}
            <AddItemMenu open={showAddMenu} itemTypes={itemTypes} onToggle={() => setShowAddMenu(!showAddMenu)} onAdd={addItem} />
          </div>
        </header>
        {driveStatus && <p className="drive-status" role="status">{driveStatus}</p>}
        {fileStatus && <p className="drive-status" role="status">{fileStatus}</p>}
        {importReview && (
          <section className="conflict-panel" role="dialog" aria-labelledby="conflict-heading">
            <p className="eyebrow">IMPORT CONFLICT {importReview.index + 1} OF {importReview.conflicts.length}</p>
            <h2 id="conflict-heading">Choose which record to keep</h2>
            <div className="conflict-records">
              <div><span>Current</span><strong>{importReview.conflicts[importReview.index].current.title}</strong><small>{importReview.conflicts[importReview.index].current.detail}</small></div>
              <div><span>Imported</span><strong>{importReview.conflicts[importReview.index].imported.title}</strong><small>{importReview.conflicts[importReview.index].imported.detail}</small></div>
            </div>
            <div className="conflict-actions">
              <button className="secondary-button" onClick={() => resolveImportConflict('current')}>Keep Current</button>
              <button className="secondary-button" onClick={() => resolveImportConflict('both')}>Keep Both</button>
              <button className="primary-button" onClick={() => resolveImportConflict('imported')}>Use Imported</button>
            </div>
          </section>
        )}
        {recoveryKeyNotice && (
          <aside className="recovery-notice" role="status">
            <div>
              <strong>Save your recovery key</strong>
              <p>{recoveryKeyNotice}</p>
              <span>You need this key if you forget your vault password.</span>
            </div>
            <div className="recovery-notice-actions">
              <button className="secondary-button" type="button" onClick={() => void copyRecoveryKey()}>Copy key</button>
              <button className="text-button" type="button" onClick={() => setRecoveryKeyNotice('')}>I saved it</button>
            </div>
          </aside>
        )}
        <div className="content-grid">
          <ItemList
            items={filteredItems}
            selectedId={selectedId}
            activeType={activeType}
            query={query}
            onQueryChange={setQuery}
            onSelect={(id) => {
              setSelectedId(id)
              setShowPassword(false)
            }}
          />
          <ItemDetails
            item={showItemForm ? { id: 0, type: draftType, title: '', subtitle: '', detail: '' } : selectedItem}
            empty={!showItemForm && !selectedItem}
            showPassword={showPassword}
            showForm={showItemForm}
            editing={editingId !== null}
            draftTitle={draftTitle}
            draftFields={draftFields}
            customFields={draftCustomFields}
            onTogglePassword={() => setShowPassword(!showPassword)}
            onCloseForm={() => setShowItemForm(false)}
            onDraftTitleChange={setDraftTitle}
            onDraftFieldChange={updateDraftField}
            onCustomFieldsChange={setDraftCustomFields}
            onSaveDraft={saveItem}
            onEdit={startEditing}
            onDelete={deleteSelectedItem}
            onCopy={copyToClipboard}
          />
        </div>
      </section>
    </main>
  )
}

export default App

import type { VaultItem } from '../types/vault'

const storageKey = 'secret-keeper-vault'
const keyLength = 256
const iterations = 250000

type StoredVault = {
  version: 2
  dataIv: string
  data: string
  masterSalt: string
  masterIv: string
  masterWrappedKey: string
  recoverySalt: string
  recoveryIv: string
  recoveryWrappedKey: string
}

type LegacyStoredVault = {
  salt: string
  iv: string
  data: string
}

export type VaultLoadResult = {
  items: VaultItem[]
  recoveryKey?: string
}

function toBase64(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes))
}

function fromBase64(value: string) {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0))
}

async function deriveKey(secret: string, salt: Uint8Array) {
  const secretBytes = new TextEncoder().encode(secret)
  const baseKey = await crypto.subtle.importKey('raw', secretBytes.buffer as ArrayBuffer, 'PBKDF2', false, ['deriveKey'])

  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt.buffer as ArrayBuffer, iterations, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: keyLength },
    false,
    ['encrypt', 'decrypt'],
  )
}

async function encryptVaultData(key: CryptoKey, items: VaultItem[]) {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const data = new TextEncoder().encode(JSON.stringify(items))
  const encryptedData = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv.buffer as ArrayBuffer }, key, data.buffer as ArrayBuffer)

  return { iv: toBase64(iv), data: toBase64(new Uint8Array(encryptedData)) }
}

async function decryptVaultData(key: CryptoKey, ivValue: string, dataValue: string) {
  const decryptedData = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromBase64(ivValue).buffer as ArrayBuffer },
    key,
    fromBase64(dataValue),
  )

  return JSON.parse(new TextDecoder().decode(decryptedData)) as VaultItem[]
}

async function wrapVaultKey(wrappingKey: CryptoKey, vaultKey: CryptoKey) {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const rawVaultKey = await crypto.subtle.exportKey('raw', vaultKey)
  const wrappedKey = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv.buffer as ArrayBuffer }, wrappingKey, rawVaultKey)

  return { iv: toBase64(iv), wrappedKey: toBase64(new Uint8Array(wrappedKey)) }
}

async function unwrapVaultKey(wrappingKey: CryptoKey, ivValue: string, wrappedKeyValue: string) {
  const rawVaultKey = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromBase64(ivValue).buffer as ArrayBuffer },
    wrappingKey,
    fromBase64(wrappedKeyValue),
  )

  return crypto.subtle.importKey('raw', rawVaultKey, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt'])
}

function createRecoveryKey() {
  const bytes = crypto.getRandomValues(new Uint8Array(18))
  return `SK-${Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('').toUpperCase()}`
}

export function hasStoredVault() {
  return Boolean(localStorage.getItem(storageKey))
}

export function getEncryptedVault() {
  const storedValue = localStorage.getItem(storageKey)
  if (!storedValue) throw new Error('Vault does not exist.')
  return storedValue
}

export function setEncryptedVault(serializedVault: string) {
  const parsedVault = JSON.parse(serializedVault) as Partial<StoredVault>
  const requiredFields: (keyof StoredVault)[] = [
    'dataIv', 'data', 'masterSalt', 'masterIv', 'masterWrappedKey',
    'recoverySalt', 'recoveryIv', 'recoveryWrappedKey',
  ]

  if (parsedVault.version !== 2 || requiredFields.some((field) => typeof parsedVault[field] !== 'string')) {
    throw new Error('The Drive backup is not a valid Secret Keeper vault.')
  }

  localStorage.setItem(storageKey, serializedVault)
}

export async function createVault(password: string, items: VaultItem[]) {
  const recoveryKey = createRecoveryKey()
  const vaultKey = await crypto.subtle.generateKey({ name: 'AES-GCM', length: keyLength }, true, ['encrypt', 'decrypt'])
  const masterSalt = crypto.getRandomValues(new Uint8Array(16))
  const recoverySalt = crypto.getRandomValues(new Uint8Array(16))
  const masterWrappingKey = await deriveKey(password, masterSalt)
  const recoveryWrappingKey = await deriveKey(recoveryKey, recoverySalt)
  const masterEnvelope = await wrapVaultKey(masterWrappingKey, vaultKey)
  const recoveryEnvelope = await wrapVaultKey(recoveryWrappingKey, vaultKey)
  const encryptedData = await encryptVaultData(vaultKey, items)
  const storedVault: StoredVault = {
    version: 2,
    dataIv: encryptedData.iv,
    data: encryptedData.data,
    masterSalt: toBase64(masterSalt),
    masterIv: masterEnvelope.iv,
    masterWrappedKey: masterEnvelope.wrappedKey,
    recoverySalt: toBase64(recoverySalt),
    recoveryIv: recoveryEnvelope.iv,
    recoveryWrappedKey: recoveryEnvelope.wrappedKey,
  }

  localStorage.setItem(storageKey, JSON.stringify(storedVault))
  return recoveryKey
}

export async function saveVault(secret: string, items: VaultItem[]) {
  const storedValue = localStorage.getItem(storageKey)
  if (!storedValue) throw new Error('Vault does not exist.')

  const storedVault = JSON.parse(storedValue) as StoredVault
  let vaultKey: CryptoKey

  try {
    const masterWrappingKey = await deriveKey(secret, fromBase64(storedVault.masterSalt))
    vaultKey = await unwrapVaultKey(masterWrappingKey, storedVault.masterIv, storedVault.masterWrappedKey)
  } catch {
    const recoveryWrappingKey = await deriveKey(secret, fromBase64(storedVault.recoverySalt))
    vaultKey = await unwrapVaultKey(recoveryWrappingKey, storedVault.recoveryIv, storedVault.recoveryWrappedKey)
  }

  const encryptedData = await encryptVaultData(vaultKey, items)
  localStorage.setItem(storageKey, JSON.stringify({ ...storedVault, dataIv: encryptedData.iv, data: encryptedData.data }))
}

export async function loadVault(password: string, recoveryKey?: string): Promise<VaultLoadResult> {
  const storedValue = localStorage.getItem(storageKey)
  if (!storedValue) return { items: [] as VaultItem[] }

  const storedVault = JSON.parse(storedValue) as StoredVault | LegacyStoredVault

  if (!('version' in storedVault)) {
    const legacyKey = await deriveKey(password, fromBase64(storedVault.salt))
    const legacyItems = await decryptVaultData(legacyKey, storedVault.iv, storedVault.data)
    const generatedRecoveryKey = await createVault(password, legacyItems)
    return { items: legacyItems, recoveryKey: generatedRecoveryKey }
  }

  let vaultKey: CryptoKey

  try {
    const masterWrappingKey = await deriveKey(password, fromBase64(storedVault.masterSalt))
    vaultKey = await unwrapVaultKey(masterWrappingKey, storedVault.masterIv, storedVault.masterWrappedKey)
  } catch {
    if (!recoveryKey) throw new Error('The password is not correct.')
    const recoveryWrappingKey = await deriveKey(recoveryKey, fromBase64(storedVault.recoverySalt))
    vaultKey = await unwrapVaultKey(recoveryWrappingKey, storedVault.recoveryIv, storedVault.recoveryWrappedKey)
  }

  return { items: await decryptVaultData(vaultKey, storedVault.dataIv, storedVault.data) }
}

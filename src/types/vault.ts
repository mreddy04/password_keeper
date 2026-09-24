export type VaultItemType = 'Password' | 'Card' | 'Bank' | 'Note'

export type VaultField = {
  label: string
  value: string
  custom?: boolean
}

export type CustomField = VaultField & {
  id: number
}

export type VaultItem = {
  id: number
  type: VaultItemType
  title: string
  subtitle: string
  detail: string
  username?: string
  password?: string
  fields?: VaultField[]
}

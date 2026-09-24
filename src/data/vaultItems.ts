import type { VaultItem, VaultItemType } from '../types/vault'

export const itemTypes: VaultItemType[] = ['Password', 'Card', 'Bank', 'Note']

export const vaultItems: VaultItem[] = [
  {
    id: 1,
    type: 'Password',
    title: 'Google',
    subtitle: 'accounts.google.com',
    detail: 'Personal account',
    username: 'alex@example.com',
    password: 'Jade-forest-48!',
  },
  {
    id: 2,
    type: 'Password',
    title: 'GitHub',
    subtitle: 'github.com',
    detail: 'Work account',
    username: 'alex-dev',
    password: 'River-stone-72#',
  },
  {
    id: 3,
    type: 'Card',
    title: 'Everyday card',
    subtitle: 'Visa ending in 4821',
    detail: 'Personal card',
  },
  {
    id: 4,
    type: 'Bank',
    title: 'Everyday bank',
    subtitle: 'Account ending in 1098',
    detail: 'Personal bank account',
    fields: [
      { label: 'Account ID', value: '1098 4421' },
      { label: 'Account holder', value: 'Alex Morgan' },
      { label: 'IFSC code', value: 'SKPB0000142' },
      { label: 'Address', value: '14 North Street, Bristol' },
    ],
  },
  {
    id: 5,
    type: 'Note',
    title: 'Travel checklist',
    subtitle: '12 lines of text',
    detail: 'Personal note',
    fields: [{ label: 'Content', value: 'Passport, charger, adapter, and travel insurance.' }],
  },
]

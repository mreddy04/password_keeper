import type { VaultItem, VaultItemType } from '../types/vault'

type SidebarProps = {
  items: VaultItem[]
  activeType: 'All items' | VaultItemType
  onTypeChange: (type: 'All items' | VaultItemType) => void
}

function categoryLabel(type: 'All items' | VaultItemType) {
  if (type === 'All items') return type
  if (type === 'Bank') return 'Bank'
  if (type === 'Note') return 'Notes'
  return `${type}s`
}

function Sidebar({ items, activeType, onTypeChange }: SidebarProps) {
  const categories: ('All items' | VaultItemType)[] = ['All items', 'Password', 'Card', 'Bank', 'Note']

  return (
    <aside className="sidebar">
      <div className="brand-row">
        <div>
          <strong>Secret Keeper</strong>
        </div>
      </div>

      <nav className="side-nav" aria-label="Vault categories">
        {categories.map((type) => (
          <button
            className={activeType === type ? 'nav-item active' : 'nav-item'}
            key={type}
            onClick={() => onTypeChange(type)}
          >
            {categoryLabel(type)}
            <span className="nav-count">
              {type === 'All items' ? items.length : items.filter((item) => item.type === type).length}
            </span>
          </button>
        ))}
      </nav>

    </aside>
  )
}

export default Sidebar

import type { VaultItem, VaultItemType } from '../types/vault'

type ItemListProps = {
  items: VaultItem[]
  selectedId: number
  activeType: 'All items' | VaultItemType
  query: string
  onQueryChange: (query: string) => void
  onSelect: (id: number) => void
}

function categoryLabel(type: 'All items' | VaultItemType) {
  if (type === 'All items') return type
  if (type === 'Bank') return 'Bank'
  if (type === 'Note') return 'Notes'
  return `${type}s`
}

function ItemList({ items, selectedId, activeType, query, onQueryChange, onSelect }: ItemListProps) {
  return (
    <section className="items-panel" aria-label="Vault items">
      <div className="search-wrap">
        <input
          aria-label="Search vault"
          placeholder="Search your vault"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
        />
      </div>
      <div className="list-heading">
        <span>{categoryLabel(activeType)}</span>
        <span className="muted">{items.length} saved</span>
      </div>
      <div className="item-list">
        {items.map((item) => (
          <button
            className={selectedId === item.id ? 'item-card selected' : 'item-card'}
            key={item.id}
            onClick={() => onSelect(item.id)}
          >
            <span className="item-copy">
              <strong>{item.title}</strong>
              <small>{item.subtitle}</small>
            </span>
            <span className="item-arrow">&gt;</span>
          </button>
        ))}
        {items.length === 0 && <p className="empty-state">No items match your search.</p>}
      </div>
    </section>
  )
}

export default ItemList

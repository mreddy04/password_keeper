import type { VaultItemType } from '../types/vault'

type AddItemMenuProps = {
  open: boolean
  itemTypes: VaultItemType[]
  onToggle: () => void
  onAdd: (type: VaultItemType) => void
}

function AddItemMenu({ open, itemTypes, onToggle, onAdd }: AddItemMenuProps) {
  return (
    <div className="add-wrap">
      <button className="add-button" onClick={onToggle}>+ Add item</button>
      {open && (
        <div className="add-menu" role="menu">
          {itemTypes.map((type) => (
            <button key={type} role="menuitem" onClick={() => onAdd(type)}>
              <strong>{type === 'Note' ? 'Note' : type === 'Bank' ? 'Bank account' : type}</strong>
              <small>Create a {type.toLowerCase()} record</small>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default AddItemMenu

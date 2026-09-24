import type { CustomField, VaultItemType } from '../types/vault'

type ItemFormProps = {
  type: VaultItemType
  title: string
  fields: Record<string, string>
  customFields: CustomField[]
  editing: boolean
  onTitleChange: (title: string) => void
  onFieldChange: (label: string, value: string) => void
  onCustomFieldsChange: (fields: CustomField[]) => void
  onSave: () => void
  onCancel: () => void
}

const formFields: Record<VaultItemType, string[]> = {
  Password: ['Website', 'Username', 'Password'],
  Card: ['Cardholder name', 'Card number', 'Expiry', 'CVV'],
  Bank: ['Account ID', 'Account holder name', 'IFSC code', 'Address'],
  Note: ['Content'],
}

function ItemForm({ type, title, fields, customFields, editing, onTitleChange, onFieldChange, onCustomFieldsChange, onSave, onCancel }: ItemFormProps) {
  const addCustomField = () => {
    onCustomFieldsChange([...customFields, { id: Date.now(), label: '', value: '' }])
  }

  const updateCustomField = (id: number, key: 'label' | 'value', value: string) => {
    onCustomFieldsChange(customFields.map((field) => field.id === id ? { ...field, [key]: value } : field))
  }

  const removeCustomField = (id: number) => {
    onCustomFieldsChange(customFields.filter((field) => field.id !== id))
  }

  return (
    <div className="item-form">
      <div className="detail-topline">
        <span className="detail-type">{editing ? 'Edit' : 'New'} {type.toLowerCase()}</span>
        <button className="more-button" aria-label="Close form" onClick={onCancel}>X</button>
      </div>
      <h2>{editing ? 'Edit' : 'Add'} {type === 'Note' ? 'note' : type.toLowerCase()}</h2>
      <p className="muted">Keep this record in your local vault.</p>
      <label className="form-field">
        <span>Title</span>
        <input value={title} onChange={(event) => onTitleChange(event.target.value)} placeholder="Give it a name" autoFocus />
      </label>
      {formFields[type].map((label) => (
        <label className="form-field" key={label}>
          <span>{label}</span>
          {label === 'Content' || label === 'Address' ? (
            <textarea value={fields[label] || ''} onChange={(event) => onFieldChange(label, event.target.value)} rows={3} />
          ) : (
            <input
              type={label === 'Password' || label === 'CVV' ? 'password' : 'text'}
              value={fields[label] || ''}
              onChange={(event) => onFieldChange(label, event.target.value)}
            />
          )}
        </label>
      ))}
      {type !== 'Note' && (
        <div className="custom-fields-form">
          <div className="custom-fields-heading">
            <span>Custom fields</span>
            <button className="copy-button" type="button" onClick={addCustomField}>+ Add field</button>
          </div>
          {customFields.map((field) => (
            <div className="custom-field-row" key={field.id}>
              <input aria-label="Custom field name" placeholder="Field name" value={field.label} onChange={(event) => updateCustomField(field.id, 'label', event.target.value)} />
              <input aria-label="Custom field value" placeholder="Value" value={field.value} onChange={(event) => updateCustomField(field.id, 'value', event.target.value)} />
              <button className="remove-field-button" type="button" aria-label="Remove custom field" onClick={() => removeCustomField(field.id)}>Remove</button>
            </div>
          ))}
          {customFields.length === 0 && <p className="custom-fields-empty">Add extra information specific to this record.</p>}
        </div>
      )}
      <div className="detail-actions">
        <button className="primary-button" onClick={onSave}>Save item</button>
        <button className="secondary-button" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  )
}

export default ItemForm

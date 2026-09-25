import type { CustomField, VaultItem } from '../types/vault'
import ItemForm from './ItemForm'

type ItemDetailsProps = {
  item: VaultItem
  empty: boolean
  showPassword: boolean
  showForm: boolean
  editing: boolean
  draftTitle: string
  draftFields: Record<string, string>
  customFields: CustomField[]
  onTogglePassword: () => void
  onCloseForm: () => void
  onDraftTitleChange: (title: string) => void
  onDraftFieldChange: (label: string, value: string) => void
  onCustomFieldsChange: (fields: CustomField[]) => void
  onSaveDraft: () => void
  onEdit: () => void
  onDelete: () => void
  onCopy: (label: string, value: string) => void
}

function ItemDetails({
  item,
  empty,
  showPassword,
  showForm,
  editing,
  draftTitle,
  draftFields,
  customFields,
  onTogglePassword,
  onCloseForm,
  onDraftTitleChange,
  onDraftFieldChange,
  onCustomFieldsChange,
  onSaveDraft,
  onEdit,
  onDelete,
  onCopy,
}: ItemDetailsProps) {
  return (
    <section className="detail-panel" aria-label={showForm ? 'Add vault item' : 'Selected item details'}>
      {empty ? (
        <div className="empty-detail">
          <h2>No items yet</h2>
          <p className="muted">Add a record to start building your vault.</p>
        </div>
      ) : showForm ? (
        <ItemForm
          type={item.type}
          title={draftTitle}
          fields={draftFields}
          customFields={customFields}
          editing={editing}
          onTitleChange={onDraftTitleChange}
          onFieldChange={onDraftFieldChange}
          onCustomFieldsChange={onCustomFieldsChange}
          onSave={onSaveDraft}
          onCancel={onCloseForm}
        />
      ) : (
        <>
          <h2>{item.title}</h2>
          <p className="muted">{item.detail}</p>

          {item.type === 'Password' && (
            <div className="detail-fields">
              <DetailField label="Website" value={item.subtitle} onCopy={onCopy} />
              <DetailField label="Username" value={item.username || ''} onCopy={onCopy} />
              <div className="field-row">
                <span className="field-label">Password</span>
                <strong>{showPassword ? item.password : '***************'}</strong>
                <button className="copy-button" onClick={onTogglePassword}>
                  {showPassword ? 'Hide' : 'Reveal'}
                </button>
              </div>
            </div>
          )}

          {item.type !== 'Password' && item.fields && (
            <div className="detail-fields">
              {item.fields.map((field) => <DetailField key={field.label} label={field.label} value={field.value} onCopy={onCopy} />)}
            </div>
          )}

          {item.type !== 'Password' && !item.fields && (
            <div className="placeholder-detail">
              <span>Secure record</span>
              <p>Details are protected and ready to be added.</p>
            </div>
          )}

          <div className="detail-actions">
            <button className="primary-button" onClick={onEdit}>Edit item</button>
            <button className="secondary-button" onClick={onDelete}>Delete</button>
          </div>
        </>
      )}
    </section>
  )
}

type DetailFieldProps = {
  label: string
  value: string
  onCopy: (label: string, value: string) => void
}

function DetailField({ label, value, onCopy }: DetailFieldProps) {
  return (
    <div className="field-row">
      <span className="field-label">{label}</span>
      <strong>{value}</strong>
      <button className="copy-button" aria-label={`Copy ${label}`} onClick={() => onCopy(label, value)}>Copy</button>
    </div>
  )
}

export default ItemDetails

// Building blocks shared by the three tabs: the page frame with its header,
// the add/search bar under it, and the scrolling list with its info messages.
import { useState } from 'react';

export default function TabPage({ title, children }) {
  return (
    <div className="tab-page">
      <h1 className="tab-header">{title}</h1>
      <div className="tab-content">
        <div className="tab-body">{children}</div>
      </div>
    </div>
  );
}

// Text input that adds on Enter or via the button; `children` go between them
// (extra fields like a quantity box or unit picker). Optional `suggestions`
// is `(close) => <dropdown>`, shown under the input while it is focused and
// non-empty; the dropdown calls `close` once a suggestion has been picked.
export function AddBar({ placeholder, value, onChange, onAdd, suggestions, children }) {
  const [open, setOpen] = useState(false);
  const onKeyDown = (e) => { if (e.key === 'Enter') onAdd(); };
  const input = (
    <input
      type="text"
      placeholder={placeholder}
      value={value}
      onChange={(e) => { onChange(e.target.value); setOpen(true); }}
      onKeyDown={onKeyDown}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    />
  );
  return (
    <div className="add-bar">
      {suggestions ? (
        <div className="add-bar-field">
          {input}
          {open && value !== '' && suggestions(() => setOpen(false))}
        </div>
      ) : input}
      {children}
      <button className="pill-button add-button" onClick={onAdd}>Add</button>
    </div>
  );
}

// `empty` shows when there is nothing at all, `noMatch` when a search hides
// everything. Rows (`children`) are <li class="list-row">; `footer` renders
// after the <ul> (e.g. a second section) and scrolls with it.
export function ItemList({ total, shown = total, empty, noMatch, children, footer }) {
  return (
    <div className="item-list">
      <ul>
        {total === 0 && <li className="info-message">{empty}</li>}
        {shown === 0 && total > 0 && <li className="info-message">{noMatch}</li>}
        {children}
      </ul>
      {footer}
    </div>
  );
}

export function Field({ label, children }) {
  return (
    <label className="field">
      <span className="sm-label">{label}</span>
      {children}
    </label>
  )
}

export function Input(props) {
  return <input className="sm-input" {...props} />
}

export function Select({ options = [], ...props }) {
  return (
    <select className="sm-input" {...props}>
      {options.map(([value, title]) => (
        <option key={value} value={value}>{title}</option>
      ))}
    </select>
  )
}

export function Textarea(props) {
  return <textarea className="sm-input" style={{ height: 120, padding: '10px 12px' }} {...props} />
}



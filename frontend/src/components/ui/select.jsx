export function Select({ children }) { return children }
export function SelectTrigger({ className = '', children, ...props }) {
  return <div className={["sm-input", className].filter(Boolean).join(' ')} {...props}>{children}</div>
}
export function SelectValue({ placeholder }) { return <span style={{ opacity: .7 }}>{placeholder}</span> }
export function SelectContent({ children }) { return <div style={{ display: 'none' }}>{children}</div> }
export function SelectItem({ value, children }) { return <option value={value}>{children}</option> }



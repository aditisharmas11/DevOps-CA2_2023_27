export function Input({ className = '', ...props }) {
  return <input className={["sm-input", className].filter(Boolean).join(' ')} {...props} />
}

export function Textarea({ className = '', ...props }) {
  return <textarea className={["sm-input", className].filter(Boolean).join(' ')} {...props} />
}

export function Label({ className = '', ...props }) {
  return <label className={["sm-label", className].filter(Boolean).join(' ')} {...props} />
}



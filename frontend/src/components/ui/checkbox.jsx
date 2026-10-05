export function Checkbox({ checked, onCheckedChange, ...props }) {
  return <input type="checkbox" checked={!!checked} onChange={(e) => onCheckedChange?.(e.target.checked)} {...props} />
}



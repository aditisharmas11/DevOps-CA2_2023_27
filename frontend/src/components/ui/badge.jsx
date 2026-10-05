export function Badge({ className = '', children, ...props }) {
  const cls = ['sm-badge', className].filter(Boolean).join(' ')
  return <span className={cls} {...props}>{children}</span>
}



export function Button({ asChild, variant = 'default', size = 'md', className = '', children, ...props }) {
  const base = 'sm-btn'
  const variants = {
    default: '',
    outline: 'sm-btn-outline',
    ghost: 'sm-btn-ghost',
    secondary: 'sm-btn-secondary',
  }
  const sizes = {
    sm: 'sm-btn-sm',
    md: '',
    lg: 'sm-btn-lg',
    icon: 'sm-btn-icon',
  }
  const cls = [base, variants[variant] || '', sizes[size] || '', className].filter(Boolean).join(' ')
  if (asChild) {
    return children
  }
  return (
    <button className={cls} {...props}>{children}</button>
  )
}



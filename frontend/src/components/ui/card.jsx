export function Card({ className = '', children, style, ...props }) {
  return <div className={["sm-card", className].filter(Boolean).join(' ')} style={style} {...props}>{children}</div>
}

export function CardHeader({ className = '', children, style, ...props }) {
  const defaultStyle = { padding: 12, borderBottom: '1px solid #eee' }
  const mergedStyle = style ? { ...defaultStyle, ...style } : defaultStyle
  return <div className={className} style={mergedStyle} {...props}>{children}</div>
}

export function CardTitle({ className = '', children, style, ...props }) {
  const defaultStyle = { fontWeight: 800 }
  const mergedStyle = style ? { ...defaultStyle, ...style } : defaultStyle
  return <div className={className} style={mergedStyle} {...props}>{children}</div>
}

export function CardContent({ className = '', children, style, ...props }) {
  const defaultStyle = { padding: 12 }
  const mergedStyle = style ? { ...defaultStyle, ...style } : defaultStyle
  return <div className={className} style={mergedStyle} {...props}>{children}</div>
}



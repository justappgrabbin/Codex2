import type { ButtonHTMLAttributes, ReactNode } from 'react';
export function Button({ className = '', children, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string; size?: string; children?: ReactNode }) {
  return <button className={`px-2 py-1 rounded text-xs ${className}`} {...props}>{children}</button>;
}
export default Button;

import type { HTMLAttributes, ReactNode } from 'react';
export function Badge({ className = '', children, ...props }: HTMLAttributes<HTMLSpanElement> & { variant?: string; children?: ReactNode }) {
  return <span className={`px-1.5 py-0.5 rounded text-[10px] ${className}`} {...props}>{children}</span>;
}
export default Badge;

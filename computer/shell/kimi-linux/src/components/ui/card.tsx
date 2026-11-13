import type { HTMLAttributes, ReactNode } from 'react';
export function Card({ className = '', children, ...props }: HTMLAttributes<HTMLDivElement> & { children?: ReactNode }) {
  return <div className={`rounded border border-current/15 p-3 ${className}`} {...props}>{children}</div>;
}
export default Card;

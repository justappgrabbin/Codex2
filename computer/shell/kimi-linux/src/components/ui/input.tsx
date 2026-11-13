import { forwardRef, type InputHTMLAttributes } from 'react';
export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className = '', ...props }, ref) {
  return <input ref={ref} className={`px-2 py-1 rounded text-xs bg-transparent border border-current/20 ${className}`} {...props} />;
});
export default Input;

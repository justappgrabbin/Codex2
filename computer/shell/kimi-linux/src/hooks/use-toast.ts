export function useToast() {
  return {
    toast: (opts: { title?: string; description?: string; variant?: string } = {}) => {
      const text = [opts.title, opts.description].filter(Boolean).join(': ');
      if (text) console.info('[grove-toast]', text);
    },
  };
}

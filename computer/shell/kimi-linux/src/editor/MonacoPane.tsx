import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    monaco?: any;
    require?: any;
    MonacoEnvironment?: { getWorkerUrl?: (moduleId: string, label: string) => string };
  }
}

const BASE = '/monaco/0.52.2';

function loadScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const el = document.createElement('script');
    el.src = src;
    el.onload = () => resolve();
    el.onerror = () => reject(new Error('Failed to load ' + src));
    document.head.appendChild(el);
  });
}

function loadCss(href: string) {
  if (document.querySelector(`link[href="${href}"]`)) return;
  const el = document.createElement('link');
  el.rel = 'stylesheet';
  el.href = href;
  document.head.appendChild(el);
}

export async function loadMonaco() {
  if (window.monaco) return window.monaco;
  loadCss(`${BASE}/editor.main.css`);
  window.MonacoEnvironment = {
    getWorkerUrl(_id: string, label: string) {
      const file = label === 'json' ? 'json.worker.umd.js'
        : label === 'css' || label === 'scss' || label === 'less' ? 'css.worker.umd.js'
        : label === 'html' || label === 'handlebars' || label === 'razor' ? 'html.worker.umd.js'
        : label === 'typescript' || label === 'javascript' ? 'ts.worker.umd.js'
        : 'editor.worker.umd.js';
      const body = `self.MonacoEnvironment={baseUrl:'${BASE}/'};importScripts('${BASE}/${file}');`;
      return URL.createObjectURL(new Blob([body], { type: 'text/javascript' }));
    },
  };
  await loadScript(`${BASE}/editor.main.umd.js`);
  if (!window.monaco) throw new Error('Monaco UMD did not attach to window.monaco');
  return window.monaco;
}

const LANG: Record<string, string> = {
  javascript: 'javascript', js: 'javascript', typescript: 'typescript', ts: 'typescript',
  json: 'json', css: 'css', html: 'html', markdown: 'markdown', python: 'python',
};

export function MonacoPane({ value, language, onChange }: { value: string; language: string; onChange: (value: string) => void }) {
  const host = useRef<HTMLDivElement>(null);
  const editorRef = useRef<any>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    let disposed = false;
    let sub: any;
    loadMonaco().then((monaco) => {
      if (disposed || !host.current) return;
      const editor = monaco.editor.create(host.current, {
        value,
        language: LANG[language] ?? 'plaintext',
        theme: 'vs-dark',
        automaticLayout: true,
        minimap: { enabled: true },
        fontSize: 13,
      });
      editorRef.current = editor;
      sub = editor.onDidChangeModelContent(() => onChangeRef.current(editor.getValue()));
    }).catch((error) => {
      if (host.current) host.current.textContent = String(error);
    });
    return () => { disposed = true; sub?.dispose(); editorRef.current?.dispose(); editorRef.current = null; };
  }, []);

  useEffect(() => {
    const editor = editorRef.current;
    if (editor && editor.getValue() !== value) editor.setValue(value);
  }, [value]);

  useEffect(() => {
    const editor = editorRef.current;
    const monaco = window.monaco;
    if (editor && monaco) monaco.editor.setModelLanguage(editor.getModel(), LANG[language] ?? 'plaintext');
  }, [language]);

  return <div ref={host} className="h-full w-full" data-testid="monaco-pane" />;
}

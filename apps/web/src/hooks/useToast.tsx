import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

export type ToastType = 'success' | 'info' | 'warn' | 'error';

type Toast = {
  id: number;
  message: string;
  type: ToastType;
  hiding?: boolean;
};

type ToastCtx = {
  showToast: (message: string, type?: ToastType) => void;
};

const Ctx = createContext<ToastCtx | null>(null);

let nextId = 0;

const typeColors: Record<ToastType, string> = {
  success: 'var(--green)',
  info: 'var(--indigo)',
  warn: 'var(--amber)',
  error: 'var(--red)',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = ++nextId;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, hiding: true } : t)));
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 300);
    }, 3000);
  }, []);

  return (
    <Ctx.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[200] flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex items-center gap-2.5 rounded-[10px] border px-4 py-3 shadow-lg ${t.hiding ? 'animate-toast-out' : 'animate-toast-in'}`}
            style={{
              background: 'var(--bg-elevated)',
              borderColor: 'var(--border-light)',
              boxShadow: '0 16px 40px rgba(0,0,0,0.3)',
              minWidth: 260,
              fontSize: 13,
              color: 'var(--text-primary)',
            }}
          >
            <span style={{ color: typeColors[t.type], fontSize: 16 }}>●</span>
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useToast outside ToastProvider');
  return ctx;
}

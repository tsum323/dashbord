import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { ValidationError } from '../../db/repo';
import { Button } from './Button';
import { Modal } from './Modal';

// ───────────── Уведомления ─────────────

interface Toast {
  id: number;
  text: string;
  tone: 'success' | 'error';
}

const ToastCtx = createContext<(text: string, tone?: Toast['tone']) => void>(() => {});

export function useToast() {
  return useContext(ToastCtx);
}

// ───────────── Подтверждение опасных действий ─────────────

interface ConfirmOptions {
  title: string;
  text: string;
  confirmLabel?: string;
  danger?: boolean;
}

const ConfirmCtx = createContext<(o: ConfirmOptions) => Promise<boolean>>(async () => false);

/** const confirm = useConfirm(); if (await confirm({...})) { ... } */
export function useConfirm() {
  return useContext(ConfirmCtx);
}

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);
  const [pending, setPending] = useState<(ConfirmOptions & { resolve: (v: boolean) => void }) | null>(null);

  const toast = useCallback((text: string, tone: Toast['tone'] = 'success') => {
    const id = ++nextId.current;
    setToasts((t) => [...t.slice(-2), { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), tone === 'error' ? 6000 : 3000);
  }, []);

  const confirm = useCallback((o: ConfirmOptions) => new Promise<boolean>((resolve) => setPending({ ...o, resolve })), []);

  const close = (v: boolean) => {
    pending?.resolve(v);
    setPending(null);
  };

  return (
    <ToastCtx.Provider value={toast}>
      <ConfirmCtx.Provider value={confirm}>
        {children}
        {pending && (
          <Modal
            title={pending.title}
            onClose={() => close(false)}
            footer={
              <>
                <Button onClick={() => close(false)}>Отмена</Button>
                <Button variant={pending.danger ? 'danger' : 'primary'} onClick={() => close(true)} data-autofocus>
                  {pending.confirmLabel ?? 'Подтвердить'}
                </Button>
              </>
            }
          >
            <p className="text-sm leading-6 text-white/85">{pending.text}</p>
          </Modal>
        )}
        {createPortal(
          <div
            aria-live="polite"
            className="phone:bottom-[calc(var(--tabbar-h)+var(--safe-bottom)+24px)] pointer-events-none fixed inset-x-0 bottom-6 z-[60] flex flex-col items-center gap-2 px-4"
          >
            {toasts.map((t) => (
              <div
                key={t.id}
                role={t.tone === 'error' ? 'alert' : 'status'}
                className={`glass glass-strong pointer-events-auto max-w-md px-4 py-3 text-sm ${t.tone === 'error' ? 'text-[var(--negative)]' : ''}`}
              >
                {t.tone === 'success' ? '✓ ' : ''}
                {t.text}
              </div>
            ))}
          </div>,
          document.body,
        )}
      </ConfirmCtx.Provider>
    </ToastCtx.Provider>
  );
}

/** Понятное сообщение об ошибке: ошибки проверки — как есть, остальные — с пояснением. */
export function errorText(e: unknown): string {
  if (e instanceof ValidationError) return e.message;
  if (e instanceof Error) return `Не удалось сохранить данные: ${e.message}`;
  return 'Что-то пошло не так. Попробуйте ещё раз.';
}

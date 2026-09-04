import { useToast } from '../../hooks/useToast';

export function ToastContainer() {
  const { toasts, dismissToast } = useToast();

  return (
    <div
      className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2 px-4"
      aria-live="polite"
      aria-atomic="true"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`toast toast-${toast.variant} pointer-events-auto`}
          role="status"
        >
          <span>{toast.message}</span>
          <button
            type="button"
            className="ml-3 text-xs opacity-70"
            onClick={() => dismissToast(toast.id)}
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}

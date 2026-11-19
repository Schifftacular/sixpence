"use client";
import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

/** A bottom sheet on phones, a centered dialog on wider screens. Uses the native <dialog> for focus and Escape. */
export function Sheet({
  label,
  title,
  buttonClass = "btn btn-secondary btn-sm",
  disabled,
  children,
}: {
  label: React.ReactNode;
  title: string;
  buttonClass?: string;
  disabled?: boolean;
  children: (close: () => void) => React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <>
      <button type="button" className={buttonClass} onClick={() => setOpen(true)} disabled={disabled}>
        {label}
      </button>
      <dialog
        ref={ref}
        onClose={() => setOpen(false)}
        onClick={(e) => e.target === ref.current && setOpen(false)}
        className="m-0 mt-auto w-full max-w-none rounded-t-[var(--radius-md)] border border-border bg-surface p-0 text-text shadow-float backdrop:bg-text/30 sm:m-auto sm:max-w-lg sm:rounded-[var(--radius-md)]"
      >
        {open ? (
          <div className="flex max-h-[85dvh] flex-col">
            <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3">
              <h2 className="h-section">{title}</h2>
              <button type="button" aria-label="Close" className="rounded-sm p-2 text-text-muted hover:bg-primary-soft" onClick={() => setOpen(false)}>
                <X size={18} strokeWidth={1.75} />
              </button>
            </div>
            <div className="overflow-y-auto px-5 py-4">{children(() => setOpen(false))}</div>
          </div>
        ) : null}
      </dialog>
    </>
  );
}

/** Small helper for client forms that call a typed server action. */
export function useAction<T>(fn: (input: unknown) => Promise<{ ok: true; data: T } | { ok: false; error: string }>) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function run(input: unknown, onOk?: (data: T) => void): Promise<void> {
    setPending(true);
    setError(null);
    const res = await fn(input);
    setPending(false);
    if (res.ok) onOk?.(res.data);
    else setError(res.error);
  }
  return { run, pending, error, setError };
}

export function FormError({ error }: { error: string | null }) {
  return error ? <p className="mt-2 text-sm text-danger" role="alert">{error}</p> : null;
}

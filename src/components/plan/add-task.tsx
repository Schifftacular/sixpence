"use client";
import { useRef, useState, useTransition } from "react";
import { addTask } from "@/actions/task";

export function AddTask({ weddingId, autoFocus }: { weddingId: string; autoFocus: boolean }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const form = useRef<HTMLFormElement>(null);
  return (
    <form
      ref={form}
      className="mb-6 flex flex-col gap-2 rounded-md border border-border bg-surface p-4 sm:flex-row sm:items-end"
      action={(fd) =>
        start(async () => {
          const res = await addTask({
            weddingId,
            title: String(fd.get("title") ?? ""),
            dueDate: (fd.get("due") as string) || null,
          });
          if (res.ok) {
            setError(null);
            form.current?.reset();
          } else setError(res.error);
        })
      }
    >
      <label className="flex flex-1 flex-col gap-1 text-sm text-text-muted">
        New task
        <input name="title" required maxLength={200} autoFocus={autoFocus} placeholder="e.g. Taste cakes"
          className="rounded-sm border border-border bg-bg px-3 py-2 text-base text-text" />
      </label>
      <label className="flex flex-col gap-1 text-sm text-text-muted">
        Due (optional)
        <input name="due" type="date" className="rounded-sm border border-border bg-bg px-3 py-2 text-base text-text" />
      </label>
      <button type="submit" disabled={pending}
        className="rounded-pill bg-primary px-5 py-2 font-medium text-on-primary transition hover:opacity-90 disabled:opacity-60">
        {pending ? "Adding…" : "Add"}
      </button>
      {error ? <p className="text-sm text-danger sm:basis-full">{error}</p> : null}
    </form>
  );
}

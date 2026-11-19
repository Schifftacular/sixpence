"use client";
import { Heart, X } from "lucide-react";
import { useState } from "react";
import { removeBoardItem, saveToBoard } from "@/actions/boards";
import { FormError, Sheet, useAction } from "@/components/ui/sheet";

type Item = { kind: "photo" | "place" | "note"; title: string; imageUrl?: string; credit?: string; sourceUrl?: string; placeId?: string; categoryKey?: string };

export function SaveToBoard({ weddingId, item, saved = false, compact = false }: { weddingId: string; item: Item; saved?: boolean; compact?: boolean }) {
  const { run, pending, error } = useAction(saveToBoard);
  const [done, setDone] = useState(saved);
  const label = done ? "On your board" : "Save to board";
  return (
    <>
      <button type="button" aria-pressed={done} disabled={pending || done} onClick={() => run({ weddingId, ...item }, () => setDone(true))}
        className={compact ? "flex size-9 items-center justify-center rounded-full bg-surface/90 text-primary shadow-float" : "btn btn-quiet btn-sm"} aria-label={compact ? label : undefined}>
        <Heart size={16} fill={done ? "currentColor" : "none"} />{compact ? null : ` ${label}`}
      </button>
      <FormError error={error} />
    </>
  );
}

export function AddNote({ weddingId }: { weddingId: string }) {
  const { run, pending, error } = useAction(saveToBoard);
  return (
    <Sheet label="+ Add a note" title="Add a note" buttonClass="btn btn-secondary btn-sm">
      {(close) => (
        <form className="flex flex-col gap-4" action={(fd) => run({ weddingId, kind: "note", title: String(fd.get("title") ?? "").trim(), note: String(fd.get("note") ?? "") }, close)}>
          <div><label className="label" htmlFor="n-title">Title</label><input className="input" id="n-title" name="title" required maxLength={200} placeholder="Colors we keep coming back to" /></div>
          <div><label className="label" htmlFor="n-note">Note</label><textarea className="input" id="n-note" name="note" rows={4} /></div>
          <FormError error={error} />
          <button className="btn btn-primary" disabled={pending}>{pending ? "Saving…" : "Save"}</button>
        </form>
      )}
    </Sheet>
  );
}

export function RemoveItem({ itemId, title }: { itemId: string; title: string }) {
  const { run, pending } = useAction(removeBoardItem);
  return (
    <button type="button" className="flex size-8 items-center justify-center rounded-full bg-surface/90 text-text-muted hover:text-text" disabled={pending} aria-label={`Remove ${title}`} onClick={() => run({ itemId })}>
      <X size={14} />
    </button>
  );
}

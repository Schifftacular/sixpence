"use client";
import { Pencil, Printer, Trash2 } from "lucide-react";
import { draftTimeline, removeEvent, saveEvent } from "@/actions/day";
import { FormError, Sheet, useAction } from "@/components/ui/sheet";

type Ev = { id: string; starts_at: string; ends_at: string | null; title: string; location: string | null; owner: string | null };

export function EventSheet({ weddingId, ev }: { weddingId: string; ev?: Ev }) {
  const { run, pending, error } = useAction(saveEvent);
  const del = useAction(removeEvent);
  return (
    <Sheet label={ev ? <Pencil size={16} aria-label={`Edit ${ev.title}`} /> : "+ Add to the day"} title={ev ? "Edit" : "Add to the day"} buttonClass={ev ? "rounded-sm p-2 text-text-muted hover:bg-primary-soft" : "btn btn-secondary btn-sm"}>
      {(close) => (
        <form className="flex flex-col gap-4" action={(fd) => run({ weddingId, eventId: ev?.id, startsAt: fd.get("start"), endsAt: fd.get("end"), title: fd.get("title"), location: fd.get("loc"), owner: fd.get("owner") }, close)}>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label" htmlFor="e-start">Starts</label><input className="input" id="e-start" name="start" type="time" required defaultValue={ev?.starts_at.slice(0, 5)} /></div>
            <div><label className="label" htmlFor="e-end">Ends</label><input className="input" id="e-end" name="end" type="time" defaultValue={ev?.ends_at?.slice(0, 5) ?? ""} /></div>
          </div>
          <div><label className="label" htmlFor="e-title">What happens</label><input className="input" id="e-title" name="title" required maxLength={200} defaultValue={ev?.title} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label" htmlFor="e-loc">Where</label><input className="input" id="e-loc" name="loc" defaultValue={ev?.location ?? ""} /></div>
            <div><label className="label" htmlFor="e-owner">Who&apos;s on it</label><input className="input" id="e-owner" name="owner" defaultValue={ev?.owner ?? ""} /></div>
          </div>
          <FormError error={error ?? del.error} />
          <div className="flex gap-2">
            <button className="btn btn-primary flex-1" disabled={pending}>{pending ? "Saving…" : "Save"}</button>
            {ev && <button type="button" className="btn btn-quiet" aria-label="Remove" disabled={del.pending} onClick={() => del.run({ eventId: ev.id }, close)}><Trash2 size={16} /></button>}
          </div>
        </form>
      )}
    </Sheet>
  );
}

export function DraftDay({ weddingId, ceremonyTime, hasEvents }: { weddingId: string; ceremonyTime: string | null; hasEvents: boolean }) {
  const { run, pending, error } = useAction(draftTimeline);
  return (
    <Sheet label={hasEvents ? "Start over from a draft" : "Draft my timeline"} title="Draft a timeline" buttonClass={hasEvents ? "btn btn-quiet btn-sm" : "btn btn-primary"}>
      {(close) => (
        <form className="flex flex-col gap-4" action={(fd) => run({ weddingId, ceremonyTime: fd.get("ceremony"), replace: hasEvents }, close)}>
          <p className="text-sm text-text-muted">We&apos;ll build a typical day around your ceremony and add your booked vendors&apos; arrival times. Change anything after.</p>
          <div><label className="label" htmlFor="d-cer">Ceremony starts</label><input className="input" id="d-cer" name="ceremony" type="time" required defaultValue={ceremonyTime?.slice(0, 5) ?? "16:00"} /></div>
          {hasEvents && <p className="text-sm text-accent-text">This replaces your current timeline.</p>}
          <FormError error={error} />
          <button className="btn btn-primary" disabled={pending}>{pending ? "Drafting…" : "Draft it"}</button>
        </form>
      )}
    </Sheet>
  );
}

export function PrintButton() {
  return <button type="button" className="btn btn-quiet btn-sm print:hidden" onClick={() => window.print()}><Printer size={16} /> Print</button>;
}

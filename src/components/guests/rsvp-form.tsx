"use client";
import { useState } from "react";
import { submitRsvp } from "@/actions/rsvp";
import { FormError, useAction } from "@/components/ui/sheet";

export type RsvpGuest = { id: string; firstName: string; attending: boolean | null; meal: string | null; dietary: string | null; isPlusOne: boolean };

export function RsvpForm({ token, guests: initial, meals, preview }: { token: string; guests: RsvpGuest[]; meals: string[]; preview?: boolean }) {
  const [guests, setGuests] = useState(initial);
  const [note, setNote] = useState("");
  const [sent, setSent] = useState(false);
  const { run, pending, error, setError } = useAction(submitRsvp);
  const set = (i: number, p: Partial<RsvpGuest>) => setGuests(guests.map((g, j) => (j === i ? { ...g, ...p } : g)));
  if (sent) return <p className="card card-pad text-center text-lg">Thank you! Your reply is in. You can use this link again if anything changes.</p>;
  return (
    <form className="flex flex-col gap-4" action={() => {
      if (preview) return setError("This is a preview. Nothing is sent.");
      if (guests.some((g) => g.attending == null)) return setError("Please answer for everyone.");
      run({ token, note, guests: guests.map((g) => ({ id: g.id, attending: !!g.attending, meal: g.meal ?? undefined, dietary: g.dietary ?? undefined })) }, () => setSent(true));
    }}>
      {guests.map((g, i) => (
        <fieldset key={g.id} className="card card-pad flex flex-col gap-3">
          <legend className="sr-only">{g.isPlusOne ? "Your guest" : g.firstName}</legend>
          <p className="font-medium">{g.isPlusOne ? "Your guest" : g.firstName}</p>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" aria-pressed={g.attending === true} onClick={() => set(i, { attending: true })} className={`btn min-w-0 ${g.attending === true ? "btn-primary" : "btn-secondary"}`}>Will be there</button>
            <button type="button" aria-pressed={g.attending === false} onClick={() => set(i, { attending: false })} className={`btn min-w-0 ${g.attending === false ? "btn-primary" : "btn-secondary"}`}>Can&apos;t make it</button>
          </div>
          {g.attending && meals.length > 0 && (
            <select className="input" aria-label="Meal" value={g.meal ?? ""} onChange={(e) => set(i, { meal: e.target.value || null })}>
              <option value="">Choose a meal</option>
              {meals.map((m) => <option key={m}>{m}</option>)}
            </select>
          )}
          {g.attending && <input className="input" aria-label="Allergies or dietary needs" placeholder="Allergies or dietary needs" value={g.dietary ?? ""} onChange={(e) => set(i, { dietary: e.target.value || null })} maxLength={200} />}
        </fieldset>
      ))}
      <div><label className="label" htmlFor="rsvp-note">A note for the couple (optional)</label><textarea id="rsvp-note" className="input" rows={2} value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} /></div>
      <FormError error={error} />
      <button className="btn btn-primary" disabled={pending}>{pending ? "Sending…" : "Send reply"}</button>
    </form>
  );
}

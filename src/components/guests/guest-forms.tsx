"use client";
import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { addHouseholds, removeHousehold, saveHousehold, saveRsvpSettings } from "@/actions/guests";
import { FormError, Sheet, useAction } from "@/components/ui/sheet";
import { parseHousehold, parseList } from "@/lib/guests/parse";

export function QuickAdd({ weddingId, sides }: { weddingId: string; sides: string[] }) {
  const { run, pending, error } = useAction(addHouseholds);
  const [text, setText] = useState("");
  const [side, setSide] = useState("");
  const form = useRef<HTMLFormElement>(null);
  const preview = useMemo(() => parseHousehold(text), [text]);
  return (
    <form ref={form} className="card card-pad mb-4 flex flex-col gap-2" action={() => run({ weddingId, text, side }, () => setText(""))}>
      <label className="label" htmlFor="qa">Add a household</label>
      <div className="flex gap-2">
        <input id="qa" className="input flex-1" value={text} onChange={(e) => setText(e.target.value)} placeholder="Ana & Luis Pérez, or Maya Chen +1" maxLength={300} />
        <button className="btn btn-primary" disabled={pending || !preview}>{pending ? "Adding…" : "Add"}</button>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        {sides.map((s) => (
          <button key={s} type="button" className={`chip chip-toggle ${side === s ? "chip-success" : ""}`} aria-pressed={side === s} onClick={() => setSide(side === s ? "" : s)}>{s}&apos;s side</button>
        ))}
        {preview && <span className="text-text-muted">{preview.guests.length} {preview.guests.length === 1 ? "person" : "people"}: {preview.guests.map((g) => g.isPlusOne ? "a guest" : g.firstName).join(", ")}</span>}
      </div>
      <FormError error={error} />
    </form>
  );
}

export function PasteList({ weddingId }: { weddingId: string }) {
  const { run, pending, error } = useAction(addHouseholds);
  const [text, setText] = useState("");
  const parsed = useMemo(() => parseList(text), [text]);
  const people = parsed.reduce((a, h) => a + h.guests.length, 0);
  return (
    <Sheet label="Paste a list" title="Paste your guest list" buttonClass="btn btn-quiet btn-sm">
      {(close) => (
        <form className="flex flex-col gap-4" action={() => run({ weddingId, text }, () => { setText(""); close(); })}>
          <p className="text-sm text-text-muted">One household per line. Copy a column from a spreadsheet or a note. Only the first column is used.</p>
          <textarea className="input font-mono text-sm" rows={10} value={text} onChange={(e) => setText(e.target.value)} placeholder={"Ana & Luis Pérez\nMaya Chen +1\nTom and Priya Shah (kids: Leo, Mia)"} />
          {parsed.length > 0 && <p className="text-sm">{parsed.length} households, {people} people.</p>}
          <FormError error={error} />
          <button className="btn btn-primary" disabled={pending || !parsed.length}>{pending ? "Adding…" : `Add ${parsed.length || ""} households`}</button>
        </form>
      )}
    </Sheet>
  );
}

type G = { id?: string; firstName: string; lastName: string | null; isChild: boolean; isPlusOne: boolean; attending: boolean | null; meal: string | null; dietary: string | null };
type H = { id: string; name: string; side: string | null; group_name: string | null; email: string | null; address: string | null; plus_one_allowed: boolean; note: string | null };

export function HouseholdEditor({ weddingId, household, guests: initial, meals, readOnly }: { weddingId: string; household: H; guests: G[]; meals: string[]; readOnly: boolean }) {
  const { run, pending, error } = useAction(saveHousehold);
  const del = useAction(removeHousehold);
  const router = useRouter();
  const [guests, setGuests] = useState<G[]>(initial);
  const [saved, setSaved] = useState(false);
  const set = (i: number, patch: Partial<G>) => { setSaved(false); setGuests(guests.map((g, j) => (j === i ? { ...g, ...patch } : g))); };
  const str = (fd: FormData, k: string) => String(fd.get(k) ?? "");
  return (
    <form className="flex flex-col gap-6" action={(fd) => run({
      householdId: household.id, name: str(fd, "name"), side: str(fd, "side"), group: str(fd, "group"), email: str(fd, "email"), address: str(fd, "address"),
      plusOneAllowed: fd.get("plus") === "on", note: str(fd, "note"), guests,
    }, () => setSaved(true))}>
      <fieldset disabled={readOnly} className="flex flex-col gap-4">
        <div><label className="label" htmlFor="h-name">Invitation name</label><input className="input" id="h-name" name="name" defaultValue={household.name} required /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label" htmlFor="h-side">Side</label><input className="input" id="h-side" name="side" defaultValue={household.side ?? ""} placeholder="Jordan, Sam, Both" /></div>
          <div><label className="label" htmlFor="h-group">Group</label><input className="input" id="h-group" name="group" defaultValue={household.group_name ?? ""} placeholder="College friends" /></div>
        </div>
        <div><label className="label" htmlFor="h-email">Email</label><input className="input" id="h-email" name="email" type="email" defaultValue={household.email ?? ""} /></div>
        <div><label className="label" htmlFor="h-addr">Mailing address</label><textarea className="input" id="h-addr" name="address" rows={2} defaultValue={household.address ?? ""} /></div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="plus" defaultChecked={household.plus_one_allowed} /> They can bring a guest</label>
      </fieldset>

      <section>
        <h2 className="h-section mb-2">Who&apos;s in this household</h2>
        <ul className="flex flex-col gap-3">
          {guests.map((g, i) => (
            <li key={g.id ?? `new-${i}`} className="card card-pad flex flex-col gap-3">
              <div className="flex gap-2">
                <input className="input flex-1" aria-label="First name" value={g.firstName} onChange={(e) => set(i, { firstName: e.target.value })} required disabled={readOnly} />
                <input className="input flex-1" aria-label="Last name" value={g.lastName ?? ""} onChange={(e) => set(i, { lastName: e.target.value || null })} placeholder="Last name" disabled={readOnly} />
                {!readOnly && guests.length > 1 && <button type="button" className="btn btn-quiet btn-sm" aria-label={`Remove ${g.firstName}`} onClick={() => setGuests(guests.filter((_, j) => j !== i))}><Trash2 size={16} /></button>}
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm" role="group" aria-label={`${g.firstName}'s RSVP`}>
                {([[true, "Coming"], [false, "Can't make it"], [null, "Waiting"]] as const).map(([v, l]) => (
                  <button key={String(v)} type="button" disabled={readOnly} aria-pressed={g.attending === v} onClick={() => set(i, { attending: v })} className={`chip chip-toggle ${g.attending === v ? (v === false ? "chip-muted" : "chip-success") : ""}`}>{l}</button>
                ))}
                <label className="ml-auto flex items-center gap-1 text-text-muted"><input type="checkbox" checked={g.isChild} disabled={readOnly} onChange={(e) => set(i, { isChild: e.target.checked })} /> Child</label>
              </div>
              {g.attending && (
                <div className="grid grid-cols-2 gap-2">
                  {meals.length > 0 ? (
                    <select className="input" aria-label="Meal" value={g.meal ?? ""} disabled={readOnly} onChange={(e) => set(i, { meal: e.target.value || null })}>
                      <option value="">Meal not chosen</option>
                      {meals.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                  ) : <span />}
                  <input className="input" aria-label="Dietary needs" placeholder="Allergies or needs" value={g.dietary ?? ""} disabled={readOnly} onChange={(e) => set(i, { dietary: e.target.value || null })} />
                </div>
              )}
            </li>
          ))}
        </ul>
        {!readOnly && guests.length < 30 && (
          <button type="button" className="btn btn-quiet btn-sm mt-2" onClick={() => setGuests([...guests, { firstName: "", lastName: guests[0]?.lastName ?? null, isChild: false, isPlusOne: false, attending: null, meal: null, dietary: null }])}>
            <Plus size={16} /> Add someone
          </button>
        )}
      </section>

      <div><label className="label" htmlFor="h-note">Notes</label><textarea className="input" id="h-note" name="note" rows={2} defaultValue={household.note ?? ""} disabled={readOnly} /></div>
      <FormError error={error ?? del.error} />
      {!readOnly && (
        <div className="flex items-center gap-3">
          <button className="btn btn-primary" disabled={pending}>{pending ? "Saving…" : "Save"}</button>
          {saved && <span className="text-sm text-success">Saved</span>}
          <button type="button" className="btn btn-quiet btn-sm ml-auto" disabled={del.pending} onClick={() => { if (confirm(`Remove ${household.name} from your list?`)) del.run({ householdId: household.id }, () => router.push(`/w/${weddingId}/guests`)); }}>Remove household</button>
        </div>
      )}
    </form>
  );
}

export function RsvpSettings({ weddingId, deadline, meals }: { weddingId: string; deadline: string | null; meals: string[] }) {
  const { run, pending, error } = useAction(saveRsvpSettings);
  return (
    <Sheet label="RSVP settings" title="RSVP settings" buttonClass="btn btn-quiet btn-sm">
      {(close) => (
        <form className="flex flex-col gap-4" action={(fd) => run({ weddingId, deadline: (fd.get("deadline") as string) || null, meals: String(fd.get("meals") ?? "").split("\n").map((m) => m.trim()).filter(Boolean) }, close)}>
          <div><label className="label" htmlFor="r-dl">Reply by</label><input className="input" id="r-dl" name="deadline" type="date" defaultValue={deadline ?? ""} /></div>
          <div><label className="label" htmlFor="r-meals">Meal choices (one per line)</label><textarea className="input" id="r-meals" name="meals" rows={4} defaultValue={meals.join("\n")} placeholder={"Chicken\nFish\nVegetarian"} /></div>
          <FormError error={error} />
          <button className="btn btn-primary" disabled={pending}>{pending ? "Saving…" : "Save"}</button>
        </form>
      )}
    </Sheet>
  );
}

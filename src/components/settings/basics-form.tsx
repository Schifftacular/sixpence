"use client";
import { useState } from "react";
import { searchLocation, updateWedding } from "@/actions/wedding";
import { FormError, useAction } from "@/components/ui/sheet";
import type { GeoResult } from "@/lib/geo";

type W = { id: string; name: string; date: string | null; date_is_estimate: boolean; location_text: string | null; lat: number | null; lng: number | null; guest_estimate: number | null; guest_estimate_is_estimate: boolean; ceremony_time: string | null };

export function BasicsForm({ w, readOnly }: { w: W; readOnly: boolean }) {
  const { run, pending, error } = useAction(updateWedding);
  const search = useAction(searchLocation);
  const [loc, setLoc] = useState<{ text: string; lat: number | null; lng: number | null }>({ text: w.location_text ?? "", lat: w.lat, lng: w.lng });
  const [results, setResults] = useState<GeoResult[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <form className="flex flex-col gap-4" action={(fd) => run({
      weddingId: w.id, name: String(fd.get("name") ?? ""), date: (fd.get("date") as string) || null, dateIsEstimate: fd.get("dateEst") === "on",
      locationText: loc.text || null, lat: loc.lat, lng: loc.lng,
      guests: (fd.get("guests") as string) || null, guestsIsEstimate: fd.get("guestsEst") === "on", ceremonyTime: (fd.get("ceremony") as string) || null,
    }, (d) => setMsg(d.moved ? `Saved. We moved ${d.moved} to-dos to match the new date.` : "Saved."))}>
      <fieldset disabled={readOnly} className="flex flex-col gap-4">
        <div><label className="label" htmlFor="s-name">Wedding name</label><input className="input" id="s-name" name="name" defaultValue={w.name} required maxLength={120} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label" htmlFor="s-date">Date</label><input className="input" id="s-date" name="date" type="date" defaultValue={w.date ?? ""} /></div>
          <div><label className="label" htmlFor="s-cer">Ceremony time</label><input className="input" id="s-cer" name="ceremony" type="time" defaultValue={w.ceremony_time?.slice(0, 5) ?? ""} /></div>
        </div>
        <label className="-mt-2 flex items-center gap-2 text-sm"><input type="checkbox" name="dateEst" defaultChecked={w.date_is_estimate} /> The date is a rough guess</label>
        <div>
          <label className="label" htmlFor="s-loc">Where</label>
          <div className="flex gap-2">
            <input className="input flex-1" id="s-loc" value={loc.text} onChange={(e) => { setLoc({ text: e.target.value, lat: null, lng: null }); setResults([]); }} placeholder="City or town" />
            <button type="button" className="btn btn-secondary btn-sm" disabled={search.pending || loc.text.length < 2} onClick={() => search.run({ q: loc.text }, setResults)}>Find</button>
          </div>
          {results.length > 0 && (
            <ul className="card divide-rows mt-2">
              {results.map((r) => (
                <li key={`${r.lat},${r.lng}`}><button type="button" className="w-full px-4 py-2 text-left text-sm hover:bg-primary-soft" onClick={() => { setLoc({ text: r.label, lat: r.lat, lng: r.lng }); setResults([]); }}>{r.label}</button></li>
              ))}
            </ul>
          )}
          <p className="hint mt-1">{loc.lat != null ? "Explore shows places near here." : "Tap Find and pick your town so Explore can show places near you."}</p>
          <FormError error={search.error} />
        </div>
        <div><label className="label" htmlFor="s-guests">Guests</label><input className="input" id="s-guests" name="guests" inputMode="numeric" defaultValue={w.guest_estimate ?? ""} /></div>
        <label className="-mt-2 flex items-center gap-2 text-sm"><input type="checkbox" name="guestsEst" defaultChecked={w.guest_estimate_is_estimate} /> The guest count is a rough guess</label>
      </fieldset>
      <FormError error={error} />
      {msg && <p className="text-sm text-success" role="status">{msg}</p>}
      {!readOnly && <button className="btn btn-primary self-start" disabled={pending}>{pending ? "Saving…" : "Save"}</button>}
    </form>
  );
}

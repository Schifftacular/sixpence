"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { saveWelcome, searchLocation } from "@/actions/wedding";
import { FormError, useAction } from "@/components/ui/sheet";
import type { GeoResult } from "@/lib/geo";

const STAGES = [
  { key: "just_engaged", label: "Just engaged" },
  { key: "venue_booked", label: "Venue booked" },
  { key: "some_vendors", label: "A few vendors booked" },
  { key: "final_stretch", label: "The final stretch" },
] as const;
const PRIORITIES = [
  { key: "food", label: "Great food" }, { key: "photos", label: "Photos and video" }, { key: "music", label: "Music and dancing" },
  { key: "venue", label: "A beautiful place" }, { key: "attire", label: "How we look" }, { key: "guest_experience", label: "Guests having a great time" },
] as const;

export function WelcomeForm({ weddingId, name, location }: { weddingId: string; name: string; location: { text: string | null; lat: number | null; lng: number | null } }) {
  const router = useRouter();
  const { run, pending, error } = useAction(saveWelcome);
  const search = useAction(searchLocation);
  const [you, setYou] = useState("");
  const [partner, setPartner] = useState("");
  const [loc, setLoc] = useState({ text: location.text ?? "", lat: location.lat, lng: location.lng });
  const [results, setResults] = useState<GeoResult[]>([]);
  const [stage, setStage] = useState<(typeof STAGES)[number]["key"]>("just_engaged");
  const [prio, setPrio] = useState<string[]>([]);
  const toggle = (k: string) => setPrio(prio.includes(k) ? prio.filter((x) => x !== k) : prio.length < 3 ? [...prio, k] : prio);
  const weddingName = you && partner ? `${you} & ${partner}` : name;
  return (
    <form className="flex flex-col gap-6" action={() => run({ weddingId, name: weddingName, displayName: you || undefined, locationText: loc.text || null, lat: loc.lat, lng: loc.lng, stage, priorities: prio }, () => router.push(`/w/${weddingId}`))}>
      <fieldset className="grid grid-cols-2 gap-3">
        <legend className="label">Your names</legend>
        <input className="input" aria-label="Your first name" placeholder="You" value={you} onChange={(e) => setYou(e.target.value)} maxLength={40} />
        <input className="input" aria-label="Your partner's first name" placeholder="Your partner" value={partner} onChange={(e) => setPartner(e.target.value)} maxLength={40} />
      </fieldset>
      <div>
        <label className="label" htmlFor="w-loc">Where&apos;s the wedding? A rough area is fine.</label>
        <div className="flex gap-2">
          <input className="input flex-1" id="w-loc" value={loc.text} onChange={(e) => { setLoc({ text: e.target.value, lat: null, lng: null }); setResults([]); }} placeholder="City or town" />
          <button type="button" className="btn btn-secondary btn-sm" disabled={search.pending || loc.text.length < 2} onClick={() => search.run({ q: loc.text }, setResults)}>Find</button>
        </div>
        {results.length > 0 && (
          <ul className="card divide-rows mt-2">
            {results.map((r) => <li key={`${r.lat},${r.lng}`}><button type="button" className="w-full px-4 py-2 text-left text-sm hover:bg-primary-soft" onClick={() => { setLoc({ text: r.label, lat: r.lat, lng: r.lng }); setResults([]); }}>{r.label}</button></li>)}
          </ul>
        )}
        <FormError error={search.error} />
      </div>
      <fieldset className="flex flex-wrap gap-2">
        <legend className="label">How far along are you?</legend>
        {STAGES.map((s) => <button key={s.key} type="button" aria-pressed={stage === s.key} onClick={() => setStage(s.key)} className={`chip chip-toggle ${stage === s.key ? "chip-success" : ""}`}>{s.label}</button>)}
      </fieldset>
      <fieldset className="flex flex-wrap gap-2">
        <legend className="label">What matters most? Pick up to three.</legend>
        {PRIORITIES.map((p) => <button key={p.key} type="button" aria-pressed={prio.includes(p.key)} onClick={() => toggle(p.key)} className={`chip chip-toggle ${prio.includes(p.key) ? "chip-success" : ""}`}>{p.label}</button>)}
      </fieldset>
      <FormError error={error} />
      <div className="flex gap-3">
        <button className="btn btn-primary" disabled={pending}>{pending ? "Saving…" : "Done"}</button>
        <button type="button" className="btn btn-quiet" onClick={() => router.push(`/w/${weddingId}`)}>Skip for now</button>
      </div>
    </form>
  );
}

"use client";
import { Mail, MessageSquare, Phone } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { addQuote, addVendor, bookVendor, logContact, setVendorStatus, updateVendor } from "@/actions/vendors";
import { FormError, Sheet, useAction } from "@/components/ui/sheet";
import { formatMoney } from "@/lib/money";

const clean = (v: FormDataEntryValue | null) => String(v ?? "").replace(/[$,\s]/g, "");
const str = (v: FormDataEntryValue | null) => String(v ?? "").trim();

export function AddVendor({ weddingId, categories, defaultKey, label = "+ Add a vendor" }: { weddingId: string; categories: { key: string; name: string }[]; defaultKey?: string; label?: string }) {
  const { run, pending, error } = useAction(addVendor);
  const router = useRouter();
  return (
    <Sheet label={label} title="Add a vendor" buttonClass="btn btn-secondary btn-sm">
      {(close) => (
        <form className="flex flex-col gap-4" action={(fd) => run({ weddingId, categoryKey: fd.get("cat"), name: str(fd.get("name")), phone: str(fd.get("phone")), email: str(fd.get("email")), website: str(fd.get("website")) }, (d) => { close(); router.push(`/w/${weddingId}/vendors/${d.id}`); })}>
          <div>
            <label className="label" htmlFor="v-name">Name</label>
            <input className="input" id="v-name" name="name" required maxLength={200} placeholder="Who are you considering?" />
          </div>
          <div>
            <label className="label" htmlFor="v-cat">What for</label>
            <select className="input" id="v-cat" name="cat" defaultValue={defaultKey ?? categories[0]?.key}>
              {categories.map((c) => <option key={c.key} value={c.key}>{c.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label" htmlFor="v-phone">Phone</label><input className="input" id="v-phone" name="phone" type="tel" /></div>
            <div><label className="label" htmlFor="v-email">Email</label><input className="input" id="v-email" name="email" type="email" /></div>
          </div>
          <div><label className="label" htmlFor="v-web">Website</label><input className="input" id="v-web" name="website" type="url" placeholder="https://" /></div>
          <p className="hint">Saving a vendor doesn&apos;t contact them. It&apos;s just your list.</p>
          <FormError error={error} />
          <button className="btn btn-primary" disabled={pending}>{pending ? "Saving…" : "Save vendor"}</button>
        </form>
      )}
    </Sheet>
  );
}

/** Save a public place from Explore into Your vendors as an idea. Never contacts anyone. */
export function SaveFromPlace({ weddingId, placeId, categoryKey, saved, vendorId, readOnly }: { weddingId: string; placeId: string; categoryKey: string; saved?: boolean; vendorId?: string; readOnly?: boolean }) {
  const { run, pending, error } = useAction(addVendor);
  const [id, setId] = useState<string | undefined>(saved ? vendorId : undefined);
  if (id) return <a href={`/w/${weddingId}/vendors/${id}`} className="chip chip-success">Saved ✓</a>;
  if (readOnly) return null;
  return (
    <>
      <button type="button" className="btn btn-secondary btn-sm" disabled={pending} onClick={() => run({ weddingId, placeId, categoryKey }, (d) => setId(d.id))}>
        {pending ? "Saving…" : "Save as idea"}
      </button>
      <FormError error={error} />
    </>
  );
}

export function AddQuote({ vendorId, guests, perGuestDefault }: { vendorId: string; guests: number; perGuestDefault?: boolean }) {
  const { run, pending, error } = useAction(addQuote);
  const [basis, setBasis] = useState<"flat" | "per_guest">(perGuestDefault ? "per_guest" : "flat");
  const [amount, setAmount] = useState("");
  const n = Number(amount.replace(/[$,\s]/g, "")) || 0;
  return (
    <Sheet label="+ Add a quote" title="Add a quote" buttonClass="btn btn-secondary btn-sm">
      {(close) => (
        <form className="flex flex-col gap-4" action={(fd) => run({ vendorId, basis, amount: clean(fd.get("amount")), guests, inclusions: str(fd.get("inc")), expiresOn: str(fd.get("exp")) }, close)}>
          <fieldset className="flex gap-2">
            <legend className="label">How is it priced?</legend>
            <button type="button" className={`chip chip-toggle ${basis === "flat" ? "chip-success" : ""}`} aria-pressed={basis === "flat"} onClick={() => setBasis("flat")}>One price</button>
            <button type="button" className={`chip chip-toggle ${basis === "per_guest" ? "chip-success" : ""}`} aria-pressed={basis === "per_guest"} onClick={() => setBasis("per_guest")}>Per guest</button>
          </fieldset>
          <div>
            <label className="label" htmlFor="q-amt">{basis === "flat" ? "Total" : "Price per guest"}</label>
            <input className="input money" id="q-amt" name="amount" inputMode="decimal" required value={amount} onChange={(e) => setAmount(e.target.value)} />
            {basis === "per_guest" && n > 0 && <p className="hint mt-1">About {formatMoney(n * guests)} for {guests} guests. It updates if your guest count changes.</p>}
          </div>
          <div><label className="label" htmlFor="q-inc">What&apos;s included</label><textarea className="input" id="q-inc" name="inc" rows={3} placeholder="Hours, staff, setup, delivery…" /></div>
          <div><label className="label" htmlFor="q-exp">Good until</label><input className="input" id="q-exp" name="exp" type="date" /></div>
          <FormError error={error} />
          <button className="btn btn-primary" disabled={pending}>{pending ? "Saving…" : "Save quote"}</button>
        </form>
      )}
    </Sheet>
  );
}

const ASKS = [
  { key: "avail", label: "Ask if our date is free", text: "Are you available on our date?" },
  { key: "price", label: "Ask for pricing", text: "Could you share your pricing or packages?" },
  { key: "incl", label: "Ask what's included", text: "What's included, and is anything extra?" },
  { key: "call", label: "Suggest a call", text: "We'd love to find a time to talk." },
];

/** Contact buttons open the couple's own phone or email app. We log it only if they say they reached out. */
export function ContactVendor({ vendor, wedding, readOnly }: {
  vendor: { id: string; name: string; phone: string | null; email: string | null };
  wedding: { names: string; dateText: string; guests: number; place: string };
  readOnly: boolean;
}) {
  const [ticks, setTicks] = useState<Record<string, boolean>>({ avail: true, price: true });
  const [asked, setAsked] = useState(false);
  const { run, pending, error } = useAction(logContact);
  const lines = [
    `Hi ${vendor.name},`,
    "",
    `We're ${wedding.names}, planning our wedding${wedding.dateText ? ` on ${wedding.dateText}` : ""}${wedding.place ? ` in ${wedding.place}` : ""} for about ${wedding.guests} guests.`,
    ...ASKS.filter((a) => ticks[a.key]).map((a) => a.text),
    "",
    "Thank you!",
    wedding.names,
  ];
  const mailto = `mailto:${vendor.email ?? ""}?subject=${encodeURIComponent(`Wedding inquiry${wedding.dateText ? `, ${wedding.dateText}` : ""}`)}&body=${encodeURIComponent(lines.join("\n"))}`;
  const tel = vendor.phone ? vendor.phone.replace(/[^\d+]/g, "") : null;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {tel && <a className="btn btn-secondary btn-sm" href={`tel:${tel}`} onClick={() => setAsked(true)}><Phone size={16} /> Call</a>}
        {tel && <a className="btn btn-secondary btn-sm" href={`sms:${tel}`} onClick={() => setAsked(true)}><MessageSquare size={16} /> Text</a>}
        <Sheet label={<><Mail size={16} /> Email</>} title={`Email ${vendor.name}`} buttonClass="btn btn-secondary btn-sm">
          {(close) => (
            <div className="flex flex-col gap-4">
              <fieldset className="flex flex-col gap-2">
                <legend className="label">What to ask</legend>
                {ASKS.map((a) => (
                  <label key={a.key} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={!!ticks[a.key]} onChange={(e) => setTicks({ ...ticks, [a.key]: e.target.checked })} /> {a.label}
                  </label>
                ))}
              </fieldset>
              <pre className="card card-pad whitespace-pre-wrap font-sans text-sm text-text-muted">{lines.join("\n")}</pre>
              <a className="btn btn-primary" href={mailto} onClick={() => { setAsked(true); close(); }}>Open in my email</a>
              <p className="hint">This opens your own email app. {`Nothing is sent from here.`}</p>
            </div>
          )}
        </Sheet>
      </div>
      {asked && !readOnly && (
        <div className="card card-pad flex flex-col gap-2 bg-primary-soft">
          <p className="text-sm font-medium">Did you reach out?</p>
          <div className="flex flex-wrap gap-2">
            <button className="btn btn-primary btn-sm" disabled={pending} onClick={() => run({ vendorId: vendor.id, channel: "other", followUpDays: 5 }, () => setAsked(false))}>Yes, remind me in 5 days</button>
            <button className="btn btn-quiet btn-sm" onClick={() => setAsked(false)}>Not yet</button>
          </div>
          <FormError error={error} />
        </div>
      )}
    </div>
  );
}

export function LogContact({ vendorId }: { vendorId: string }) {
  const { run, pending, error } = useAction(logContact);
  return (
    <Sheet label="+ Log a conversation" title="Log a conversation" buttonClass="btn btn-quiet btn-sm">
      {(close) => (
        <form className="flex flex-col gap-4" action={(fd) => run({ vendorId, channel: fd.get("ch"), note: str(fd.get("note")), followUpDays: fd.get("fu") }, close)}>
          <div>
            <label className="label" htmlFor="lc-ch">How</label>
            <select className="input" id="lc-ch" name="ch" defaultValue="call">
              <option value="call">Call</option><option value="text">Text</option><option value="email">Email</option><option value="in_person">In person</option><option value="other">Other</option>
            </select>
          </div>
          <div><label className="label" htmlFor="lc-note">Notes</label><textarea className="input" id="lc-note" name="note" rows={3} placeholder="What did you learn?" /></div>
          <div>
            <label className="label" htmlFor="lc-fu">Follow up</label>
            <select className="input" id="lc-fu" name="fu" defaultValue="5">
              <option value="0">No reminder</option><option value="3">In 3 days</option><option value="5">In 5 days</option><option value="14">In 2 weeks</option>
            </select>
          </div>
          <FormError error={error} />
          <button className="btn btn-primary" disabled={pending}>{pending ? "Saving…" : "Save"}</button>
        </form>
      )}
    </Sheet>
  );
}

export function StatusActions({ vendorId, status }: { vendorId: string; status: string }) {
  const { run, pending, error } = useAction(setVendorStatus);
  const [reason, setReason] = useState("");
  return (
    <div className="flex flex-wrap items-center gap-2">
      {status === "passed" ? (
        <button className="btn btn-quiet btn-sm" disabled={pending} onClick={() => run({ vendorId, status: "idea" })}>Bring back</button>
      ) : (
        <Sheet label={status === "booked" ? "Cancel booking" : "Pass on this one"} title={status === "booked" ? "Cancel this booking?" : "Pass on this vendor?"} buttonClass="btn btn-quiet btn-sm">
          {(close) => (
            <div className="flex flex-col gap-4">
              {status === "booked" && <p className="text-sm text-text-muted">Their price stops counting as committed and unpaid payments are removed. Payments you already made stay on record.</p>}
              <div>
                <label className="label" htmlFor="pass-r">Why? (just for you)</label>
                <input className="input" id="pass-r" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Over budget, not our style, booked that day…" />
              </div>
              <FormError error={error} />
              <button className="btn btn-primary" disabled={pending} onClick={() => run({ vendorId, status: "passed", reason }, close)}>{status === "booked" ? "Cancel booking" : "Pass"}</button>
            </div>
          )}
        </Sheet>
      )}
      <FormError error={error} />
    </div>
  );
}

export function EditVendor({ vendor }: { vendor: { id: string; name: string; phone: string | null; email: string | null; website: string | null; address: string | null; notes: string | null; tags: string[]; arrival_time: string | null; onsite_contact: string | null; status: string } }) {
  const { run, pending, error } = useAction(updateVendor);
  return (
    <Sheet label="Edit details" title="Vendor details" buttonClass="btn btn-quiet btn-sm">
      {(close) => (
        <form className="flex flex-col gap-4" action={(fd) => run({
          vendorId: vendor.id, name: str(fd.get("name")), phone: str(fd.get("phone")), email: str(fd.get("email")), website: str(fd.get("website")), address: str(fd.get("address")),
          notes: String(fd.get("notes") ?? ""), tags: str(fd.get("tags")).split(",").map((t) => t.trim()).filter(Boolean),
          arrivalTime: str(fd.get("arrival")), onsiteContact: str(fd.get("onsite")),
        }, close)}>
          <div><label className="label" htmlFor="e-name">Name</label><input className="input" id="e-name" name="name" defaultValue={vendor.name} required /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label" htmlFor="e-phone">Phone</label><input className="input" id="e-phone" name="phone" defaultValue={vendor.phone ?? ""} /></div>
            <div><label className="label" htmlFor="e-email">Email</label><input className="input" id="e-email" name="email" type="email" defaultValue={vendor.email ?? ""} /></div>
          </div>
          <div><label className="label" htmlFor="e-web">Website</label><input className="input" id="e-web" name="website" defaultValue={vendor.website ?? ""} /></div>
          <div><label className="label" htmlFor="e-addr">Address</label><input className="input" id="e-addr" name="address" defaultValue={vendor.address ?? ""} /></div>
          <div><label className="label" htmlFor="e-tags">Tags</label><input className="input" id="e-tags" name="tags" defaultValue={vendor.tags.join(", ")} placeholder="warm, outdoor, responsive" /></div>
          <div><label className="label" htmlFor="e-notes">Notes</label><textarea className="input" id="e-notes" name="notes" rows={4} defaultValue={vendor.notes ?? ""} /></div>
          {vendor.status === "booked" && (
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label" htmlFor="e-arr">Arrives on the day</label><input className="input" id="e-arr" name="arrival" type="time" defaultValue={vendor.arrival_time ?? ""} /></div>
              <div><label className="label" htmlFor="e-on">Contact on the day</label><input className="input" id="e-on" name="onsite" defaultValue={vendor.onsite_contact ?? ""} /></div>
            </div>
          )}
          <FormError error={error} />
          <button className="btn btn-primary" disabled={pending}>{pending ? "Saving…" : "Save"}</button>
        </form>
      )}
    </Sheet>
  );
}

const PRESETS = [
  { key: "half_now", label: "Half now, half before the wedding" },
  { key: "three_equal", label: "Three equal payments" },
  { key: "full_now", label: "All at once, now" },
  { key: "unsure", label: "Not sure yet" },
] as const;

export function BookVendor({ vendorId, vendorName, quotes, guests, planned }: { vendorId: string; vendorName: string; quotes: { id: string; label: string; cost: number }[]; guests: number; planned: number }) {
  const { run, pending, error } = useAction(bookVendor);
  const [quoteId, setQuoteId] = useState<string>(quotes[0]?.id ?? "");
  const [amount, setAmount] = useState("");
  const [basis, setBasis] = useState<"flat" | "per_guest">("flat");
  const cost = quoteId ? quotes.find((q) => q.id === quoteId)?.cost ?? 0 : (Number(amount.replace(/[$,\s]/g, "")) || 0) * (basis === "per_guest" ? guests : 1);
  const diff = cost - planned;
  return (
    <Sheet label="Book this vendor" title={`Book ${vendorName}`} buttonClass="btn btn-primary">
      {(close) => (
        <form className="flex flex-col gap-4" action={(fd) => run({ vendorId, quoteId: quoteId || undefined, amount: quoteId ? undefined : amount.replace(/[$,\s]/g, ""), basis, schedule: fd.get("schedule"), addTasks: fd.get("tasks") === "on" }, close)}>
          <fieldset className="flex flex-col gap-2">
            <legend className="label">Price you agreed</legend>
            {quotes.map((q) => (
              <label key={q.id} className="flex items-center gap-2 text-sm">
                <input type="radio" name="q" checked={quoteId === q.id} onChange={() => setQuoteId(q.id)} /> {q.label}
              </label>
            ))}
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" name="q" checked={!quoteId} onChange={() => setQuoteId("")} /> A different price
            </label>
            {!quoteId && (
              <div className="flex gap-2">
                <input className="input money" aria-label="Price" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} required />
                <select className="input w-auto" aria-label="Priced" value={basis} onChange={(e) => setBasis(e.target.value as "flat" | "per_guest")}>
                  <option value="flat">total</option><option value="per_guest">per guest</option>
                </select>
              </div>
            )}
          </fieldset>
          {cost > 0 && planned > 0 && (
            <p className="text-sm">
              {formatMoney(cost)}.{" "}
              {Math.abs(diff) < 25 ? <span className="text-success">Right on your plan.</span> : diff < 0 ? <span className="text-success">{formatMoney(-diff)} under your plan.</span> : <span className="text-accent-text">{formatMoney(diff)} more than planned. It comes out of Still flexible.</span>}
            </p>
          )}
          <div>
            <label className="label" htmlFor="b-sched">How will you pay?</label>
            <select className="input" id="b-sched" name="schedule" defaultValue="half_now">
              {PRESETS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
            </select>
            <p className="hint mt-1">You can change dates and amounts later in Budget.</p>
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="tasks" defaultChecked /> Add the usual to-dos for this vendor to your plan</label>
          <FormError error={error} />
          <button className="btn btn-primary" disabled={pending}>{pending ? "Booking…" : "Book"}</button>
        </form>
      )}
    </Sheet>
  );
}

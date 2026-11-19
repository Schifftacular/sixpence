import { ExternalLink, MapPin } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { MarkPaid } from "@/components/budget/mark-paid";
import { TaskCheck } from "@/components/plan/task-check";
import { Loading } from "@/components/shell/page-bits";
import { PlanFit, VendorStatusChip } from "@/components/ui/status";
import { AddQuote, BookVendor, ContactVendor, EditVendor, LogContact, StatusActions } from "@/components/vendors/vendor-forms";
import { longDate, shortDate } from "@/lib/dates";
import { formatMoney, quoteCost } from "@/lib/money";
import { CATEGORIES } from "@/lib/plan/templates";
import { createClient } from "@/lib/supabase/server";
import { todayIso } from "@/lib/today";
import { loadWedding } from "@/lib/wedding";

export default function VendorPage({ params }: PageProps<"/w/[weddingId]/vendors/[vendorId]">) {
  return (
    <Suspense fallback={<Loading />}>
      <Vendor params={params} />
    </Suspense>
  );
}

type VendorRow = {
  id: string; name: string; status: string; category_key: string; place_id: string | null; phone: string | null; email: string | null; website: string | null;
  address: string | null; notes: string | null; tags: string[]; pass_reason: string | null; follow_up_on: string | null; arrival_time: string | null; onsite_contact: string | null; booked_at: string | null;
};
const CHANNEL: Record<string, string> = { call: "Call", text: "Text", email: "Email", in_person: "In person", other: "Reached out" };

async function Vendor({ params }: { params: Promise<{ weddingId: string; vendorId: string }> }) {
  const { weddingId, vendorId } = await params;
  const ctx = await loadWedding(weddingId);
  const base = `/w/${weddingId}`;
  const supabase = await createClient();
  const { data: v } = await supabase.from("vendor").select("id,name,status,category_key,place_id,phone,email,website,address,notes,tags,pass_reason,follow_up_on,arrival_time,onsite_contact,booked_at").eq("id", vendorId).eq("wedding_id", weddingId).maybeSingle<VendorRow>();
  if (!v) notFound();
  const [{ data: quotes }, { data: payments }, { data: contacts }, { data: tasks }, { data: cat }] = await Promise.all([
    supabase.from("quote").select("id,total,pricing_basis,per_guest_amount,accepted_at,expires_on,inclusions,created_at").eq("vendor_id", vendorId).order("created_at"),
    supabase.from("payment").select("id,label,amount,due_on,paid_on").eq("vendor_id", vendorId).order("due_on", { nullsFirst: false }),
    supabase.from("vendor_contact").select("id,channel,note,contacted_at").eq("vendor_id", vendorId).order("contacted_at", { ascending: false }),
    supabase.from("task").select("id,title,status,due_date").eq("vendor_id", vendorId).neq("status", "skipped").order("due_date"),
    supabase.from("budget_category").select("id,target_amount").eq("wedding_id", weddingId).eq("key", v.category_key).maybeSingle(),
  ]);
  const meta = CATEGORIES.find((c) => c.key === v.category_key);
  const guests = ctx.wedding.guest_estimate ?? 0;
  const planned = Number(cat?.target_amount ?? 0);
  const today = todayIso();
  const priced = (q: { total: number; pricing_basis: string; per_guest_amount: number | null }) =>
    quoteCost({ total: Number(q.total), pricingBasis: q.pricing_basis as "flat" | "per_guest", perGuestAmount: q.per_guest_amount == null ? null : Number(q.per_guest_amount) }, guests);
  const qs = (quotes ?? []).map((q) => ({ ...q, cost: priced(q) }));
  const accepted = qs.find((q) => q.accepted_at);
  const pays = payments ?? [];
  const paid = pays.filter((p) => p.paid_on).reduce((a, p) => a + Number(p.amount), 0);
  const canMoney = !!ctx.money;
  const mapsQuery = encodeURIComponent([v.name, v.address].filter(Boolean).join(" "));

  return (
    <>
      <Link href={`${base}/vendors/category/${v.category_key}`} className="btn btn-quiet -ml-2 mb-2">← {meta?.name ?? "Your vendors"}</Link>
      <header className="mb-5">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="h-page">{v.name}</h1>
          <VendorStatusChip status={v.status} />
        </div>
        <p className="text-text-muted">
          {meta?.vendorNoun ? meta.vendorNoun[0].toUpperCase() + meta.vendorNoun.slice(1) : ""}
          {v.address ? ` · ${v.address}` : ""}
        </p>
        {v.status === "passed" && v.pass_reason && <p className="mt-1 text-sm text-text-muted">You passed: {v.pass_reason}</p>}
        {v.follow_up_on && v.status !== "booked" && v.status !== "passed" && <p className="mt-1 text-sm">Follow up {v.follow_up_on <= today ? "today" : shortDate(v.follow_up_on)}</p>}
        {v.tags.length > 0 && <div className="mt-2 flex flex-wrap gap-1">{v.tags.map((t) => <span key={t} className="chip chip-muted">{t}</span>)}</div>}
      </header>

      {v.status === "booked" && accepted && canMoney ? (
        <section className="card card-pad mb-5">
          <p className="eyebrow">Booked{v.booked_at ? ` ${shortDate(v.booked_at.slice(0, 10))}` : ""}</p>
          <div className="mt-1 flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <span className="money num-hero">{formatMoney(accepted.cost)}</span>
            <PlanFit cost={accepted.cost} planned={planned} />
          </div>
          {accepted.pricing_basis === "per_guest" && <p className="text-sm text-text-muted money">{formatMoney(Number(accepted.per_guest_amount))} per guest × {guests}. This follows your guest count.</p>}
          <p className="mt-1 text-sm text-text-muted"><span className="money">{formatMoney(paid)}</span> paid · <span className="money">{formatMoney(Math.max(0, accepted.cost - paid))}</span> to go</p>
        </section>
      ) : null}

      {!ctx.readOnly && v.status !== "passed" && (
        <section className="mb-6 flex flex-col gap-3">
          <ContactVendor
            vendor={{ id: v.id, name: v.name, phone: v.phone, email: v.email }}
            wedding={{ names: ctx.wedding.name, dateText: ctx.wedding.date_is_estimate ? "" : longDate(ctx.wedding.date), guests, place: ctx.wedding.location_text ?? "" }}
            readOnly={ctx.readOnly}
          />
          {v.status !== "booked" && canMoney && (
            <div><BookVendor key={qs.map((q) => q.id).join(",")} vendorId={v.id} vendorName={v.name} guests={guests} planned={planned}
              quotes={qs.map((q) => ({ id: q.id, cost: q.cost, label: `${formatMoney(q.cost)}${q.pricing_basis === "per_guest" ? ` (${formatMoney(Number(q.per_guest_amount))} per guest)` : ""}${q.expires_on ? `, good until ${shortDate(q.expires_on)}` : ""}` }))} /></div>
          )}
        </section>
      )}

      {canMoney && (
        <section className="mb-6">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="h-section">Quotes</h2>
            {!ctx.readOnly && v.status !== "passed" && <AddQuote vendorId={v.id} guests={guests} perGuestDefault={!!meta?.perGuest} />}
          </div>
          {qs.length === 0 ? <p className="text-sm text-text-muted">No quotes yet. Ask them for pricing, then add it here to compare.</p> : (
            <ul className="card divide-rows">
              {qs.map((q) => (
                <li key={q.id} className="px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="money font-medium">{formatMoney(q.cost)}{q.pricing_basis === "per_guest" ? <span className="font-normal text-text-muted"> ({formatMoney(Number(q.per_guest_amount))} per guest)</span> : null}</span>
                    {q.accepted_at ? <span className="chip chip-success">Accepted</span> : q.expires_on ? <span className="text-xs text-text-muted">{q.expires_on < today ? "Expired" : `Good until ${shortDate(q.expires_on)}`}</span> : null}
                  </div>
                  {q.inclusions && <p className="mt-1 text-sm text-text-muted">{q.inclusions}</p>}
                  {!q.accepted_at && <div className="mt-1"><PlanFit cost={q.cost} planned={planned} /></div>}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {canMoney && pays.length > 0 && (
        <section className="mb-6">
          <h2 className="h-section mb-2">Payments</h2>
          <ul className="card divide-rows">
            {pays.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <span className="min-w-0 flex-1">
                  <span className="block">{p.label}</span>
                  <span className="block text-text-muted">{p.paid_on ? `Paid ${shortDate(p.paid_on)}` : p.due_on ? `Due ${shortDate(p.due_on)}` : "Date not set"}</span>
                </span>
                <span className="money">{formatMoney(Number(p.amount))}</span>
                {!p.paid_on && !ctx.readOnly && <MarkPaid weddingId={weddingId} today={today} buttonClass="btn btn-quiet btn-sm" payment={{ id: p.id, label: p.label, vendor: v.name, amount: Number(p.amount), due_on: p.due_on }} />}
                {p.paid_on && <span className="chip chip-success">Paid</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {(tasks ?? []).length > 0 && (
        <section className="mb-6">
          <h2 className="h-section mb-2">To-dos for {v.name}</h2>
          <ul className="card divide-rows">
            {(tasks ?? []).map((t) => (
              <li key={t.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                <TaskCheck taskId={t.id} done={t.status === "done"} title={t.title} disabled={ctx.readOnly} />
                {t.due_date && <span className="text-text-muted">{shortDate(t.due_date)}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mb-6">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="h-section">Details</h2>
          {!ctx.readOnly && <EditVendor vendor={v} />}
        </div>
        <dl className="card card-pad grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <dt className="text-text-muted">Phone</dt><dd>{v.phone ? <a className="underline" href={`tel:${v.phone.replace(/[^\d+]/g, "")}`}>{v.phone}</a> : "—"}</dd>
          <dt className="text-text-muted">Email</dt><dd className="break-all">{v.email ?? "—"}</dd>
          <dt className="text-text-muted">Website</dt><dd className="break-all">{v.website ? <a className="inline-flex items-center gap-1 underline" href={v.website} target="_blank" rel="noopener noreferrer">{v.website.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")} <ExternalLink size={12} /></a> : "—"}</dd>
          {v.status === "booked" && <><dt className="text-text-muted">On the day</dt><dd>{v.arrival_time ? `Arrives ${v.arrival_time}` : "Arrival time not set"}{v.onsite_contact ? ` · ${v.onsite_contact}` : ""}</dd></>}
          {v.notes && <><dt className="text-text-muted">Notes</dt><dd className="whitespace-pre-wrap">{v.notes}</dd></>}
        </dl>
        <div className="mt-2 flex flex-wrap gap-3 text-sm">
          <a className="inline-flex items-center gap-1 text-primary hover:underline" href={`https://www.google.com/maps/search/?api=1&query=${mapsQuery}`} target="_blank" rel="noopener noreferrer"><MapPin size={14} /> Map and Google reviews</a>
          {v.place_id && <Link className="text-primary hover:underline" href={`${base}/explore/place/${encodeURIComponent(v.place_id)}`}>See in Explore</Link>}
        </div>
      </section>

      <section className="mb-6">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="h-section">Conversations</h2>
          {!ctx.readOnly && <LogContact vendorId={v.id} />}
        </div>
        {(contacts ?? []).length === 0 ? <p className="text-sm text-text-muted">Nothing logged yet.</p> : (
          <ul className="card divide-rows">
            {(contacts ?? []).map((c) => (
              <li key={c.id} className="px-4 py-3 text-sm">
                <span className="font-medium">{CHANNEL[c.channel] ?? c.channel}</span> <span className="text-text-muted">· {shortDate(String(c.contacted_at).slice(0, 10))}</span>
                {c.note && <p className="mt-1 text-text-muted">{c.note}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>

      {!ctx.readOnly && <StatusActions vendorId={v.id} status={v.status} />}
    </>
  );
}

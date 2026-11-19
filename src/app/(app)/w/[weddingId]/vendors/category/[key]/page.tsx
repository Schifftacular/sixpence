import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Loading } from "@/components/shell/page-bits";
import { EmptyState, PlanFit, VendorStatusChip } from "@/components/ui/status";
import { AddVendor } from "@/components/vendors/vendor-forms";
import { shortDate } from "@/lib/dates";
import { formatMoney, quoteCost } from "@/lib/money";
import { CATEGORIES } from "@/lib/plan/templates";
import { createClient } from "@/lib/supabase/server";
import { todayIso } from "@/lib/today";
import { loadWedding } from "@/lib/wedding";

export default function CategoryVendorsPage({ params }: PageProps<"/w/[weddingId]/vendors/category/[key]">) {
  return (
    <Suspense fallback={<Loading />}>
      <CategoryVendors params={params} />
    </Suspense>
  );
}

type Q = { id: string; total: number; pricing_basis: "flat" | "per_guest"; per_guest_amount: number | null; accepted_at: string | null; expires_on: string | null; inclusions: string | null };
type Row = { id: string; name: string; status: string; tags: string[]; pass_reason: string | null; quote: Q[] };

async function CategoryVendors({ params }: { params: Promise<{ weddingId: string; key: string }> }) {
  const { weddingId, key } = await params;
  const meta = CATEGORIES.find((c) => c.key === key);
  if (!meta) notFound();
  const ctx = await loadWedding(weddingId);
  const base = `/w/${weddingId}`;
  const supabase = await createClient();
  const [{ data: vendors }, { data: cat }] = await Promise.all([
    supabase.from("vendor").select("id,name,status,tags,pass_reason,quote(id,total,pricing_basis,per_guest_amount,accepted_at,expires_on,inclusions)").eq("wedding_id", weddingId).eq("category_key", key).order("created_at").returns<Row[]>(),
    supabase.from("budget_category").select("id,name,target_amount").eq("wedding_id", weddingId).eq("key", key).maybeSingle(),
  ]);
  const guests = ctx.wedding.guest_estimate ?? 0;
  const planned = Number(cat?.target_amount ?? 0);
  const today = todayIso();
  const active = (vendors ?? []).filter((v) => v.status !== "passed");
  const passed = (vendors ?? []).filter((v) => v.status === "passed");
  const priced = (q: Q) => quoteCost({ total: Number(q.total), pricingBasis: q.pricing_basis, perGuestAmount: q.per_guest_amount == null ? null : Number(q.per_guest_amount) }, guests);
  const best = (v: Row) => {
    const acc = v.quote.find((q) => q.accepted_at);
    if (acc) return acc;
    return [...v.quote].sort((a, b) => priced(a) - priced(b))[0] ?? null;
  };
  const name = cat?.name ?? meta.name;

  return (
    <>
      <Link href={`${base}/vendors`} className="btn btn-quiet -ml-2 mb-2">← Your vendors</Link>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h1 className="h-page">{name}</h1>
          <p className="text-text-muted">Your plan: <span className="money">{formatMoney(planned)}</span>{cat ? <> · <Link className="underline" href={`${base}/budget/${cat.id}`}>change</Link></> : null}</p>
        </div>
        {!ctx.readOnly && <AddVendor weddingId={weddingId} categories={[{ key, name }]} defaultKey={key} />}
      </div>

      {active.length === 0 ? (
        <EmptyState title={`No ${meta.vendorNoun}s saved yet`} action={<Link href={`${base}/explore/vendors?cat=${key}`} className="btn btn-primary btn-sm">Find {meta.vendorNoun}s near you</Link>}>
          Save a few you like, ask for quotes, and they&apos;ll line up here side by side.
        </EmptyState>
      ) : (
        <>
          <h2 className="h-section mb-2">Side by side</h2>
          <div className="-mx-4 overflow-x-auto px-4 pb-2">
            <div className="flex gap-3" style={{ minWidth: active.length > 1 ? `${active.length * 15}rem` : undefined }}>
              {active.map((v) => {
                const q = best(v);
                const cost = q ? priced(q) : null;
                return (
                  <article key={v.id} className="card card-pad flex w-60 shrink-0 flex-col gap-2 sm:w-auto sm:flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <Link href={`${base}/vendors/${v.id}`} className="font-medium hover:underline">{v.name}</Link>
                      <VendorStatusChip status={v.status} />
                    </div>
                    {cost != null ? (
                      <>
                        <p className="money text-xl font-semibold">{formatMoney(cost)}</p>
                        {q!.pricing_basis === "per_guest" && <p className="text-xs text-text-muted money">{formatMoney(Number(q!.per_guest_amount))} × {guests} guests</p>}
                        <PlanFit cost={cost} planned={planned} />
                        {q!.inclusions && <p className="text-sm text-text-muted">{q!.inclusions}</p>}
                        {q!.expires_on && !q!.accepted_at && <p className={`text-xs ${q!.expires_on < today ? "text-text-muted line-through" : "text-text-muted"}`}>Good until {shortDate(q!.expires_on)}</p>}
                      </>
                    ) : (
                      <p className="text-sm text-text-muted">No quote yet.</p>
                    )}
                    {v.tags.length > 0 && <div className="flex flex-wrap gap-1">{v.tags.map((t) => <span key={t} className="chip chip-muted">{t}</span>)}</div>}
                    <Link href={`${base}/vendors/${v.id}`} className="btn btn-secondary btn-sm mt-auto">{v.status === "booked" ? "Open" : cost != null ? "Review and book" : "Open"}</Link>
                  </article>
                );
              })}
            </div>
          </div>
        </>
      )}

      {passed.length > 0 && (
        <details className="mt-6">
          <summary className="cursor-pointer text-sm text-text-muted">Passed ({passed.length})</summary>
          <ul className="card divide-rows mt-2">
            {passed.map((v) => (
              <li key={v.id} className="flex items-center justify-between px-4 py-2 text-sm">
                <Link href={`${base}/vendors/${v.id}`} className="hover:underline">{v.name}</Link>
                <span className="text-text-muted">{v.pass_reason ?? ""}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
      <p className="mt-6 text-sm"><Link className="text-primary font-medium hover:underline" href={`${base}/explore/vendors?cat=${key}`}>Find more {meta.vendorNoun}s near you →</Link></p>
    </>
  );
}

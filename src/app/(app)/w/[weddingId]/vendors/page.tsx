import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { Loading, PageTitle } from "@/components/shell/page-bits";
import { EmptyState, VendorStatusChip } from "@/components/ui/status";
import { AddVendor } from "@/components/vendors/vendor-forms";
import { shortDate } from "@/lib/dates";
import { formatMoney, quoteCost } from "@/lib/money";
import { CATEGORIES } from "@/lib/plan/templates";
import { createClient } from "@/lib/supabase/server";
import { todayIso } from "@/lib/today";
import { loadWedding } from "@/lib/wedding";

export default function VendorsPage({ params, searchParams }: PageProps<"/w/[weddingId]/vendors">) {
  return (
    <Suspense fallback={<Loading />}>
      <Vendors params={params} searchParams={searchParams} />
    </Suspense>
  );
}

type Row = { id: string; name: string; status: string; category_key: string; follow_up_on: string | null; quote: { total: number; pricing_basis: "flat" | "per_guest"; per_guest_amount: number | null; accepted_at: string | null; expires_on: string | null }[] };

async function Vendors({ params, searchParams }: { params: Promise<{ weddingId: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { weddingId } = await params;
  const show = (await searchParams).show === "booked" ? "booked" : (await searchParams).show === "deciding" ? "deciding" : "all";
  const ctx = await loadWedding(weddingId);
  const base = `/w/${weddingId}`;
  const supabase = await createClient();
  const [{ data: vendors }, { data: cats }] = await Promise.all([
    supabase.from("vendor").select("id,name,status,category_key,follow_up_on,quote(total,pricing_basis,per_guest_amount,accepted_at,expires_on)").eq("wedding_id", weddingId).order("created_at").returns<Row[]>(),
    supabase.from("budget_category").select("id,key,name,target_amount").eq("wedding_id", weddingId).order("sort"),
  ]);
  const guests = ctx.wedding.guest_estimate ?? 0;
  const today = todayIso();
  const all = vendors ?? [];
  const catList = (cats ?? []).filter((c) => c.key && c.key !== "other");
  const byKey = new Map<string, Row[]>();
  for (const v of all) byKey.set(v.category_key, [...(byKey.get(v.category_key) ?? []), v]);
  const bookedKeys = new Set(all.filter((v) => v.status === "booked").map((v) => v.category_key));
  const visible = catList.filter((c) => {
    const list = byKey.get(c.key!) ?? [];
    if (show === "booked") return bookedKeys.has(c.key!);
    if (show === "deciding") return !bookedKeys.has(c.key!) && list.some((v) => v.status !== "passed");
    return true;
  });
  const nameOf = (k: string) => catList.find((c) => c.key === k)?.name ?? CATEGORIES.find((c) => c.key === k)?.name ?? k;

  const cost = (v: Row) => {
    const qs = v.quote.map((q) => ({ ...q, cost: quoteCost({ total: Number(q.total), pricingBasis: q.pricing_basis, perGuestAmount: q.per_guest_amount == null ? null : Number(q.per_guest_amount) }, guests) }));
    const acc = qs.find((q) => q.accepted_at);
    if (acc) return { label: formatMoney(acc.cost), note: null };
    if (!qs.length) return null;
    const low = Math.min(...qs.map((q) => q.cost));
    const exp = qs.map((q) => q.expires_on).filter((d): d is string => !!d && d >= today).sort()[0];
    return { label: `Quoted ${formatMoney(low)}`, note: exp ? `good until ${shortDate(exp)}` : null };
  };

  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <PageTitle sub={`${bookedKeys.size} of ${catList.length} booked. Saving a vendor never contacts them.`}>Your vendors</PageTitle>
        {!ctx.readOnly && <AddVendor weddingId={weddingId} categories={catList.map((c) => ({ key: c.key!, name: c.name }))} />}
      </div>
      <nav className="mb-4 flex gap-2" aria-label="Filter">
        {(["all", "deciding", "booked"] as const).map((s) => (
          <Link key={s} href={s === "all" ? `${base}/vendors` : `${base}/vendors?show=${s}`} className={`chip chip-toggle ${show === s ? "chip-success" : ""}`} aria-current={show === s ? "page" : undefined}>
            {s === "all" ? "Everything" : s === "deciding" ? "Still deciding" : "Booked"}
          </Link>
        ))}
      </nav>
      {visible.length === 0 ? (
        <EmptyState title={show === "booked" ? "Nothing booked yet" : "Nothing here yet"}>Find people near you in <Link className="underline" href={`${base}/explore`}>Explore</Link>.</EmptyState>
      ) : (
        <div className="flex flex-col gap-4">
          {visible.map((c) => {
            const list = (byKey.get(c.key!) ?? []).filter((v) => v.status !== "passed");
            const passed = (byKey.get(c.key!) ?? []).length - list.length;
            const booked = list.find((v) => v.status === "booked");
            const quotedCount = list.filter((v) => v.quote.length > 0).length;
            return (
              <section key={c.id} className="card">
                <header className="flex items-center justify-between gap-2 px-4 pt-3 pb-2">
                  <Link href={`${base}/vendors/category/${c.key}`} className="h-section hover:underline">{c.name}</Link>
                  <span className="text-sm text-text-muted money">Plan {formatMoney(Number(c.target_amount))}</span>
                </header>
                {list.length === 0 ? (
                  <div className="flex items-center justify-between px-4 pb-3 text-sm">
                    <span className="text-text-muted">No one yet.</span>
                    <Link href={`${base}/explore/vendors?cat=${c.key}`} className="font-medium text-primary hover:underline">Find {nameOf(c.key!).toLowerCase()} near you →</Link>
                  </div>
                ) : (
                  <ul className="divide-rows border-t border-border">
                    {(booked ? [booked] : list).map((v) => {
                      const k = cost(v);
                      return (
                        <li key={v.id}>
                          <Link href={`${base}/vendors/${v.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-primary-soft/50">
                            <span className="min-w-0 flex-1">
                              <span className="block truncate font-medium">{v.name}</span>
                              <span className="block text-sm text-text-muted">
                                {k ? <span className="money">{k.label}</span> : v.follow_up_on ? `Follow up ${shortDate(v.follow_up_on)}` : "No quote yet"}
                                {k?.note ? ` · ${k.note}` : ""}
                              </span>
                            </span>
                            <VendorStatusChip status={v.status} />
                            <ChevronRight size={16} className="text-text-muted" aria-hidden />
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
                {(booked && list.length > 1) || quotedCount > 1 || passed > 0 ? (
                  <p className="border-t border-border px-4 py-2 text-sm text-text-muted">
                    {booked && list.length > 1 ? `${list.length - 1} others considered. ` : ""}
                    {!booked && quotedCount > 1 ? <Link href={`${base}/vendors/category/${c.key}`} className="font-medium text-primary hover:underline">Compare {quotedCount} quotes →</Link> : null}
                    {passed > 0 ? ` ${passed} passed.` : ""}
                  </p>
                ) : null}
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}

import Link from "next/link";
import { Suspense } from "react";
import { AppMenu } from "@/components/shell/app-menu";
import { formatMoney } from "@/lib/money";
import { menuFor } from "@/lib/nav";
import { todayIso } from "@/lib/today";
import { loadWedding } from "@/lib/wedding";

// The app shell for one wedding: menu (five pillars), the "Still flexible" line, the + button.
// Everything personal sits inside Suspense so the route keeps a static shell (cacheComponents).
export default function WeddingLayout({ children, params }: LayoutProps<"/w/[weddingId]">) {
  return (
    <div className="flex min-h-dvh flex-1">
      <Suspense fallback={<ShellFallback />}>
        <Shell params={params}>{children}</Shell>
      </Suspense>
    </div>
  );
}

function ShellFallback() {
  return (
    <div className="flex flex-1 items-center justify-center text-sm text-text-muted" aria-busy="true">
      Opening your plan…
    </div>
  );
}

async function Shell({ params, children }: { params: Promise<{ weddingId: string }>; children: React.ReactNode }) {
  const { weddingId } = await params;
  const ctx = await loadWedding(weddingId);
  const base = `/w/${weddingId}`;
  const items = menuFor({ weddingId, role: ctx.role, weddingDate: ctx.wedding.date, today: todayIso() });
  const flex = ctx.money
    ? ctx.money.stillFlexible >= 0
      ? { label: `Still flexible ${formatMoney(ctx.money.stillFlexible)}`, over: false }
      : { label: `${formatMoney(-ctx.money.stillFlexible)} over plan`, over: true }
    : null;

  return (
    <>
      <AppMenu
        items={items}
        weddingName={ctx.wedding.name}
        stillFlexible={flex}
        budgetHref={`${base}/budget`}
        addHref={ctx.readOnly ? null : `${base}/add`}
        partnerDot={ctx.partnerDot}
      />
      <main className="flex min-w-0 flex-1 flex-col px-4 pb-16 pt-20 sm:px-6 lg:px-10">
        {ctx.wedding.is_sample ? (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-2 rounded-md bg-primary-soft px-4 py-3 text-sm">
            <span>This is a sample wedding, so you can look around but not change anything.</span>
            <Link href="/start" className="font-medium text-primary underline-offset-4 hover:underline">
              Start yours
            </Link>
          </div>
        ) : null}
        <div className="mx-auto w-full max-w-3xl">{children}</div>
      </main>
    </>
  );
}

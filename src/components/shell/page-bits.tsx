import Link from "next/link";
import { brand } from "@/lib/brand";

export function PageTitle({ children, sub }: { children: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h1 className="font-display text-3xl text-text">{children}</h1>
      {sub ? <p className="mt-1 text-text-muted">{sub}</p> : null}
    </div>
  );
}

export function Loading() {
  return <p className="text-sm text-text-muted" aria-busy="true">Loading…</p>;
}

export function EstimateChip() {
  return (
    <span className="ml-2 rounded-pill bg-primary-soft px-2 py-0.5 align-middle text-xs font-normal text-text-muted">
      estimate
    </span>
  );
}

/** Honest placeholder for a pillar that arrives in a later milestone. No fake data. */
export function ComingSoon({ title, what, milestone, back }: { title: string; what: string; milestone: string; back: string }) {
  return (
    <>
      <PageTitle>{title}</PageTitle>
      <div className="rounded-md border border-border bg-surface p-6">
        <p className="text-text">{what}</p>
        <p className="mt-2 text-sm text-text-muted">This part of {brand.name} is being built next ({milestone}).</p>
        <Link href={back} className="mt-4 inline-block text-sm font-medium text-primary underline-offset-4 hover:underline">
          Back to this week
        </Link>
      </div>
    </>
  );
}

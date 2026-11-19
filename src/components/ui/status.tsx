import { formatMoney } from "@/lib/money";

export const VENDOR_STATUS_LABEL: Record<string, string> = {
  idea: "Idea", contacted: "Contacted", quoted: "Quoted", booked: "Booked", passed: "Passed",
};

export function VendorStatusChip({ status }: { status: string }) {
  const cls = status === "booked" ? "chip chip-success" : status === "passed" ? "chip chip-muted" : status === "idea" ? "chip chip-muted" : "chip";
  return <span className={cls}>{VENDOR_STATUS_LABEL[status] ?? status}</span>;
}

/** Money in tabular figures. `over` uses brass, never red. */
export function Money({ value, over, className = "" }: { value: number; over?: boolean; className?: string }) {
  return <span className={`money ${over ? "text-over-plan" : ""} ${className}`}>{formatMoney(value)}</span>;
}

/** "$600 under your plan" / "$900 more than planned" (F5 compare). */
export function PlanFit({ cost, planned }: { cost: number; planned: number }) {
  if (planned <= 0) return null;
  const d = Math.round(cost - planned);
  if (Math.abs(d) < 25) return <span className="text-sm text-success">Right on your plan</span>;
  return d < 0 ? (
    <span className="text-sm text-success">{formatMoney(-d)} under your plan</span>
  ) : (
    <span className="text-sm text-accent-text">{formatMoney(d)} more than planned</span>
  );
}

export function EmptyState({ title, children, action }: { title: string; children?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="card card-pad flex flex-col items-start gap-2">
      <p className="font-medium text-text">{title}</p>
      {children ? <div className="text-sm text-text-muted">{children}</div> : null}
      {action}
    </div>
  );
}

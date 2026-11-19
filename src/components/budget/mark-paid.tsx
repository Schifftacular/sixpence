"use client";
import { markPaid } from "@/actions/payments";
import { FormError, Sheet, useAction } from "@/components/ui/sheet";
import { formatMoney } from "@/lib/money";

export function MarkPaid({ weddingId, payment, today, buttonClass }: {
  weddingId: string;
  payment: { id: string; label: string; vendor: string | null; amount: number; due_on: string | null };
  today: string;
  buttonClass?: string;
}) {
  const { run, pending, error } = useAction(markPaid);
  return (
    <Sheet label="Mark paid" title={`${payment.vendor ?? "Payment"} · ${payment.label}`} buttonClass={buttonClass}>
      {(close) => (
        <form
          className="flex flex-col gap-4"
          action={(fd) => run({ weddingId, paymentId: payment.id, amount: fd.get("amount"), paidOn: fd.get("paidOn") }, close)}
        >
          <p className="text-sm text-text-muted">Scheduled: {formatMoney(payment.amount)}</p>
          <div>
            <label className="label" htmlFor="amount">Amount paid</label>
            <input className="input money" id="amount" name="amount" inputMode="decimal" defaultValue={payment.amount} required />
            <p className="hint mt-1">Paid part of it? Change the amount and we&apos;ll keep the rest on your calendar.</p>
          </div>
          <div>
            <label className="label" htmlFor="paidOn">Date paid</label>
            <input className="input" id="paidOn" name="paidOn" type="date" defaultValue={today} max={today} required />
          </div>
          <FormError error={error} />
          <button className="btn btn-primary" disabled={pending}>{pending ? "Saving…" : "Mark as paid"}</button>
        </form>
      )}
    </Sheet>
  );
}

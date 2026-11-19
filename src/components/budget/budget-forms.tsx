"use client";
import { addCategory, addContribution, setBudgetTotal } from "@/actions/budget";
import { FormError, Sheet, useAction } from "@/components/ui/sheet";

export function BudgetTotal({ weddingId, current, suggested, label }: { weddingId: string; current: number; suggested?: number; label: string }) {
  const { run, pending, error } = useAction(setBudgetTotal);
  return (
    <Sheet label={label} title="Total budget" buttonClass={label === "Raise" ? "btn btn-secondary btn-sm" : "btn btn-secondary btn-sm"}>
      {(close) => (
        <form className="flex flex-col gap-4" action={(fd) => run({ weddingId, total: String(fd.get("total")).replace(/[$,\s]/g, "") }, close)}>
          <div>
            <label className="label" htmlFor="total">What you&apos;re willing to spend in total</label>
            <input className="input money" id="total" name="total" inputMode="numeric" defaultValue={Math.round(suggested ?? current)} required />
            <p className="hint mt-1">Any difference goes into your cushion, so your categories still add up.</p>
          </div>
          <FormError error={error} />
          <button className="btn btn-primary" disabled={pending}>{pending ? "Saving…" : "Save total"}</button>
        </form>
      )}
    </Sheet>
  );
}

export function AddCategory({ weddingId }: { weddingId: string }) {
  const { run, pending, error } = useAction(addCategory);
  return (
    <Sheet label="+ Add a category" title="Add a category" buttonClass="btn btn-quiet">
      {(close) => (
        <form className="flex flex-col gap-4" action={(fd) => run({ weddingId, name: fd.get("name"), amount: String(fd.get("amount") || 0).replace(/[$,\s]/g, "") }, close)}>
          <div>
            <label className="label" htmlFor="cat-name">Name</label>
            <input className="input" id="cat-name" name="name" placeholder="For example, travel for family" required maxLength={80} />
          </div>
          <div>
            <label className="label" htmlFor="cat-amount">Planned amount</label>
            <input className="input money" id="cat-amount" name="amount" inputMode="numeric" placeholder="0" />
          </div>
          <FormError error={error} />
          <button className="btn btn-primary" disabled={pending}>{pending ? "Adding…" : "Add category"}</button>
        </form>
      )}
    </Sheet>
  );
}

export function AddContribution({ weddingId }: { weddingId: string }) {
  const { run, pending, error } = useAction(addContribution);
  return (
    <Sheet label="+ Add who's paying" title="Who's paying" buttonClass="btn btn-quiet">
      {(close) => (
        <form className="flex flex-col gap-4" action={(fd) => run({ weddingId, from: fd.get("from"), amount: String(fd.get("amount")).replace(/[$,\s]/g, "") }, close)}>
          <div>
            <label className="label" htmlFor="c-from">From</label>
            <input className="input" id="c-from" name="from" placeholder="Us, or Sam's parents" required maxLength={80} />
          </div>
          <div>
            <label className="label" htmlFor="c-amount">Amount</label>
            <input className="input money" id="c-amount" name="amount" inputMode="numeric" required />
          </div>
          <FormError error={error} />
          <button className="btn btn-primary" disabled={pending}>{pending ? "Saving…" : "Add"}</button>
        </form>
      )}
    </Sheet>
  );
}

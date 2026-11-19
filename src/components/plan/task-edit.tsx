"use client";
import { MoreHorizontal } from "lucide-react";
import { setTaskStatus, updateTask } from "@/actions/task";
import { FormError, Sheet, useAction } from "@/components/ui/sheet";

export function TaskEdit({ task, members }: {
  task: { id: string; title: string; due_date: string | null; notes: string | null; assignee_member_id: string | null };
  members: { id: string; name: string }[];
}) {
  const { run, pending, error } = useAction(updateTask);
  const skip = useAction(setTaskStatus);
  return (
    <Sheet label={<MoreHorizontal size={18} aria-label={`Edit ${task.title}`} />} title="Task" buttonClass="rounded-sm p-2 text-text-muted hover:bg-primary-soft">
      {(close) => (
        <form className="flex flex-col gap-4" action={(fd) => run({
          taskId: task.id, title: String(fd.get("title") ?? ""), dueDate: (fd.get("due") as string) || null,
          notes: String(fd.get("notes") ?? "") || null, assigneeMemberId: (fd.get("who") as string) || null,
        }, close)}>
          <div><label className="label" htmlFor={`t-${task.id}`}>Task</label><input className="input" id={`t-${task.id}`} name="title" defaultValue={task.title} required maxLength={200} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label" htmlFor={`d-${task.id}`}>When</label><input className="input" id={`d-${task.id}`} name="due" type="date" defaultValue={task.due_date ?? ""} /></div>
            <div>
              <label className="label" htmlFor={`w-${task.id}`}>Who</label>
              <select className="input" id={`w-${task.id}`} name="who" defaultValue={task.assignee_member_id ?? ""}>
                <option value="">Either of us</option>
                {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
          </div>
          <div><label className="label" htmlFor={`n-${task.id}`}>Notes</label><textarea className="input" id={`n-${task.id}`} name="notes" rows={3} defaultValue={task.notes ?? ""} /></div>
          <FormError error={error ?? skip.error} />
          <div className="flex gap-2">
            <button className="btn btn-primary flex-1" disabled={pending}>{pending ? "Saving…" : "Save"}</button>
            <button type="button" className="btn btn-quiet" disabled={skip.pending} onClick={() => skip.run({ taskId: task.id, status: "skipped" }, close)}>Skip it</button>
          </div>
          <p className="hint">Skipping hides it from your plan. You can bring it back any time.</p>
        </form>
      )}
    </Sheet>
  );
}

export function RecoverTask({ taskId }: { taskId: string }) {
  const { run, pending } = useAction(setTaskStatus);
  return <button type="button" className="btn btn-quiet btn-sm" disabled={pending} onClick={() => run({ taskId, status: "todo" })}>Bring back</button>;
}

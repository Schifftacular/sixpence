"use client";
import { useOptimistic, useTransition } from "react";
import { setTaskStatus } from "@/actions/task";

export function TaskCheck({ taskId, done, title, disabled }: { taskId: string; done: boolean; title: string; disabled: boolean }) {
  const [pending, start] = useTransition();
  const [checked, setChecked] = useOptimistic(done);
  return (
    <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 has-disabled:cursor-default">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled || pending}
        onChange={(e) => {
          const next = e.target.checked;
          start(async () => {
            setChecked(next);
            await setTaskStatus({ taskId, status: next ? "done" : "todo" });
          });
        }}
        className="size-5 shrink-0 accent-(--primary)"
      />
      <span className={checked ? "text-text-muted line-through" : "text-text"}>{title}</span>
    </label>
  );
}

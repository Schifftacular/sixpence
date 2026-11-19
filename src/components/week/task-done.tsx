"use client";
import { useTransition } from "react";
import { setTaskStatus } from "@/actions/task";

export function TaskDone({ taskId, label = "Mark done" }: { taskId: string; label?: string }) {
  const [pending, start] = useTransition();
  return (
    <button type="button" className="btn btn-secondary btn-sm" disabled={pending} onClick={() => start(async () => { await setTaskStatus({ taskId, status: "done" }); })}>
      {pending ? "Saving…" : label}
    </button>
  );
}

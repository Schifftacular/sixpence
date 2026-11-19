"use server";
import { refresh } from "next/cache";
import { z } from "zod";
import { actor, canEdit, fail, ok, type ActionResult } from "@/lib/actions";

const SetTaskStatus = z.object({
  taskId: z.uuid(),
  status: z.enum(["todo", "done", "skipped"]),
});

export async function setTaskStatus(input: unknown): Promise<ActionResult> {
  const parsed = SetTaskStatus.safeParse(input);
  if (!parsed.success) return fail("Something went wrong with that task.");
  const { taskId, status } = parsed.data;

  const { supabase, userId } = await actor();
  if (!userId) return fail("Please sign in.");
  const { data: task } = await supabase
    .from("task")
    .select("id,wedding_id,status")
    .eq("id", taskId)
    .maybeSingle<{ id: string; wedding_id: string; status: string }>();
  if (!task || !(await canEdit(supabase, task.wedding_id))) return fail("You can't change this task.");

  const { error } = await supabase.from("task").update({ status }).eq("id", taskId);
  if (error) return fail("We couldn't save that. Please try again.");
  await supabase.rpc("log_activity", {
    w: task.wedding_id,
    p_action: status === "done" ? "task.completed" : "task.updated",
    p_entity_type: "task",
    p_entity_id: taskId,
    p_diff: { status: [task.status, status] },
  });
  refresh();
  return ok(null);
}

const AddTask = z.object({
  weddingId: z.uuid(),
  title: z.string().trim().min(1).max(200),
  dueDate: z.iso.date().nullable().default(null),
});

export async function addTask(input: unknown): Promise<ActionResult<{ taskId: string }>> {
  const parsed = AddTask.safeParse(input);
  if (!parsed.success) return fail("Give the task a short name.");
  const { weddingId, title, dueDate } = parsed.data;

  const { supabase, userId } = await actor();
  if (!userId) return fail("Please sign in.");
  if (!(await canEdit(supabase, weddingId))) return fail("You can't add tasks to this wedding.");

  const { data, error } = await supabase
    .from("task")
    .insert({ wedding_id: weddingId, title, due_date: dueDate, source: "user" })
    .select("id")
    .single<{ id: string }>();
  if (error || !data) return fail("We couldn't add that task. Please try again.");
  await supabase.rpc("log_activity", {
    w: weddingId,
    p_action: "task.added",
    p_entity_type: "task",
    p_entity_id: data.id,
    p_diff: { title },
  });
  refresh();
  return ok({ taskId: data.id });
}

const UpdateTask = z.object({
  taskId: z.uuid(),
  title: z.string().trim().min(1).max(200).optional(),
  dueDate: z.iso.date().nullable().optional(),
  notes: z.string().max(4000).nullable().optional(),
  assigneeMemberId: z.uuid().nullable().optional(),
});

/** Edit a task: rename, move the date, assign to one of you, add notes. */
export async function updateTask(input: unknown): Promise<ActionResult> {
  const parsed = UpdateTask.safeParse(input);
  if (!parsed.success) return fail("Something was off with that task.");
  const { taskId, ...d } = parsed.data;
  const { supabase, userId } = await actor();
  if (!userId) return fail("Please sign in.");
  const { data: task } = await supabase.from("task").select("id,wedding_id").eq("id", taskId).maybeSingle<{ id: string; wedding_id: string }>();
  if (!task || !(await canEdit(supabase, task.wedding_id))) return fail("You can't change this task.");
  const patch: Record<string, unknown> = {};
  if (d.title !== undefined) patch.title = d.title;
  if (d.dueDate !== undefined) patch.due_date = d.dueDate;
  if (d.notes !== undefined) patch.notes = d.notes;
  if (d.assigneeMemberId !== undefined) {
    if (d.assigneeMemberId) {
      const { data: m } = await supabase.from("wedding_member").select("id").eq("id", d.assigneeMemberId).eq("wedding_id", task.wedding_id).maybeSingle();
      if (!m) return fail("That person isn't part of this wedding.");
    }
    patch.assignee_member_id = d.assigneeMemberId;
  }
  const { error } = await supabase.from("task").update(patch).eq("id", taskId);
  if (error) return fail("We couldn't save that. Please try again.");
  await supabase.rpc("log_activity", { w: task.wedding_id, p_action: "task.updated", p_entity_type: "task", p_entity_id: taskId, p_diff: { fields: Object.keys(patch) } });
  refresh();
  return ok(null);
}

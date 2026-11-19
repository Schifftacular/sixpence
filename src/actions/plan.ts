"use server";
import { generatePlan, PlanAnswers } from "@/lib/plan/generate-plan";
import { actor, fail, ok, type ActionResult } from "@/lib/actions";
import { todayIso } from "@/lib/today";

/**
 * Saves the plan from the three-question start. The plan is re-generated here from the answers,
 * so the browser preview never decides what gets stored. Safe to call twice: a person who already
 * owns a wedding gets that wedding back.
 */
export async function savePlan(input: unknown): Promise<ActionResult<{ weddingId: string }>> {
  const parsed = PlanAnswers.safeParse(input);
  if (!parsed.success) return fail("Those answers didn't look right. Please try again.");

  const { supabase, userId } = await actor();
  if (!userId) return fail("Please sign in to save your plan.");

  const { data: existing } = await supabase
    .from("wedding_member")
    .select("wedding_id")
    .eq("user_id", userId)
    .eq("role", "owner")
    .eq("status", "active")
    .limit(1)
    .maybeSingle<{ wedding_id: string }>();
  if (existing) return ok({ weddingId: existing.wedding_id });

  const answers = parsed.data;
  const plan = generatePlan(answers, todayIso());
  const { data, error } = await supabase.rpc("save_plan", {
    p_wedding: {
      name: "Our wedding",
      date: plan.date,
      date_flex: plan.dateFlex,
      date_is_estimate: plan.dateIsEstimate,
      guest_estimate: plan.guests,
      guest_estimate_is_estimate: plan.guestsIsEstimate,
      budget_total: plan.budget,
      budget_is_estimate: plan.budgetIsEstimate,
      location_text: answers.location,
      answers,
    },
    p_categories: plan.categories,
    p_tasks: plan.tasks,
  });
  if (error || !data) return fail("We couldn't save your plan just now. Please try again.");
  return ok({ weddingId: data as string });
}

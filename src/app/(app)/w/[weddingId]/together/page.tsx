import { Suspense } from "react";
import { InviteSomeone, RevokeInvite } from "@/components/together/invite-forms";
import { Loading, PageTitle } from "@/components/shell/page-bits";
import { describeActivity, relativeTime, type ActivityRow } from "@/lib/activity-text";
import { shortDate } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";
import { loadWedding } from "@/lib/wedding";

export default function TogetherPage({ params }: PageProps<"/w/[weddingId]/together">) {
  return (
    <Suspense fallback={<Loading />}>
      <Together params={params} />
    </Suspense>
  );
}

const ROLE: Record<string, string> = { owner: "Planning", collaborator: "Planning", funder: "Helping pay", viewer: "Just looking", vendor: "Vendor" };

async function Together({ params }: { params: Promise<{ weddingId: string }> }) {
  const { weddingId } = await params;
  const ctx = await loadWedding(weddingId);
  const supabase = await createClient();
  const couple = ctx.role === "owner" || ctx.role === "collaborator";
  const [{ data: members }, invRes, { data: acts }, contribRes] = await Promise.all([
    supabase.from("wedding_member").select("id,user_id,role,display_name,created_at").eq("wedding_id", weddingId).eq("status", "active").order("created_at"),
    couple ? supabase.from("invite").select("id,role,label,expires_at,accepted_at").eq("wedding_id", weddingId).is("accepted_at", null).order("created_at", { ascending: false }) : Promise.resolve({ data: [] }),
    supabase.from("activity").select("id,actor_type,actor_id,action,entity_type,entity_id,diff,created_at").eq("wedding_id", weddingId).order("created_at", { ascending: false }).limit(40).returns<ActivityRow[]>(),
    ctx.money ? supabase.from("contribution").select("id,from_label,amount,from_member_id").eq("wedding_id", weddingId).order("created_at") : Promise.resolve({ data: [] }),
  ]);
  const names = new Map((members ?? []).map((m) => [m.user_id as string, (m.display_name as string | null) ?? "Someone"]));
  const who = (a: ActivityRow) => a.actor_type === "guest" ? "A guest" : a.actor_id === ctx.userId ? "You" : names.get(a.actor_id ?? "") ?? (typeof a.diff?.who === "string" ? a.diff.who : "Someone");
  const invites = (invRes.data ?? []).filter((i) => new Date(i.expires_at as string) > new Date());
  const contributions = contribRes.data ?? [];

  if (ctx.role === "funder") {
    const mine = contributions.filter((c) => c.from_member_id === ctx.memberId);
    return (
      <>
        <PageTitle sub="What you're contributing, and where the budget stands.">My contribution</PageTitle>
        <ul className="card divide-rows mb-6">
          {(mine.length ? mine : contributions).map((c) => (
            <li key={c.id} className="flex justify-between px-4 py-3"><span>{c.from_label}</span><span className="money">{formatMoney(Number(c.amount))}</span></li>
          ))}
        </ul>
        <p className="text-sm text-text-muted">To change an amount, talk to the couple. They keep this list.</p>
      </>
    );
  }

  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <PageTitle sub="Who's planning with you, and what's changed.">Together</PageTitle>
        {couple && !ctx.readOnly && <InviteSomeone weddingId={weddingId} />}
      </div>

      <section className="mb-6">
        <h2 className="h-section mb-2">People</h2>
        {(members ?? []).length === 0 ? <p className="text-sm text-text-muted">The sample wedding has no members. In your own wedding, you and your partner appear here.</p> : (
          <ul className="card divide-rows">
            {(members ?? []).map((m) => (
              <li key={m.id} className="flex items-center justify-between px-4 py-3">
                <span className="font-medium">{m.user_id === ctx.userId ? "You" : (m.display_name as string | null) ?? "Partner"}</span>
                <span className="chip chip-muted">{ROLE[m.role as string] ?? m.role}</span>
              </li>
            ))}
          </ul>
        )}
        {(members ?? []).length === 1 && couple && <p className="mt-2 text-sm text-text-muted">Planning is easier with two. Invite your partner and you&apos;ll each see what the other changed.</p>}
      </section>

      {invites.length > 0 && (
        <section className="mb-6">
          <h2 className="h-section mb-2">Waiting to join</h2>
          <ul className="card divide-rows">
            {invites.map((i) => (
              <li key={i.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <span><span className="font-medium">{(i.label as string | null) ?? "Someone"}</span> <span className="text-text-muted">· {ROLE[i.role as string]} · link expires {shortDate(String(i.expires_at).slice(0, 10))}</span></span>
                {!ctx.readOnly && <RevokeInvite inviteId={i.id as string} />}
              </li>
            ))}
          </ul>
          <p className="mt-1 text-xs text-text-muted">For safety, a link is shown only once, when you make it. Make a new one if it got lost.</p>
        </section>
      )}

      <section>
        <h2 className="h-section mb-2">What&apos;s changed</h2>
        {(acts ?? []).length === 0 ? <p className="text-sm text-text-muted">Nothing yet.</p> : (
          <ul className="card divide-rows">
            {(acts ?? []).map((a) => (
              <li key={a.id} className="px-4 py-3 text-sm">
                <span className="font-medium">{who(a)}</span> {describeActivity(a)} <span className="text-text-muted">· {relativeTime(a.created_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

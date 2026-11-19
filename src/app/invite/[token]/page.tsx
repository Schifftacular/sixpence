import type { Metadata } from "next";
import { Suspense } from "react";
import { GoogleSignIn } from "@/components/google-sign-in";
import { AcceptInvite } from "@/components/together/invite-forms";
import { brand } from "@/lib/brand";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "You're invited", robots: { index: false, follow: false } };

export default function InvitePage({ params }: PageProps<"/invite/[token]">) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-bg px-4 py-10 text-text">
      <div className="card card-pad w-full max-w-md text-center">
        <Suspense fallback={<p className="text-text-muted">Loading…</p>}>
          <Invite params={params} />
        </Suspense>
      </div>
    </main>
  );
}

const WHAT: Record<string, string> = {
  collaborator: "plan the wedding with them: budget, guests, vendors and the plan",
  funder: "see the budget and what you're contributing",
  viewer: "see the plan and vendors",
};

async function Invite({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await createClient();
  const valid = /^[a-f0-9]{64}$/.test(token);
  const { data } = valid ? await supabase.rpc("invite_preview", { p_token: token }) : { data: null };
  const inv = (data as { wedding_name: string; role: string; label: string | null; expired: boolean }[] | null)?.[0];
  if (!inv) return <p>This invite link isn&apos;t valid. Ask whoever sent it for a new one.</p>;
  if (inv.expired) return <p>This invite has expired. Ask whoever sent it for a new link.</p>;
  const { data: claims } = await supabase.auth.getClaims();
  const signedIn = !!claims?.claims?.sub;
  return (
    <>
      <p className="eyebrow mb-2">{brand.name}</p>
      <h1 className="font-display text-3xl">{inv.label ? `${inv.label}, you're invited` : "You're invited"}</h1>
      <p className="mt-2 mb-6 text-text-muted">to {WHAT[inv.role] ?? "join"} for <span className="font-medium text-text">{inv.wedding_name}</span>.</p>
      {signedIn ? <AcceptInvite token={token} /> : <GoogleSignIn next={`/invite/${token}`} label="Continue with Google to join" />}
      <p className="mt-6 text-xs text-text-muted">{brand.name} is free for couples.</p>
    </>
  );
}

import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { GoogleSignIn } from "@/components/google-sign-in";
import { SignOut } from "@/components/sign-out";
import { brand } from "@/lib/brand";
import { supabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

/** Signed-in people with a wedding go straight to it; everyone else sees the sign-in box. */
async function AccountBox() {
  if (!supabaseConfigured) return <SignInBox disabled />;
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub as string | undefined;
  if (!userId) return <SignInBox />;

  const { data: member } = await supabase
    .from("wedding_member")
    .select("wedding_id")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle<{ wedding_id: string }>();
  if (member) redirect(`/w/${member.wedding_id}`);

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <span>
        Signed in as <span className="font-medium">{data?.claims?.email as string}</span>. Answer three questions to start your plan.
      </span>
      <SignOut />
    </div>
  );
}

function SignInBox({ disabled }: { disabled?: boolean }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-text-muted">Already planning? Pick up where you left off.</span>
      <GoogleSignIn disabled={disabled} />
    </div>
  );
}

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-8 sm:px-6">
      <header className="flex items-center justify-between">
        <Image src="/brand/sixpence-horizontal.svg" alt={brand.name} width={160} height={40} priority />
      </header>

      <section className="flex flex-1 flex-col justify-center gap-6 py-16">
        <h1 className="font-display text-4xl leading-tight text-text sm:text-5xl">
          Plan your wedding.
          <br />
          Keep the money calm.
        </h1>
        <p className="max-w-xl text-lg text-text-muted">{brand.promise}</p>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href="/start"
            className="inline-flex items-center justify-center rounded-pill bg-primary px-6 py-3 font-medium text-on-primary shadow-float transition hover:opacity-90"
          >
            Start planning
          </Link>
          <Link
            href="/sample"
            className="inline-flex items-center justify-center rounded-pill border border-border bg-surface px-6 py-3 font-medium text-text transition hover:bg-primary-soft"
          >
            Explore a sample wedding
          </Link>
        </div>

        <div className="mt-4 rounded-md border border-border bg-surface p-4 text-sm">
          <Suspense fallback={<SignInBox disabled />}>
            <AccountBox />
          </Suspense>
        </div>
      </section>

      <footer className="py-6 text-xs text-text-muted">
        {brand.name} is free forever. We never sell or share your data.
      </footer>
    </main>
  );
}

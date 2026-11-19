import Image from "next/image";
import Link from "next/link";
import { GoogleSignIn } from "@/components/google-sign-in";
import { SignOut } from "@/components/sign-out";
import { brand } from "@/lib/brand";
import { supabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

async function currentUserEmail(): Promise<string | null> {
  if (!supabaseConfigured) return null;
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return (data?.claims?.email as string | undefined) ?? null;
}

export default async function Home() {
  const email = await currentUserEmail();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-8 sm:px-6">
      <header className="flex items-center justify-between">
        <Image src="/brand/sixpence-horizontal.svg" alt={brand.name} width={160} height={40} priority />
        {email ? <SignOut /> : null}
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
          {email ? (
            <p>
              Signed in as <span className="font-medium">{email}</span>.
            </p>
          ) : (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-text-muted">Already planning? Pick up where you left off.</span>
              <GoogleSignIn disabled={!supabaseConfigured} />
            </div>
          )}
        </div>
      </section>

      <footer className="py-6 text-xs text-text-muted">
        {brand.name} is free forever. We never sell or share your data.
      </footer>
    </main>
  );
}

import type { Metadata } from "next";
import { Suspense } from "react";
import { RsvpCard } from "@/components/guests/rsvp-card";
import { brand } from "@/lib/brand";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "RSVP", robots: { index: false, follow: false } };

export default function RsvpPage({ params }: PageProps<"/rsvp/[token]">) {
  return (
    <main className="min-h-dvh bg-bg px-4 py-10 text-text">
      <Suspense fallback={<p className="text-center text-text-muted">Loading…</p>}>
        <Rsvp params={params} />
      </Suspense>
      <p className="mt-10 text-center text-xs text-text-muted">Sent with {brand.name}</p>
    </main>
  );
}

type Payload = { wedding: { name: string; date: string | null; location: string | null; deadline: string | null; meals: string[] | null }; household: { name: string }; guests: { id: string; firstName: string; attending: boolean | null; meal: string | null; dietary: string | null; isPlusOne: boolean }[] };

async function Rsvp({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  // Public RSVP is off outside production, and the database also requires wedding.outbound_enabled.
  const open = process.env.APP_ENV === "production" && /^[a-f0-9]{32}$/.test(token);
  const supabase = await createClient();
  const { data } = open ? await supabase.rpc("rsvp_household", { p_token: token }) : { data: null };
  const p = data as Payload | null;
  if (!p) return <p className="mx-auto max-w-md text-center text-text-muted">This RSVP link isn&apos;t open. If you were expecting to reply, please check with the couple.</p>;
  return <RsvpCard token={token} household={p.household.name} guests={p.guests}
    wedding={{ name: p.wedding.name, date: p.wedding.date, location: p.wedding.location, deadline: p.wedding.deadline, meals: p.wedding.meals ?? [] }} />;
}

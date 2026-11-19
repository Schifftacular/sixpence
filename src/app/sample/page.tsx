import Link from "next/link";

export const metadata = { title: "Sample wedding" };

// Milestone 1: read-only fictional wedding (wedding.is_sample = true, readable by anyone via RLS).
export default function SamplePage() {
  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-4 py-16 sm:px-6">
      <div className="rounded-md bg-primary-soft px-4 py-3 text-sm">
        This is a sample wedding. <Link href="/start" className="font-medium underline">Start yours.</Link>
      </div>
      <h1 className="mt-8 font-display text-3xl">Jordan &amp; Sam&apos;s wedding</h1>
      <p className="mt-3 text-text-muted">The full sample dashboard arrives in Milestone 1.</p>
    </main>
  );
}

import Link from "next/link";

export const metadata = { title: "Start planning" };

// Milestone 1: three-question start (date, guests, budget) with no account needed.
export default function StartPage() {
  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-4 py-16 sm:px-6">
      <h1 className="font-display text-3xl">Let&apos;s start with three questions</h1>
      <p className="mt-3 text-text-muted">
        Coming next: your date, guest count and budget, each with a &quot;Not sure yet&quot; option.
      </p>
      <Link href="/" className="mt-8 inline-block text-primary underline-offset-4 hover:underline">
        Back
      </Link>
    </main>
  );
}

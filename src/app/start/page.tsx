import Link from "next/link";
import { StartFlow } from "@/components/start/start-flow";
import { supabaseConfigured } from "@/lib/env";

export const metadata = { title: "Start planning" };

// Three questions, no account needed. The plan preview runs in the browser; saving needs Google sign-in.
export default function StartPage() {
  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-4 py-10 sm:px-6">
      <Link href="/" className="text-sm text-text-muted underline-offset-4 hover:underline">← Home</Link>
      <div className="mt-6">
        <StartFlow supabaseReady={supabaseConfigured} />
      </div>
    </main>
  );
}

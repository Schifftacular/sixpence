import Link from "next/link";
import { brand } from "@/lib/brand";

export const metadata = { title: "Help" };

export default function HelpPage() {
  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-4 py-16 sm:px-6">
      <h1 className="font-display text-3xl">Help</h1>
      <p className="mt-3 text-text-muted">
        {brand.name} is free for couples, for good. Your plan is private to you and the people you invite.
      </p>
      <ul className="mt-8 space-y-3">
        <li>
          <Link href="/sample" className="font-medium text-primary underline-offset-4 hover:underline">
            Look around a sample wedding
          </Link>
          <span className="text-text-muted"> to see how a finished plan fits together.</span>
        </li>
        <li>
          <Link href="/" className="font-medium text-primary underline-offset-4 hover:underline">Back to your plan</Link>
        </li>
      </ul>
    </main>
  );
}

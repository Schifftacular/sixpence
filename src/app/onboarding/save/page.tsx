"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { savePlan } from "@/actions/plan";
import { clearStartAnswers, readStartAnswers } from "@/lib/start-storage";

// Lands here after Google sign-in. Sends the stored answers to the server, which rebuilds and saves the plan.
export default function SavePlanPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const answers = readStartAnswers();
    if (!answers) {
      router.replace("/start");
      return;
    }
    savePlan(answers).then((res) => {
      if (res.ok) {
        clearStartAnswers();
        router.replace(`/w/${res.data.weddingId}/welcome`);
      } else setError(res.error);
    });
  }, [router]);

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-4 py-16 sm:px-6">
      {error ? (
        <>
          <p className="text-text">{error}</p>
          <Link href="/start" className="mt-4 text-primary underline-offset-4 hover:underline">Back to your answers</Link>
        </>
      ) : (
        <p className="text-text-muted" aria-busy="true">Saving your plan…</p>
      )}
    </main>
  );
}

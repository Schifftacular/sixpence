import { RsvpForm, type RsvpGuest } from "@/components/guests/rsvp-form";
import { longDate, shortDate } from "@/lib/dates";

export function RsvpCard({ wedding, household, guests, token, preview }: {
  wedding: { name: string; date: string | null; location: string | null; deadline: string | null; meals: string[] };
  household: string; guests: RsvpGuest[]; token: string; preview?: boolean;
}) {
  return (
    <div className="mx-auto max-w-md">
      <header className="mb-6 text-center">
        <p className="eyebrow">You&apos;re invited</p>
        <h1 className="font-display text-4xl">{wedding.name}</h1>
        <p className="mt-2 text-text-muted">{[wedding.date ? longDate(wedding.date) : null, wedding.location].filter(Boolean).join(" · ")}</p>
      </header>
      <p className="mb-4 text-center">Dear {household}, will you join us?{wedding.deadline ? ` Please reply by ${shortDate(wedding.deadline)}.` : ""}</p>
      <RsvpForm token={token} guests={guests} meals={wedding.meals} preview={preview} />
    </div>
  );
}

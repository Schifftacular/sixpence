import Link from "next/link";
import { EmptyState } from "@/components/ui/status";

export function NoLocation({ weddingId }: { weddingId: string }) {
  return (
    <EmptyState title="Where's the wedding?" action={<Link href={`/w/${weddingId}/settings`} className="btn btn-primary btn-sm">Add your city</Link>}>
      Add a city or area and we&apos;ll show venues and vendors near it.
    </EmptyState>
  );
}

export function Back({ href, label = "Explore" }: { href: string; label?: string }) {
  return <Link href={href} className="btn btn-quiet -ml-2 mb-2">← {label}</Link>;
}

export function SourceNote() {
  return (
    <p className="mt-6 text-xs text-text-muted">
      Listings come from public business data (Overture Maps). Order is by distance only: nobody pays to be listed or ranked here. Saving a place never contacts anyone.
    </p>
  );
}

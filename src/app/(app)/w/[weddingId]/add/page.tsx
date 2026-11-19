import { CalendarPlus, CircleDollarSign, Heart, Store, UserPlus } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { Loading, PageTitle } from "@/components/shell/page-bits";

// The + button: one place to add the common things.
export default function AddPage({ params }: PageProps<"/w/[weddingId]/add">) {
  return (
    <Suspense fallback={<Loading />}>
      <Add params={params} />
    </Suspense>
  );
}

async function Add({ params }: { params: Promise<{ weddingId: string }> }) {
  const { weddingId } = await params;
  const base = `/w/${weddingId}`;
  const items = [
    { href: `${base}/plan?add=task`, icon: CalendarPlus, title: "A to-do", sub: "Something to remember" },
    { href: `${base}/guests`, icon: UserPlus, title: "Guests", sub: "Type a household or paste a list" },
    { href: `${base}/vendors`, icon: Store, title: "A vendor", sub: "Someone you're considering" },
    { href: `${base}/budget`, icon: CircleDollarSign, title: "Money", sub: "A payment, who's paying, or a category" },
    { href: `${base}/boards`, icon: Heart, title: "An idea", sub: "A note for your board" },
  ];
  return (
    <>
      <PageTitle>Add</PageTitle>
      <ul className="grid gap-3 sm:grid-cols-2">
        {items.map((i) => (
          <li key={i.title}>
            <Link href={i.href} className="card card-pad card-link flex items-center gap-3">
              <i.icon size={22} className="text-primary" strokeWidth={1.75} aria-hidden />
              <span><span className="block font-medium">{i.title}</span><span className="text-sm text-text-muted">{i.sub}</span></span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}

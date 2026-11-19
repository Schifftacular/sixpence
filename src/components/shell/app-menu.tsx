"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { MenuItem } from "@/lib/nav";

type Props = {
  items: MenuItem[];
  weddingName: string;
  stillFlexible: { label: string; over: boolean } | null;
  budgetHref: string;
  addHref: string | null; // null when read-only
  partnerDot: boolean;
};

function activeItem(items: MenuItem[], pathname: string) {
  // Longest matching href wins, so /plan/day beats /plan and /plan beats Home.
  return [...items]
    .filter((i) => pathname === i.href || pathname.startsWith(`${i.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0];
}

function MenuList({ items, current, partnerDot, onPick }: {
  items: MenuItem[];
  current?: MenuItem;
  partnerDot: boolean;
  onPick?: () => void;
}) {
  const link = (i: MenuItem) => (
    <li key={i.key}>
      <Link
        href={i.href}
        onClick={onPick}
        aria-current={current?.key === i.key ? "page" : undefined}
        className="flex items-center justify-between rounded-sm px-3 py-2 text-text transition hover:bg-primary-soft aria-[current=page]:bg-primary-soft aria-[current=page]:font-medium"
      >
        {i.label}
        {i.key === "together" && partnerDot ? (
          <span className="size-2 rounded-full bg-accent" aria-label="New from your partner" />
        ) : null}
      </Link>
    </li>
  );
  return (
    <nav aria-label="Main" className="flex flex-col gap-4">
      <ul className="flex flex-col gap-1">{items.filter((i) => i.group === "pillar").map(link)}</ul>
      <ul className="flex flex-col gap-1 border-t border-border pt-4 text-sm">
        {items.filter((i) => i.group === "more").map(link)}
      </ul>
    </nav>
  );
}

export function AppMenu({ items, weddingName, stillFlexible, budgetHref, addHref, partnerDot }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const current = activeItem(items, pathname);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      {/* Desktop rail */}
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col gap-6 border-r border-border bg-surface px-4 py-6 lg:flex">
        <Link href="/" className="font-display text-xl text-text">{weddingName}</Link>
        <MenuList items={items} current={current} partnerDot={partnerDot} />
      </aside>

      {/* Header (all sizes) */}
      <header className="fixed inset-x-0 top-0 z-20 flex h-14 items-center gap-3 border-b border-border bg-bg/95 px-4 backdrop-blur lg:left-60">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          aria-expanded={open}
          className="relative -ml-2 rounded-sm p-2 text-text hover:bg-primary-soft lg:hidden"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
            <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          {partnerDot ? <span className="absolute right-1 top-1 size-2 rounded-full bg-accent" /> : null}
        </button>
        <span className="font-medium text-text">{current?.label ?? weddingName}</span>
        <div className="ml-auto flex items-center gap-2">
          {stillFlexible ? (
            <Link
              href={budgetHref}
              className={`rounded-pill px-3 py-1 text-sm transition hover:bg-primary-soft ${stillFlexible.over ? "text-over-plan" : "text-text-muted"}`}
            >
              {stillFlexible.label}
            </Link>
          ) : null}
          {addHref ? (
            <Link
              href={addHref}
              aria-label="Add a task"
              className="inline-flex size-9 items-center justify-center rounded-full bg-primary text-on-primary shadow-float transition hover:opacity-90"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
                <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </Link>
          ) : null}
        </div>
      </header>

      {/* Mobile drawer */}
      {open ? (
        <div className="fixed inset-0 z-30 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button type="button" aria-label="Close menu" className="absolute inset-0 bg-text/30" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col gap-6 overflow-y-auto bg-surface px-4 py-6 shadow-float">
            <span className="font-display text-xl text-text">{weddingName}</span>
            <MenuList items={items} current={current} partnerDot={partnerDot} onPick={() => setOpen(false)} />
          </div>
        </div>
      ) : null}
    </>
  );
}

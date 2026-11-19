"use client";
import { Check, Copy } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { acceptInvite, createInvite, revokeInvite } from "@/actions/together";
import { FormError, Sheet, useAction } from "@/components/ui/sheet";

const ROLES = [
  { key: "collaborator", label: "Plan with us", note: "Your partner or a close helper. Can see and change everything." },
  { key: "funder", label: "Helping pay", note: "Sees the budget and what they're contributing. No guest list." },
  { key: "viewer", label: "Just looking", note: "Can see the plan and vendors, but can't change anything or see money." },
] as const;

export function CopyLink({ url }: { url: string }) {
  const [done, setDone] = useState(false);
  return (
    <button type="button" className="btn btn-secondary btn-sm" onClick={async () => { await navigator.clipboard.writeText(url); setDone(true); setTimeout(() => setDone(false), 2000); }}>
      {done ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy link</>}
    </button>
  );
}

export function InviteSomeone({ weddingId }: { weddingId: string }) {
  const { run, pending, error } = useAction(createInvite);
  const [role, setRole] = useState<(typeof ROLES)[number]["key"]>("collaborator");
  const [link, setLink] = useState<string | null>(null);
  return (
    <Sheet label="+ Invite someone" title="Invite someone" buttonClass="btn btn-primary btn-sm">
      {() => link ? (
        <div className="flex flex-col gap-4">
          <p className="text-sm">Send this link yourself, by text or email. It works once and expires in 30 days.</p>
          <input className="input text-sm" readOnly value={link} onFocus={(e) => e.target.select()} aria-label="Invite link" />
          <CopyLink url={link} />
        </div>
      ) : (
        <form className="flex flex-col gap-4" action={(fd) => run({ weddingId, role, label: String(fd.get("label") ?? "") }, (d) => setLink(`${window.location.origin}/invite/${d.token}`))}>
          <div><label className="label" htmlFor="inv-label">Their name</label><input className="input" id="inv-label" name="label" maxLength={60} placeholder="Sam, or Mom" /></div>
          <fieldset className="flex flex-col gap-2">
            <legend className="label">What they can do</legend>
            {ROLES.map((r) => (
              <label key={r.key} className={`card flex cursor-pointer gap-3 p-3 ${role === r.key ? "border-primary" : ""}`}>
                <input type="radio" name="role" checked={role === r.key} onChange={() => setRole(r.key)} />
                <span><span className="block font-medium">{r.label}</span><span className="text-sm text-text-muted">{r.note}</span></span>
              </label>
            ))}
          </fieldset>
          <FormError error={error} />
          <button className="btn btn-primary" disabled={pending}>{pending ? "Making a link…" : "Make an invite link"}</button>
        </form>
      )}
    </Sheet>
  );
}

export function RevokeInvite({ inviteId }: { inviteId: string }) {
  const { run, pending } = useAction(revokeInvite);
  return <button type="button" className="btn btn-quiet btn-sm" disabled={pending} onClick={() => run({ inviteId })}>Cancel</button>;
}

export function AcceptInvite({ token }: { token: string }) {
  const { run, pending, error } = useAction(acceptInvite);
  const router = useRouter();
  return (
    <div className="flex flex-col items-center gap-2">
      <button type="button" className="btn btn-primary" disabled={pending} onClick={() => run({ token }, (d) => router.push(`/w/${d.weddingId}`))}>{pending ? "Joining…" : "Join"}</button>
      <FormError error={error} />
    </div>
  );
}

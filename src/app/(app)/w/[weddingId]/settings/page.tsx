import { Download } from "lucide-react";
import { Suspense } from "react";
import { BasicsForm } from "@/components/settings/basics-form";
import { Loading, PageTitle } from "@/components/shell/page-bits";
import { SignOut } from "@/components/sign-out";
import { loadWedding } from "@/lib/wedding";

export default function SettingsPage({ params }: PageProps<"/w/[weddingId]/settings">) {
  return (
    <Suspense fallback={<Loading />}>
      <Settings params={params} />
    </Suspense>
  );
}

async function Settings({ params }: { params: Promise<{ weddingId: string }> }) {
  const { weddingId } = await params;
  const ctx = await loadWedding(weddingId);
  const couple = ctx.role === "owner" || ctx.role === "collaborator";
  return (
    <>
      <PageTitle sub="The basics everything else is built on.">Settings</PageTitle>
      <section className="card card-pad mb-6">
        <h2 className="h-section mb-3">Your wedding</h2>
        <BasicsForm w={ctx.wedding} readOnly={ctx.readOnly} />
      </section>
      <section className="card card-pad mb-6 text-sm">
        <h2 className="h-section mb-1">Emails and reminders</h2>
        <p className="text-text-muted">Sending is off while the app is in testing, so nobody gets an email from us: not you, your guests or your vendors. When it&apos;s turned on you&apos;ll choose what you get here.</p>
      </section>
      {couple && (
        <section className="card card-pad mb-6 text-sm">
          <h2 className="h-section mb-1">Your data</h2>
          <p className="mb-3 text-text-muted">Download everything in this wedding as one file. It&apos;s yours.</p>
          <a className="btn btn-secondary btn-sm" href={`/w/${weddingId}/settings/export`} download><Download size={16} /> Download my data</a>
        </section>
      )}
      {ctx.userId && <SignOut />}
    </>
  );
}

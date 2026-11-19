import { ComingSoon } from "@/components/shell/page-bits";
import { SignOut } from "@/components/sign-out";

export default async function Page({ params }: PageProps<"/w/[weddingId]/settings">) {
  const { weddingId } = await params;
  return (
    <>
      <ComingSoon
        title="Settings"
        what="Your wedding's name, date, notifications, and who has access."
        milestone="Milestone 2"
        back={`/w/${weddingId}`}
      />
      <div className="mt-6">
        <SignOut />
      </div>
    </>
  );
}

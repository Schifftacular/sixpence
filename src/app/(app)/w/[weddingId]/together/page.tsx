import { ComingSoon } from "@/components/shell/page-bits";

export default async function Page({ params }: PageProps<"/w/[weddingId]/together">) {
  const { weddingId } = await params;
  return (
    <ComingSoon
      title="Together"
      what="Invite your partner and family, choose what each person can see, and follow what changed."
      milestone="Milestone 2"
      back={`/w/${weddingId}`}
    />
  );
}

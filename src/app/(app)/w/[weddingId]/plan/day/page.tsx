import { ComingSoon } from "@/components/shell/page-bits";

export default async function Page({ params }: PageProps<"/w/[weddingId]/plan/day">) {
  const { weddingId } = await params;
  return (
    <ComingSoon
      title="The Day"
      what="A run-of-show for the day itself: who is where, when, and who to call."
      milestone="Milestone 8"
      back={`/w/${weddingId}`}
    />
  );
}

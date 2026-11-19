import { ComingSoon } from "@/components/shell/page-bits";

export default async function Page({ params }: PageProps<"/w/[weddingId]/vendors">) {
  const { weddingId } = await params;
  return (
    <ComingSoon
      title="Your vendors"
      what="The vendors you are considering and have booked: quotes side by side and every payment due, all feeding your budget."
      milestone="Milestone 4"
      back={`/w/${weddingId}`}
    />
  );
}

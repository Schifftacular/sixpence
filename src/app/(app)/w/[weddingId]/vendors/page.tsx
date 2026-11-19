import { ComingSoon } from "@/components/shell/page-bits";

export default async function Page({ params }: PageProps<"/w/[weddingId]/vendors">) {
  const { weddingId } = await params;
  return (
    <ComingSoon
      title="Vendors"
      what="Quotes side by side, what you've booked, and every payment due, all feeding your budget."
      milestone="Milestone 4"
      back={`/w/${weddingId}`}
    />
  );
}

import { ComingSoon } from "@/components/shell/page-bits";

export default async function Page({ params }: PageProps<"/w/[weddingId]/guests">) {
  const { weddingId } = await params;
  return (
    <ComingSoon
      title="Guests"
      what="Your guest list, households, RSVPs and meal choices, with the cost of each guest shown as you go."
      milestone="Milestone 6"
      back={`/w/${weddingId}`}
    />
  );
}

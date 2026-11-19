import { ComingSoon } from "@/components/shell/page-bits";

export default async function Page({ params }: PageProps<"/w/[weddingId]/boards">) {
  const { weddingId } = await params;
  return (
    <ComingSoon
      title="Boards"
      what="Ideas and vendors you've saved from Explore, grouped however you like."
      milestone="Explore, part 2"
      back={`/w/${weddingId}`}
    />
  );
}

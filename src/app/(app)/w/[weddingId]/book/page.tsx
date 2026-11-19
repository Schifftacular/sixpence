import { ComingSoon } from "@/components/shell/page-bits";

export default async function Page({ params }: PageProps<"/w/[weddingId]/book">) {
  const { weddingId } = await params;
  return (
    <ComingSoon
      title="Wedding book"
      what="Every document, contract and receipt in one place, read for you and filed automatically."
      milestone="Milestone 1b"
      back={`/w/${weddingId}`}
    />
  );
}

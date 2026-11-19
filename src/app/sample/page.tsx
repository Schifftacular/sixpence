import { redirect } from "next/navigation";
import { SAMPLE_WEDDING_ID } from "@/lib/sample";

// The sample wedding runs in the real shell, read-only (wedding.is_sample, readable by anyone via RLS).
export default function SamplePage() {
  redirect(`/w/${SAMPLE_WEDDING_ID}`);
}

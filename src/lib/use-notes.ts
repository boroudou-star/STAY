"use client";

import { useRouter } from "next/navigation";
import { useStay } from "@/lib/store";
import type { FeedItem } from "@/lib/types";

/** Opens the article/podcast in a new tab and the matching notes page in STAY. */
export function useOpenWithNotes() {
  const router = useRouter();
  const startReadingNote = useStay((s) => s.startReadingNote);
  return (item: FeedItem) => {
    const id = startReadingNote(item);
    if (item.url) window.open(item.url, "_blank", "noopener,noreferrer");
    router.push(`/insights/notes/${id}`);
  };
}

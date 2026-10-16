"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Logo } from "@/components/logo";
import { switchSlot } from "@/lib/store";

/**
 * A shareable one-click link to the demo: /demo opens Alex's fictional plan with no sign-up.
 * Anyone's own account and data are untouched.
 */
export default function DemoLink() {
  const router = useRouter();
  useEffect(() => {
    let cancelled = false;
    switchSlot("demo").then(() => {
      if (!cancelled) router.replace("/dashboard");
    });
    return () => {
      cancelled = true;
    };
  }, [router]);
  return (
    <div className="map-paper flex min-h-screen flex-col items-center justify-center gap-4 px-5 text-center">
      <Logo />
      <p className="text-[15px] text-ink-2">Opening the demo…</p>
    </div>
  );
}

"use client";

import { Map } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { Button, EmptyState, LinkButton, Skeleton } from "@/components/ui";
import { useHydrated, useStay } from "@/lib/store";

export default function AppLayout({ children }: { children: ReactNode }) {
  const hydrated = useHydrated();
  const profile = useStay((s) => s.profile);
  const loadDemo = useStay((s) => s.loadDemo);
  const router = useRouter();

  if (!hydrated) {
    return (
      <AppShell>
        <div className="space-y-4">
          <Skeleton className="h-10 w-72" />
          <div className="grid gap-4 md:grid-cols-3">
            <Skeleton className="h-48 md:col-span-2" />
            <Skeleton className="h-48" />
          </div>
          <Skeleton className="h-40" />
        </div>
      </AppShell>
    );
  }

  if (!profile) {
    return (
      <AppShell>
        <EmptyState
          icon={<Map />}
          title="No roadmap yet"
          body="Answer a few questions to build your personalised plan, or explore with the fictional demo profile."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <LinkButton href="/onboarding">Build my roadmap</LinkButton>
              <Button
                variant="secondary"
                onClick={() => {
                  loadDemo();
                  router.refresh();
                }}
              >
                Try the demo
              </Button>
            </div>
          }
        />
      </AppShell>
    );
  }

  return <AppShell>{children}</AppShell>;
}

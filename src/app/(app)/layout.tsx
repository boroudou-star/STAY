"use client";

import { LogIn, Map } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { Button, EmptyState, LinkButton, Skeleton } from "@/components/ui";
import { switchSlot, useAccount, useHydrated, useStay } from "@/lib/store";

export default function AppLayout({ children }: { children: ReactNode }) {
  const hydrated = useHydrated();
  const profile = useStay((s) => s.profile);
  const router = useRouter();
  const account = useAccount();
  const tryDemo = async () => {
    await switchSlot("demo");
    router.refresh();
  };

  if (!hydrated || account === undefined) {
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

  if (!profile && !account) {
    return (
      <AppShell>
        <EmptyState
          icon={<LogIn />}
          title="You're logged out"
          body="Sign in to pick up your plan, create an account to start one, or explore STAY with the fictional demo profile."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <LinkButton href="/signin">Sign in</LinkButton>
              <LinkButton href="/signup" variant="secondary">
                Create an account
              </LinkButton>
              <Button variant="ghost" onClick={tryDemo}>
                Try the demo
              </Button>
            </div>
          }
        />
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
              <Button variant="secondary" onClick={tryDemo}>
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

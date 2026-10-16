"use client";

import { ArrowRight, Eye, EyeOff, Info, Loader2, LogOut } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { AuthError, createAccount, MIN_PASSWORD, signIn, type AccountInfo } from "@/lib/accounts";
import { claimLegacyData } from "@/lib/persistence";
import { signOut, switchSlot, useAccount, useDeviceAccounts, useLegacyPlan } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Logo } from "./logo";
import { Button, Checkbox, Input, Label, Skeleton } from "./ui";

type Field = AuthError["field"];

export function Avatar({ name, className }: { name: string; className?: string }) {
  return (
    <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal to-blue font-display text-sm font-bold text-white", className)}>
      {(name.trim() || "?").slice(0, 1).toUpperCase()}
    </div>
  );
}

export function PasswordField({
  id,
  label,
  value,
  onChange,
  autoComplete,
  error,
  hint,
  inputRef,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: "current-password" | "new-password";
  error?: string;
  hint?: string;
  inputRef?: React.Ref<HTMLInputElement>;
}) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <Label htmlFor={id} hint={hint}>
        {label}
      </Label>
      <div className="relative">
        <Input
          id={id}
          ref={inputRef}
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          className={cn("pr-11", error && "border-red-300")}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted hover:text-ink"
          aria-label={show ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
        >
          {show ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      </div>
      <FieldError id={id} message={error} />
    </div>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={`${id}-error`} role="alert" className="mt-1.5 text-[12.5px] font-medium text-red-600">
      {message}
    </p>
  );
}

function Shell({ title, subtitle, children, footer }: { title: string; subtitle: ReactNode; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="map-paper min-h-screen">
      <header className="mx-auto flex h-16 max-w-md items-center px-5">
        <Link href="/">
          <Logo />
        </Link>
      </header>
      <main className="mx-auto max-w-md px-5 pb-16 pt-4">
        <div className="animate-fade-up rounded-[28px] border border-line bg-card p-6 shadow-[var(--shadow-lift)] sm:p-8">
          <h1 className="font-display text-[26px] font-semibold leading-tight sm:text-3xl">{title}</h1>
          <div className="mt-2 text-[14.5px] text-ink-2">{subtitle}</div>
          <div className="mt-6">{children}</div>
        </div>
        {footer && <div className="mt-6 space-y-2 text-center text-[13.5px] text-muted">{footer}</div>}
      </main>
    </div>
  );
}

/** Shown on the sign-in / sign-up pages when someone is already signed in. */
function AlreadySignedIn({ account, action }: { account: AccountInfo; action: string }) {
  const router = useRouter();
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 rounded-2xl border border-line bg-paper p-3.5">
        <Avatar name={account.name} />
        <div className="min-w-0">
          <div className="truncate text-[14px] font-semibold">{account.name}</div>
          <div className="truncate text-[12.5px] text-muted">{account.email}</div>
        </div>
      </div>
      <Button
        className="w-full"
        size="lg"
        onClick={async () => {
          const has = await switchSlot("mine");
          router.push(has ? "/dashboard" : "/onboarding");
        }}
      >
        Continue as {account.name.split(" ")[0]} <ArrowRight size={16} />
      </Button>
      <Button
        variant="secondary"
        className="w-full"
        size="lg"
        onClick={async () => {
          await signOut();
          toast(`Logged out of ${account.email}`);
        }}
      >
        <LogOut size={16} /> Log out and {action}
      </Button>
    </div>
  );
}

const DemoLink = () => {
  const router = useRouter();
  return (
    <p>
      Just looking?{" "}
      <button
        className="font-semibold text-ink underline underline-offset-2"
        onClick={async () => {
          await switchSlot("demo");
          router.push("/dashboard");
        }}
      >
        Try the demo
      </button>{" "}
      without an account.
    </p>
  );
};

const DeviceNote = () => (
  <p className="flex items-start justify-center gap-1.5 text-[12.5px]">
    <Info size={14} className="mt-0.5 shrink-0" />
    <span>Accounts are saved in this browser. To use STAY on another device, download your data from Profile and restore it there.</span>
  </p>
);

/* ---------------- Sign in ---------------- */

export function SignInScreen() {
  const account = useAccount();
  const accounts = useDeviceAccounts();
  const router = useRouter();
  const uid = useId();
  const pwRef = useRef<HTMLInputElement>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<{ field: Field; message: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [forgot, setForgot] = useState(false);

  if (account === undefined || accounts === undefined)
    return (
      <Shell title="Sign in" subtitle="Welcome back.">
        <Skeleton className="h-64" />
      </Shell>
    );

  if (account) {
    return (
      <Shell title="You're signed in" subtitle="Carry on with your plan, or log out to sign in to a different account.">
        <AlreadySignedIn account={account} action="switch account" />
      </Shell>
    );
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const a = await signIn(email, password);
      const has = await switchSlot("mine");
      toast.success(`Welcome back, ${a.name.split(" ")[0]}`);
      router.push(has ? "/dashboard" : "/onboarding");
    } catch (err) {
      setError(err instanceof AuthError ? { field: err.field, message: err.message } : { field: undefined, message: "Something went wrong. Try again." });
      setBusy(false);
    }
  };

  return (
    <Shell
      title="Sign in"
      subtitle="Welcome back. Pick up your plan where you left it."
      footer={
        <>
          <p>
            New to STAY?{" "}
            <Link href="/signup" className="font-semibold text-ink underline underline-offset-2">
              Create an account
            </Link>
          </p>
          <DemoLink />
          <DeviceNote />
        </>
      }
    >
      {accounts.length > 0 && (
        <div className="mb-5">
          <div className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-muted">Accounts on this device</div>
          <div className="space-y-1.5">
            {accounts.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => {
                  setEmail(a.email);
                  setError(null);
                  pwRef.current?.focus();
                }}
                className={cn(
                  "flex w-full items-center gap-3 rounded-2xl border p-2.5 text-left transition-colors",
                  email.trim().toLowerCase() === a.email ? "border-ink/40 bg-paper" : "border-line hover:bg-paper",
                )}
              >
                <Avatar name={a.name} className="h-8 w-8" />
                <span className="min-w-0">
                  <span className="block truncate text-[13.5px] font-semibold">{a.name}</span>
                  <span className="block truncate text-[12px] text-muted">{a.email}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={submit} className="space-y-4" noValidate>
        <div>
          <Label htmlFor={`${uid}-email`}>Email</Label>
          <Input
            id={`${uid}-email`}
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={error?.field === "email"}
            className={cn(error?.field === "email" && "border-red-300")}
          />
          <FieldError id={`${uid}-email`} message={error?.field === "email" ? error.message : undefined} />
        </div>
        <PasswordField
          id={`${uid}-password`}
          label="Password"
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
          inputRef={pwRef}
          error={error?.field === "password" ? error.message : undefined}
        />
        {error && !error.field && <FieldError id={`${uid}-form`} message={error.message} />}
        <Button type="submit" size="lg" className="w-full" disabled={busy}>
          {busy ? <Loader2 size={16} className="animate-spin" /> : null} Sign in
        </Button>
      </form>

      <button type="button" onClick={() => setForgot((f) => !f)} className="mt-4 text-[13px] font-semibold text-blue hover:underline" aria-expanded={forgot}>
        Forgot your password?
      </button>
      {forgot && (
        <p className="mt-2 rounded-2xl bg-paper p-3 text-[13px] text-ink-2">
          STAY accounts are saved only in this browser, so there&apos;s no email reset yet. If you downloaded your data from Profile, create a new account and use{" "}
          <b>Restore from a file</b> to get your plan back.
        </p>
      )}
    </Shell>
  );
}

/* ---------------- Sign up ---------------- */

export function SignUpScreen() {
  const account = useAccount();
  const legacy = useLegacyPlan();
  const router = useRouter();
  const uid = useId();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [keepLegacy, setKeepLegacy] = useState(true);
  const [error, setError] = useState<{ field: Field; message: string } | null>(null);
  const [busy, setBusy] = useState(false);

  if (account === undefined || legacy === undefined)
    return (
      <Shell title="Create your account" subtitle="Free, and about 5 minutes to your first plan.">
        <Skeleton className="h-80" />
      </Shell>
    );

  if (account) {
    return (
      <Shell title="You're signed in" subtitle="To create another account, log out of this one first. Your plan stays saved for next time.">
        <AlreadySignedIn account={account} action="create another account" />
      </Shell>
    );
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const a = await createAccount({ name: name || legacy?.name || "", email, password, confirm });
      if (legacy && keepLegacy) claimLegacyData(a.id);
      const has = await switchSlot("mine");
      toast.success(`Welcome to STAY, ${a.name.split(" ")[0]}`, { description: has ? "Your existing plan is now saved to this account." : "Next: a few questions to build your plan." });
      router.push(has ? "/dashboard" : "/onboarding");
    } catch (err) {
      setError(err instanceof AuthError ? { field: err.field, message: err.message } : { field: undefined, message: "Something went wrong. Try again." });
      setBusy(false);
    }
  };

  const fieldErr = (f: Field) => (error?.field === f ? error?.message : undefined);

  return (
    <Shell
      title="Create your account"
      subtitle="Free, and about 5 minutes to your first plan. Your account keeps your plan separate from anyone else using this browser."
      footer={
        <>
          <p>
            Already have an account?{" "}
            <Link href="/signin" className="font-semibold text-ink underline underline-offset-2">
              Sign in
            </Link>
          </p>
          <DemoLink />
          <DeviceNote />
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        <div>
          <Label htmlFor={`${uid}-name`}>Your name</Label>
          <Input
            id={`${uid}-name`}
            autoComplete="name"
            value={name}
            placeholder={legacy?.name || ""}
            onChange={(e) => setName(e.target.value)}
            aria-invalid={error?.field === "name"}
            className={cn(error?.field === "name" && "border-red-300")}
          />
          <FieldError id={`${uid}-name`} message={fieldErr("name")} />
        </div>
        <div>
          <Label htmlFor={`${uid}-email`}>Email</Label>
          <Input
            id={`${uid}-email`}
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={error?.field === "email"}
            className={cn(error?.field === "email" && "border-red-300")}
          />
          <FieldError id={`${uid}-email`} message={fieldErr("email")} />
        </div>
        <PasswordField
          id={`${uid}-password`}
          label="Password"
          hint={`${MIN_PASSWORD}+ characters, with a number or symbol`}
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          error={fieldErr("password")}
        />
        <PasswordField id={`${uid}-confirm`} label="Confirm password" value={confirm} onChange={setConfirm} autoComplete="new-password" error={fieldErr("confirm")} />

        {legacy && (
          <div className="rounded-2xl border border-teal/20 bg-teal-soft p-3.5 text-[13px]">
            <div className="flex items-start gap-2.5">
              <Checkbox checked={keepLegacy} onChange={() => setKeepLegacy((k) => !k)} label={`Keep the plan already in this browser${legacy.name ? ` for ${legacy.name}` : ""}`} />
              <div>
                <button type="button" onClick={() => setKeepLegacy((k) => !k)} className="text-left font-semibold">
                  Keep the plan already in this browser{legacy.name ? ` for ${legacy.name}` : ""}
                </button>
                <p className="mt-0.5 text-ink-2">It was made before accounts existed. Leave this ticked and it moves into your new account.</p>
              </div>
            </div>
          </div>
        )}

        {error && !error.field && <FieldError id={`${uid}-form`} message={error.message} />}
        <Button type="submit" size="lg" className="w-full" disabled={busy}>
          {busy ? <Loader2 size={16} className="animate-spin" /> : null} Create account
        </Button>
      </form>
    </Shell>
  );
}

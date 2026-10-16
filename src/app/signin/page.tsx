import type { Metadata } from "next";
import { SignInScreen } from "@/components/auth";

export const metadata: Metadata = { title: "Sign in · STAY" };

export default function SignInPage() {
  return <SignInScreen />;
}

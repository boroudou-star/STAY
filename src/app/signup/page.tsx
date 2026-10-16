import type { Metadata } from "next";
import { SignUpScreen } from "@/components/auth";

export const metadata: Metadata = { title: "Create your account · STAY" };

export default function SignUpPage() {
  return <SignUpScreen />;
}

import { Suspense } from "react";
import { AuthForm } from "@/components/AuthForm";
import { AuthShell } from "@/components/AuthShell";

export const metadata = { title: "Log in" };

export default function Page() {
  return (
    <AuthShell title="Welcome back" subtitle="Log in to manage your chatbots.">
      <Suspense>
        <AuthForm mode="login" />
      </Suspense>
    </AuthShell>
  );
}

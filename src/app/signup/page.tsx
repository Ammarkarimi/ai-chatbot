import { Suspense } from "react";
import { AuthForm } from "@/components/AuthForm";
import { Logo } from "@/components/Logo";

export const metadata = { title: "Sign up" };

export default function Page() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center"><Logo /></div>
        <h1 className="text-center text-2xl font-bold">Create your account</h1>
        <p className="mb-6 mt-2 text-center text-sm text-slate-600">Free forever for your first chatbot.</p>
        <Suspense>
          <AuthForm mode="signup" />
        </Suspense>
      </div>
    </main>
  );
}

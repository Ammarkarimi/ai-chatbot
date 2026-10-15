import { NewBotForm } from "@/components/NewBotForm";

export const metadata = { title: "New chatbot" };

export default function NewBotPage() {
  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-2xl font-bold">Create a chatbot</h1>
      <p className="mb-6 mt-1 text-sm text-slate-600">Next you&apos;ll upload the documents it should learn from.</p>
      <NewBotForm />
    </div>
  );
}

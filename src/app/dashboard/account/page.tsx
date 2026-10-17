import { requireUser } from "@/lib/auth";
import { getPlan } from "@/lib/plans";
import { ChangePasswordForm, DeleteAccount, ProfileForm } from "@/components/AccountForms";

export const metadata = { title: "Account" };

export default async function AccountPage() {
  const user = await requireUser();
  const paid = user.plan !== "free" && Boolean(user.stripeSubscriptionId);
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Account</h1>
        <p className="mt-1 text-sm text-slate-600">Manage your profile, password and account.</p>
      </div>
      <ProfileForm name={user.name} email={user.email} />
      <ChangePasswordForm />
      <DeleteAccount email={user.email} paidPlanName={paid ? getPlan(user.plan).name : null} />
    </div>
  );
}

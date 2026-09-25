import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { NewEpisodeForm } from "@/components/episode/NewEpisodeForm";

export default async function NewEpisodePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  if (user.role !== "reviewer") {
    return <p className="text-sm text-slate-600">Only discharge reviewers can start an episode.</p>;
  }
  return (
    <div className="mx-auto max-w-xl space-y-4">
      <h1 className="text-2xl font-semibold">New discharge episode</h1>
      <p className="text-sm text-slate-600">
        Use a fictional patient. After creating the episode you will upload or paste the discharge document, invite the
        care circle, and record consent before anything can be published.
      </p>
      <NewEpisodeForm />
    </div>
  );
}

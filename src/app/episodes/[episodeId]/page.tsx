import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { DomainError } from "@/lib/domain";
import { getEpisodeView } from "@/lib/services/plan";
import { isDemoMode, getClockOffsetMinutes } from "@/lib/clock";
import { EpisodeWorkspace } from "@/components/episode/EpisodeWorkspace";

export default async function EpisodePage({ params }: { params: Promise<{ episodeId: string }> }) {
  const { episodeId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/");
  try {
    const view = await getEpisodeView(user, episodeId);
    const offsetMinutes = await getClockOffsetMinutes();
    return <EpisodeWorkspace view={view} demoMode={isDemoMode()} clockOffsetMinutes={offsetMinutes} />;
  } catch (error) {
    if (error instanceof DomainError && (error.status === 404 || error.status === 403)) notFound();
    throw error;
  }
}

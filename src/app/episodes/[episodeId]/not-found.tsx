import Link from "next/link";

export default function EpisodeNotFound() {
  return (
    <div className="card mx-auto max-w-lg p-8 text-center">
      <h1 className="text-lg font-semibold">Episode not found</h1>
      <p className="mt-2 text-sm text-slate-600">
        Either this link is wrong or you are not a member of this care circle. Membership is checked on the server for
        every request, so an uninvited or revoked account cannot open an episode by guessing its address.
      </p>
      <Link href="/" className="btn mt-4">
        Back to your episodes
      </Link>
    </div>
  );
}

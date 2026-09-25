"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client";
import { StatusPill } from "./StatusPill";

type UserOption = { id: string; displayName: string; role: string };

export function IdentitySwitcher({
  current,
  users,
}: {
  current: UserOption | null;
  users: UserOption[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function switchTo(userId: string) {
    if (!userId) return;
    setBusy(true);
    try {
      await api("/api/session", { method: "POST", json: { userId } });
      router.push("/");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      {current ? <StatusPill value={current.role} /> : null}
      <select
        aria-label="Demo identity"
        className="input w-auto py-1.5"
        value={current?.id ?? ""}
        disabled={busy}
        onChange={(e) => void switchTo(e.target.value)}
      >
        <option value="" disabled>
          Choose a demo identity…
        </option>
        {users.map((u) => (
          <option key={u.id} value={u.id}>
            {u.displayName}
          </option>
        ))}
      </select>
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { api } from "@/lib/client";

export function useAction() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const run = useCallback(
    async <T,>(key: string, url: string, init: RequestInit & { json?: unknown } = {}): Promise<T | null> => {
      setBusy(key);
      setError(null);
      try {
        const result = await api<T>(url, init);
        router.refresh();
        return result;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Request failed");
        return null;
      } finally {
        setBusy(null);
      }
    },
    [router],
  );

  return { run, error, setError, busy };
}

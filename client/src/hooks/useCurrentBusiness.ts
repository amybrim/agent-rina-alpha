import { trpc } from "@/lib/trpc";
import { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "rina.currentBusinessId";

export function useCurrentBusiness() {
  const list = trpc.businesses.list.useQuery();
  const [selectedId, setSelectedId] = useState<number | null>(null);

  // Restore selection on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const n = Number(stored);
      if (Number.isFinite(n)) setSelectedId(n);
    }
  }, []);

  // When list loads, ensure selection is valid
  useEffect(() => {
    if (!list.data) return;
    if (list.data.length === 0) {
      setSelectedId(null);
      localStorage.removeItem(STORAGE_KEY);
      return;
    }
    if (!selectedId || !list.data.find((b) => b.id === selectedId)) {
      const next = list.data[0]!.id;
      setSelectedId(next);
      localStorage.setItem(STORAGE_KEY, String(next));
    }
  }, [list.data, selectedId]);

  const select = (id: number) => {
    setSelectedId(id);
    localStorage.setItem(STORAGE_KEY, String(id));
  };

  const current = useMemo(
    () => list.data?.find((b) => b.id === selectedId) ?? null,
    [list.data, selectedId]
  );

  return {
    businesses: list.data ?? [],
    isLoading: list.isLoading,
    current,
    selectedId,
    businessId: selectedId,
    select,
    hasNone: !list.isLoading && (list.data?.length ?? 0) === 0,
  };
}

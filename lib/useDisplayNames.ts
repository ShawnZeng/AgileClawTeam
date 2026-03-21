"use client";

import { useEffect, useState } from "react";

export const DEFAULT_DISPLAY_NAMES: Record<string, string> = {
  po: "Shawn",
  sm: "Rex",
  "designer-1": "Mia",
  "developer-1": "Alex",
  "developer-2": "Kai",
  "tester-1": "Nova",
};

export const DISPLAY_NAMES_STORAGE_KEY = "agileclawteam-agent-display-names";

/** Reads display names from localStorage and merges over defaults. Read-only view. */
export function useDisplayNames(): Record<string, string> {
  const [names, setNames] = useState<Record<string, string>>(
    DEFAULT_DISPLAY_NAMES,
  );

  useEffect(() => {
    try {
      const saved = localStorage.getItem(DISPLAY_NAMES_STORAGE_KEY);
      if (!saved) return;
      const parsed = JSON.parse(saved) as Record<string, string>;
      setNames((current) => ({ ...current, ...parsed }));
    } catch {
      // ignore invalid localStorage data
    }
  }, []);

  return names;
}

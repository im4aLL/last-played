import { useCallback, useEffect, useState } from "react";
import {
  fetchLibrary,
  LIBRARY_ROW_DEFS,
  type LibraryRow,
  type LibraryScenario,
} from "@/features/library/library-mock";

export type LibraryStatus = "loading" | "error" | "ready";

export type LibraryState = {
  status: LibraryStatus;
  rows: LibraryRow[];
  error: Error | null;
  reload: () => void;
};

type Snapshot = {
  key: string;
  status: LibraryStatus;
  rows: LibraryRow[];
  error: Error | null;
};

function emptyRows(): LibraryRow[] {
  return LIBRARY_ROW_DEFS.map(({ id, title }) => ({ id, title, items: [] }));
}

function loadingSnapshot(key: string): Snapshot {
  return { key, status: "loading", rows: emptyRows(), error: null };
}

function toError(value: unknown): Error {
  return value instanceof Error ? value : new Error(String(value));
}

export function useLibrary(
  scenario: LibraryScenario = "default",
): LibraryState {
  const [reloadToken, setReloadToken] = useState(0);
  const requestKey = `${scenario}:${reloadToken}`;
  const [snapshot, setSnapshot] = useState<Snapshot>(() =>
    loadingSnapshot(requestKey),
  );

  useEffect(() => {
    let active = true;

    fetchLibrary(scenario).then(
      (rows) => {
        if (active) {
          setSnapshot({ key: requestKey, status: "ready", rows, error: null });
        }
      },
      (error: unknown) => {
        if (active) {
          setSnapshot({
            key: requestKey,
            status: "error",
            rows: emptyRows(),
            error: toError(error),
          });
        }
      },
    );

    return () => {
      active = false;
    };
  }, [scenario, requestKey]);

  const reload = useCallback(() => setReloadToken((token) => token + 1), []);
  const current =
    snapshot.key === requestKey ? snapshot : loadingSnapshot(requestKey);

  return {
    status: current.status,
    rows: current.rows,
    error: current.error,
    reload,
  };
}

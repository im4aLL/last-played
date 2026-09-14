import { useCallback, useEffect, useState } from "react";
import {
  fetchMediaDetail,
  type MediaScenario,
} from "@/features/media/media-mock";
import type { MediaDetail } from "@/lib/types";

export type MediaStatus = "loading" | "error" | "ready";

export type MediaState = {
  status: MediaStatus;
  detail: MediaDetail | null;
  error: Error | null;
  reload: () => void;
};

type Snapshot = {
  key: string;
  status: MediaStatus;
  detail: MediaDetail | null;
  error: Error | null;
};

function toError(value: unknown): Error {
  return value instanceof Error ? value : new Error(String(value));
}

function loadingSnapshot(key: string): Snapshot {
  return { key, status: "loading", detail: null, error: null };
}

export function useMedia(
  id: string,
  scenario: MediaScenario = "default",
): MediaState {
  const [reloadToken, setReloadToken] = useState(0);
  const requestKey = `${id}:${scenario}:${reloadToken}`;
  const [snapshot, setSnapshot] = useState<Snapshot>(() =>
    loadingSnapshot(requestKey),
  );

  useEffect(() => {
    let active = true;

    fetchMediaDetail(id, scenario).then(
      (detail) => {
        if (active) {
          setSnapshot({
            key: requestKey,
            status: "ready",
            detail,
            error: null,
          });
        }
      },
      (error: unknown) => {
        if (active) {
          setSnapshot({
            key: requestKey,
            status: "error",
            detail: null,
            error: toError(error),
          });
        }
      },
    );

    return () => {
      active = false;
    };
  }, [id, scenario, requestKey]);

  const reload = useCallback(() => setReloadToken((token) => token + 1), []);
  const current =
    snapshot.key === requestKey ? snapshot : loadingSnapshot(requestKey);

  return {
    status: current.status,
    detail: current.detail,
    error: current.error,
    reload,
  };
}

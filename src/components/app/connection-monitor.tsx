import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAppConfig } from "@/lib/app-config";
import { setOnlineState } from "@/lib/api";
import { selectOnline, useConnection } from "@/lib/connection";

function createSessionId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export default function ConnectionMonitor() {
  const online = useConnection(selectOnline);
  const queryClient = useQueryClient();
  const sessionRef = useRef<string | null>(null);
  if (sessionRef.current === null) {
    sessionRef.current = createSessionId();
  }
  const seqRef = useRef(0);
  const previous = useRef(online);

  useEffect(() => {
    const handleOnline = () => {
      const state = useConnection.getState();
      if (state.online === true) return;
      state.setOnline(true);
      state.clearAllOverrides();
    };
    const handleOffline = () => {
      const state = useConnection.getState();
      if (state.online === false) return;
      state.setOnline(false);
      state.clearAllOverrides();
    };
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    const seq = ++seqRef.current;
    const session = sessionRef.current ?? "";
    void setOnlineState(online, session, seq).catch((error: unknown) =>
      console.error("Failed to report online state", error),
    );
    const cameOnline = online && !previous.current;
    previous.current = online;
    if (cameOnline && useAppConfig.getState().dbMode === "remote") {
      void queryClient.invalidateQueries({ queryKey: ["sync-status"] });
    }
  }, [online, queryClient]);

  return null;
}

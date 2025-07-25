"use client";

import { useEffect, useRef } from "react";
import { useDownloadStore } from "@/store/downloadStore";

export default function useDownloadSocket() {
  const socketRef = useRef<WebSocket | null>(null);
  const updateProgress = useDownloadStore((s) => s.updateProgress);

  useEffect(() => {
    socketRef.current = new WebSocket("ws://localhost:8001/ws/downloads/");

    socketRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === "progress") {
        updateProgress(data.request_id, {
          content: data.content_name,
          clientId: data.client_id,
          percent: data.progress,
        });
      }
    };

    socketRef.current.onopen = () => console.log("[WS] Connected");
    socketRef.current.onclose = () => console.warn("[WS] Disconnected");
    socketRef.current.onerror = (e) => console.error("[WS] Error", e);

    return () => {
      socketRef.current?.close();
    };
  }, [updateProgress]);
}

"use client";
import { useCallback } from "react";
import { useEffect, useRef } from "react";
import { useDownloadStore } from "@/store/downloadStore";

const WS_URL = "ws://localhost:8001/ws/downloads/";
const MAX_RETRIES = 3;
const INITIAL_DELAY = 1000; // 초기 재연결 시간 1초

export default function useDownloadSocket() {
  const socketRef = useRef<WebSocket | null>(null);
  const retryCountRef = useRef(0); // 재시도 횟수
  const retryDelayRef = useRef(INITIAL_DELAY); // 재시도 지연
  const isMounted = useRef(true);
  const updateProgress = useDownloadStore((s) => s.updateProgress);

  const connect = useCallback(() => {
    if (!isMounted.current) return;

    console.log(
      `[WS] 연결 시도중... (시도횟수 : ${retryCountRef.current + 1})`
    );
    const socket = new WebSocket(WS_URL);
    socketRef.current = socket;

    socket.onopen = () => {
      console.log("[WS] Connected");
      // 리트 초기화
      retryCountRef.current = 0;
      retryDelayRef.current = INITIAL_DELAY;
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "progress") {
          updateProgress(data.request_id, {
            content: data.content_name,
            clientId: data.client_id,
            percent: data.progress,
          });
        }
      } catch (e) {
        console.error("[WS] Message parse error", e);
      }
    };

    socket.onerror = (e) => {
      console.error("[WS] Error", e);
      // 에러 발생 시 소켓 닫아서 onclose 재연결 로직으로
      socket.close();
    };

    socket.onclose = (event) => {
      console.warn("[WS] Disconnected", event);
      if (!isMounted.current) return;

      if (retryCountRef.current < MAX_RETRIES) {
        const delay = retryDelayRef.current;
        console.log(`[WS] ${delay}m 후 재연결 시도...`);
        setTimeout(() => {
          retryCountRef.current += 1;
          retryDelayRef.current *= 2;
          connect();
        }, delay);
      } else {
        console.error("[WS] 최대 재연결 시도 횟수 초과");
      }
    };
  }, [updateProgress]);

  useEffect(() => {
    isMounted.current = true;
    connect();

    return () => {
      // 언마운트 시 연결 해제 및 재연결 중단
      isMounted.current = false;
      socketRef.current?.close();
    };
  }, [connect]);
}

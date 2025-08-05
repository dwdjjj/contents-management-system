"use client";
import { useCallback, useEffect, useRef } from "react";
import { useDownloadStore } from "@/store/downloadStore";
// import { useTierStore } from "@/store/tierStore";

const WS_BASE_URL = "ws://localhost:8001/ws/downloads/";
const MAX_RETRIES = 3;
const INITIAL_DELAY = 1000; // 초기 재연결 시간 1초
// const tier = useTierStore.getState().tier;

interface ProgressEvent {
  job_id: string;
  status: string;
  percent: number;
  content_name: string;
  client_id: string;
  content_id: number;
  download_url: string;
}

export default function useDownloadSocket(clientId: string) {
  const socketRef = useRef<WebSocket | null>(null);
  const retryCountRef = useRef(0); // 재시도 횟수
  const retryDelayRef = useRef(INITIAL_DELAY); // 재시도 지연
  const isMounted = useRef(true);
  const updateProgress = useDownloadStore((s) => s.updateProgress);

  const connect = useCallback(() => {
    if (!isMounted.current) return;
    const wsUrl = `${WS_BASE_URL}${clientId}/`;

    console.log(
      `[WS] 연결 시도중... (시도횟수 : ${retryCountRef.current + 1})`
    );
    const socket = new WebSocket(wsUrl);
    socketRef.current = socket;

    socket.onopen = () => {
      console.log("[WS] Connected");
      // 연결 성공 시 재시도 횟수 초기화
      retryCountRef.current = 0;
      retryDelayRef.current = INITIAL_DELAY;
    };

    socket.onmessage = (event) => {
      try {
        const data: ProgressEvent = JSON.parse(event.data);
        updateProgress({
          request_id: data.job_id,
          status: data.status,
          percent: data.percent,
          content: data.content_name,
          clientId: data.client_id,
          content_id: data.content_id,
          download_url: data.download_url,
        });
        console.log("ws 메시지 수신 데이터", data);

        // 다운로드 완료되면 iframe 생성
        if (
          data.status === "success" &&
          data.percent === 100 &&
          data.download_url
        ) {
          // const link = document.createElement("a");
          // link.href = data.download_url;
          // link.download = "";
          // document.body.appendChild(link);
          // link.click();
          // document.body.removeChild(link);

          const iframeId = `iframe-${data.job_id}`;
          document.getElementById(iframeId)?.remove(); // 중복 제거
          const iframe = document.createElement("iframe");
          iframe.id = iframeId;
          iframe.style.display = "none";

          const downloadUrl = data.download_url;

          iframe.src = downloadUrl;
          document.body.appendChild(iframe);
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
      if (!isMounted.current || retryCountRef.current >= MAX_RETRIES) return;

      const delay = retryDelayRef.current;
      console.log(`[WS] ${delay}m 후 재연결 시도...`);
      setTimeout(() => {
        retryCountRef.current += 1;
        retryDelayRef.current *= 2;
        connect();
      }, delay);
    };
  }, [clientId, updateProgress]);

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

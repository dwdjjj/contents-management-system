"use client";

import { useEffect, useMemo, useState } from "react";
import { useDownloadStore } from "@/store/downloadStore";
import { fetchDownloadHistory, fetchBestContent } from "@/hooks/useContent";

interface DownloadHistoryItem {
  id: number;
  content: string;
  content_id: number;
  success: boolean;
  timestamp: string;
}

export default function DownloadProgressBox() {
  const clientId = "test-device-1";
  const progresses = useDownloadStore((s) => s.progressList);
  const [history, setHistory] = useState<DownloadHistoryItem[]>([]);

  const uniqueProgresses = useMemo(() => {
    const seen = new Set();
    return progresses.filter((item) => {
      const key = `${item.clientId}-${item.content}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [progresses]);

  // 히스토리 fetch 함수
  const fetchHistoryData = async () => {
    try {
      const data = await fetchDownloadHistory(clientId);
      setHistory(data);
    } catch (e) {
      console.error("히스토리 불러오기 실패", e);
    }
  };

  // 최초 렌더링
  useEffect(() => {
    fetchHistoryData();
  }, []);

  // 완료된 다운로드 발생 시 히스토리 갱신
  useEffect(() => {
    if (progresses.some((p) => p.status === "success")) {
      fetchHistoryData();
    }
  }, [progresses]);

  const handleRetry = async (contentName: string) => {
    try {
      const deviceInfo = {
        chipset: "snapdragon888",
        memory: 6,
        resolution: "1080p",
      };
      const result = await fetchBestContent(deviceInfo, contentName);
      const proxyUrl = `http://localhost:8000/api/download/${result.id}/`;
      const iframeId = `iframe-${result.id}`;
      document.getElementById(iframeId)?.remove(); // 중복 방지
      const iframe = document.createElement("iframe");
      iframe.id = iframeId;
      iframe.style.display = "none";
      iframe.src = proxyUrl;
      document.body.appendChild(iframe);
    } catch (err) {
      alert("재다운로드 실패: " + err);
    }
  };

  return (
    <div className="mt-6 space-y-6">
      <section>
        <h2 className="text-lg font-bold">📦 실시간 다운로드 진행 상황</h2>

        {uniqueProgresses.length === 0 ? (
          <p className="text-gray-500 italic">현재 다운로드가 없습니다.</p>
        ) : (
          uniqueProgresses.map((item) => {
            const percent = Math.min(item.percent, 100);
            const isCompleted = item.status === "success" || percent >= 100;

            const statusLabel = {
              pending: "대기 중",
              in_progress: "진행 중",
              success: "완료",
              failed: "실패",
            }[item.status];

            return (
              <div
                key={item.request_id}
                className={`p-3 rounded shadow transition-all
                  ${isCompleted ? "bg-green-50" : "bg-gray-200"}`}
              >
                <div className="flex justify-between text-sm font-semibold mb-1">
                  <span>
                    {item.content}{" "}
                    <span
                      className={`ml-1 ${
                        item.status === "success"
                          ? "text-green-600"
                          : item.status === "failed"
                          ? "text-red-600"
                          : "text-blue-600"
                      }`}
                    >
                      {statusLabel}
                    </span>
                  </span>
                  <span>{percent}%</span>
                </div>

                <div className="w-full bg-white h-3 rounded overflow-hidden">
                  <div
                    className="h-full transition-all duration-300 bg-blue-600"
                    style={{ width: `${percent}%` }}
                  />
                </div>

                <p className="text-xs text-gray-500 mt-1">
                  Client: {item.clientId}
                </p>
              </div>
            );
          })
        )}
      </section>

      <section>
        <h2 className="text-lg font-bold">📜 다운로드 기록</h2>
        {history.length === 0 ? (
          <p className="text-gray-500 italic">다운로드 기록이 없습니다.</p>
        ) : (
          <div className="space-y-2">
            {history.map((h) => (
              <div
                key={h.id}
                className={`p-3 rounded shadow flex justify-between items-center text-sm ${
                  h.success ? "bg-white" : "bg-red-50"
                }`}
              >
                <div>
                  <span className="font-bold">{h.content}</span>{" "}
                  <span
                    className={h.success ? "text-green-600" : "text-red-600"}
                  >
                    {h.success ? "성공" : "실패"}
                  </span>
                  <p className="text-xs text-gray-500">
                    {new Date(h.timestamp).toLocaleString()}
                  </p>
                </div>
                {!h.success && (
                  <button
                    className="text-blue-600 border border-blue-600 px-2 py-1 rounded text-xs hover:bg-blue-50"
                    onClick={() => handleRetry(h.content)}
                  >
                    재다운로드
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

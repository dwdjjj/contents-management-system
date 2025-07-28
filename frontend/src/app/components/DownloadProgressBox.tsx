"use client";

import { useEffect, useMemo, useState } from "react";
import { useDownloadStore } from "@/store/downloadStore";
import { fetchDownloadHistory, DownloadHistoryItem } from "@/hooks/useContent";
import { useDownloadContent } from "@/hooks/useDownload";

export default function DownloadProgressBox() {
  const clientId = "test-device-1";
  const deviceInfo = {
    chipset: "snapdragon888",
    memory: 6,
    resolution: "1080p",
  };
  const { downloadContent } = useDownloadContent(clientId, deviceInfo);

  const progresses = useDownloadStore((s) => s.progressList);
  const [history, setHistory] = useState<DownloadHistoryItem[]>([]);

  // 최신 히스토리 fetch
  const fetchHistory = async () => {
    try {
      const data = await fetchDownloadHistory(clientId);
      setHistory(data);
    } catch (e) {
      console.error("히스토리 불러오기 실패", e);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  // 완료 또는 실패 시 히스토리 갱신
  useEffect(() => {
    if (
      progresses.some((p) => p.status === "success" || p.status === "failed")
    ) {
      fetchHistory();
    }
  }, [progresses]);

  // 동시 다운로드 모두 표시
  const items = useMemo(() => progresses, [progresses]);
  return (
    <div className="mt-6 space-y-6">
      <section>
        <h2 className="text-lg font-bold mb-2">📦 실시간 다운로드 진행 상황</h2>

        {items.length === 0 ? (
          <p className="text-gray-500 italic">현재 다운로드가 없습니다.</p>
        ) : (
          items.map((item) => {
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
                className={`p-3 rounded shadow transition-all mb-2
                  ${isCompleted ? "bg-green-100" : "bg-gray-200"}`}
              >
                <div className="flex justify-between text-sm font-semibold mb-1">
                  <p className="text-gray-400">{item.content}</p>
                  <div>
                    <span className="mr-3 text-gray-400">{percent}%</span>
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
                  </div>
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
        <h2 className="text-lg font-bold mb-2">📜 다운로드 기록</h2>
        {history.length === 0 ? (
          <p className="text-gray-500 italic">다운로드 기록이 없습니다.</p>
        ) : (
          <div className="space-y-2">
            {history.map((h) => (
              <div
                key={h.id}
                className={`p-3 rounded shadow text-sm ${
                  h.success ? "bg-white" : "bg-red-50"
                }`}
              >
                <div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 font-bold">{h.content}</span>
                    <span
                      className={h.success ? "text-green-600" : "text-red-600"}
                    >
                      {h.success ? "성공" : "실패"}
                    </span>
                  </div>
                  <p className="text-xs text-right text-gray-500">
                    {new Date(h.timestamp).toLocaleString()}
                  </p>
                </div>
                {!h.success && (
                  <button
                    className="px-2 py-1 text-xs border border-blue-600 rounded hover:bg-blue-50 text-blue-600"
                    onClick={() => downloadContent(h.content)}
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

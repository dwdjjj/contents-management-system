"use client";

import { useDownloadStore } from "@/store/downloadStore";
import { useMemo } from "react";

export default function DownloadProgressList() {
  const progresses = useDownloadStore((s) => s.progressList);

  const uniqueProgresses = useMemo(() => {
    const seen = new Set();
    return progresses.filter((item) => {
      const key = `${item.clientId}-${item.content}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [progresses]);

  return (
    <div className="mt-6 space-y-3">
      <h2 className="text-lg font-bold">📦 다운로드 진행 상황</h2>

      {progresses.length === 0 ? (
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
              className={`p-3 rounded shadow
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
    </div>
  );
}

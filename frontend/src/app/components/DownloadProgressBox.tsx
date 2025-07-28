"use client";

import { useDownloadStore } from "@/store/downloadStore";

export default function DownloadProgressList() {
  const progresses = useDownloadStore((s) => s.progressList);

  return (
    <div className="mt-6 space-y-3">
      <h2 className="text-lg font-bold">📦 다운로드 진행 상황</h2>

      {progresses.length === 0 ? (
        <p className="text-gray-500 italic">현재 다운로드가 없습니다.</p>
      ) : (
        progresses.map((item) => {
          const percent = Math.min(item.percent, 100);
          const isCompleted = percent >= 100;
          return (
            <div
              key={item.request_id}
              className="bg-gray-400 p-3 rounded shadow"
            >
              <div className="flex justify-between text-sm font-semibold mb-1">
                <span>
                  {item.content}{" "}
                  {isCompleted && <span className="text-green-600">완료</span>}
                </span>
                <span>{percent}%</span>
              </div>

              <div className="w-full bg-white h-3 rounded overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 bg-blue-600`}
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

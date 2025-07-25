"use client";

import { useDownloadStore } from "@/store/downloadStore";

const mockProgress = [
  {
    request_id: "mock-1",
    content: "model_v1.onnx",
    clientId: "pixel-7",
    percent: 75,
  },
  {
    request_id: "mock-2",
    content: "video_codec_v2",
    clientId: "snapdragon-888",
    percent: 40,
  },
];

export default function DownloadProgressList() {
  const progresses = useDownloadStore((s) => s.progressList);

  const listToRender = progresses.length > 0 ? progresses : mockProgress;

  return (
    <div className="mt-6 space-y-3">
      <h2 className="text-lg font-bold">📦 다운로드 진행 상황</h2>

      {listToRender.map((item) => (
        <div key={item.request_id} className="bg-gray-400 p-3 rounded shadow">
          <div className="flex justify-between text-sm font-semibold mb-1">
            <span>{item.content}</span>
            <span>{item.percent}%</span>
          </div>
          <div className="w-full bg-white h-3 rounded overflow-hidden">
            <div
              className="bg-blue-600 h-full transition-all duration-300 animate-pulse"
              style={{ width: `${item.percent}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">Client: {item.clientId}</p>
        </div>
      ))}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import useDownloadSocket from "@/hooks/useDownloadSocket";
import { fetchContents, ContentItem } from "@/hooks/useContent";
import { useDownloadContent } from "@/hooks/useDownload";
import { useDownloadStore } from "@/store/downloadStore";
import DownloadProgressBox from "@/components/DownloadProgressBox";

export default function DashboardPage() {
  const clientId = "test-device-1";
  const deviceInfo = {
    chipset: "snapdragon888",
    memory: 6,
    resolution: "1080p",
  };

  // clientId별 그룹으로 WebSocket 연결
  useDownloadSocket(clientId);

  // 다운로드, 재시도 로직
  const { downloadContent } = useDownloadContent(clientId, deviceInfo);

  const clearAll = useDownloadStore((s) => s.clearAll);
  useEffect(() => {
    clearAll();
  }, [clearAll]);

  const [contents, setContents] = useState<ContentItem[]>([]);
  // 콘텐츠 목록 불러오기
  useEffect(() => {
    fetchContents()
      .then(setContents)
      .catch((err) => console.error("콘텐츠 불러오기 실패:", err));
  }, []);

  return (
    <main className="p-6 max-w-5xl mx-auto">
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">실시간 다운로드 대시보드</h1>
        <Link href="/upload">
          <button className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 hover:cursor-pointer">
            + 콘텐츠 업로드
          </button>
        </Link>
      </header>

      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-2">📝 업로드된 콘텐츠 목록</h2>
        {contents.length === 0 ? (
          <p className="text-gray-500">등록된 콘텐츠가 없습니다.</p>
        ) : (
          contents.map((orig) => (
            <div
              key={orig.id}
              className="mb-6 border border-gray-300 rounded overflow-hidden"
            >
              <div className="bg-gray-600 px-4 py-2 flex justify-between items-center">
                <span className="font-bold">{orig.name}</span>
                <button
                  onClick={() => downloadContent(orig.name)}
                  className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 hover:cursor-pointer"
                >
                  다운로드
                </button>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-200 text-gray-800 font-semibold">
                    <th className="px-4 py-2 w-1/5">타입</th>
                    <th className="px-4 py-2 w-1/5">버전</th>
                    <th className="px-4 py-2 w-2/5">업로드 시각</th>
                    <th className="px-4 py-2 w-1/5">상태</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t">
                    <td className="px-4 py-2 capitalize">{orig.type}</td>
                    <td className="px-4 py-2">{orig.version}</td>
                    <td className="px-4 py-2">
                      {new Date(orig.uploaded_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-2">
                      {
                        {
                          pending: "대기 중",
                          in_progress: "변환 중",
                          success: "완료",
                          failed: "실패",
                        }[orig.conversion_status]
                      }
                    </td>
                  </tr>
                </tbody>
              </table>
              {orig.variants.length > 0 && (
                <div className="flex flex-wrap gap-2 p-4 ">
                  {orig.variants.map((v) => (
                    <Link
                      key={v.id}
                      href={v.url}
                      target="_blank"
                      className="px-3 py-1 bg-blue-600 rounded text-white text-sm hover:bg-blue-500"
                    >
                      {v.type.toUpperCase()} (v{v.version})
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </section>

      <section>
        <DownloadProgressBox />
      </section>
    </main>
  );
}

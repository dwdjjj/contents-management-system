"use client";

import { useEffect, useState } from "react";
import useDownloadSocket from "@/hooks/useDownloadSocket";
import { fetchBestContent } from "@/hooks/useContent";
import DownloadProgressBox from "@/components/DownloadProgressBox";
import Link from "next/link";
import { useDownloadStore } from "@/store/downloadStore";

interface Variant {
  id: number;
  type: string;
  version: string;
  url: string;
}

interface ContentItem {
  id: number;
  name: string;
  version: string;
  type: string;
  uploaded_at: string;
  conversion_status: "pending" | "in_progress" | "success" | "failed";
  variants: Variant[];
}

export default function DashboardPage() {
  // 실제 디바이스별 고유 ID
  const clientId = "test-device-1";
  // clientId별 그룹으로 WebSocket 연결
  useDownloadSocket(clientId);

  const [contents, setContents] = useState<ContentItem[]>([]);

  const clearAll = useDownloadStore((s) => s.clearAll);

  useEffect(() => {
    clearAll();
  }, [clearAll]);

  useEffect(() => {
    const fetchContents = async () => {
      try {
        const res = await fetch("http://localhost:8000/api/contents/");
        if (res.ok) {
          const data: ContentItem[] = await res.json();
          setContents(data);
        }
      } catch (err) {
        console.error("콘텐츠 불러오기 실패:", err);
      }
    };
    fetchContents();
  }, []);

  const handleDownload = async (contentName: string) => {
    clearAll(); // ← 이전 진행률 전부 삭제

    // 현재 로그인한 유저의 계층
    const userTier = "premium";
    try {
      const deviceInfo = {
        chipset: "snapdragon888",
        memory: 6,
        resolution: "1080p",
      };
      const res = await fetchBestContent(deviceInfo, contentName);
      const proxyUrl = `http://localhost:8000/api/download/${res.id}/?client_id=${clientId}&tier=${userTier}`;
      const iframeId = `iframe-${res.id}`;
      document.getElementById(iframeId)?.remove(); // 이전꺼 제거

      const iframe = document.createElement("iframe");
      iframe.id = iframeId;
      iframe.style.display = "none";
      iframe.src = proxyUrl;
      document.body.appendChild(iframe);
    } catch (err: unknown) {
      alert("다운로드 실패: " + err);
    }
  };

  // 이름별로 (orig, variants) 그룹핑
  const grouped = contents.reduce<Record<string, ContentItem>>((acc, item) => {
    acc[item.name] = item;
    return acc;
  }, {});

  return (
    <main className="p-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">실시간 다운로드 대시보드</h1>
        <Link href="/upload">
          <button className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 hover:cursor-pointer">
            + 콘텐츠 업로드
          </button>
        </Link>
      </div>

      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-2">📝 업로드된 콘텐츠 목록</h2>
        {Object.values(grouped).length === 0 && (
          <p className="text-gray-500">등록된 콘텐츠가 없습니다.</p>
        )}
        {Object.values(grouped).map((orig) => (
          <div key={orig.id} className="mb-6 border border-gray-300 rounded">
            <div className="bg-gray-300 px-4 py-2 flex justify-between items-center">
              <span className="font-bold">{orig.name}</span>
              <button
                onClick={() => handleDownload(orig.name)}
                className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 hover:cursor-pointer"
              >
                다운로드
              </button>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-200 text-gray-800 font-semibold text-left">
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
                    {orig.conversion_status === "pending" && "대기 중"}
                    {orig.conversion_status === "in_progress" && "진행 중"}
                    {orig.conversion_status === "success" && "완료"}
                    {orig.conversion_status === "failed" && "실패"}
                  </td>
                </tr>
              </tbody>
            </table>

            {orig.variants.length > 0 ? (
              <div className="flex flex-wrap gap-2 p-4">
                {orig.variants.map((v) => (
                  <Link
                    key={v.id}
                    href={v.url}
                    target="_blank"
                    className="px-3 py-1 bg-blue-600 rounded hover:bg-blue-500 text-sm text-white"
                  >
                    {v.type.toUpperCase()} (v{v.version})
                  </Link>
                ))}
              </div>
            ) : (
              orig.conversion_status !== "success" && (
                <p className="p-4 text-gray-500">변환 대기 중…</p>
              )
            )}
          </div>
        ))}
      </section>

      <section>
        <DownloadProgressBox />
      </section>
    </main>
  );
}

"use client";

import useDownloadSocket from "@/hooks/useDownloadSocket";
import { fetchBestContent } from "@/hooks/useContent";
import DownloadProgressBox from "@/components/DownloadProgressBox";
import Link from "next/link";
import { useEffect, useState } from "react";

// 콘텐츠 타입 명시
interface ContentItem {
  id: number;
  name: string;
  version: string;
  type: string;
  uploaded_at: string;
}

export default function DashboardPage() {
  useDownloadSocket(); // WebSocket 연결 시작

  const [contents, setContents] = useState<ContentItem[]>([]);

  useEffect(() => {
    const fetchContents = async () => {
      const res = await fetch("http://localhost:8000/api/contents/");
      if (res.ok) {
        const data = await res.json();
        setContents(data);
      }
    };
    fetchContents();
  }, []);

  const handleDownload = async (contentName: string) => {
    try {
      const deviceInfo = {
        chipset: "snapdragon888", // 실제 디바이스 info 전달하는 구조로 확장 가능
        memory: 6,
        resolution: "1080p",
      };

      const result = await fetchBestContent(deviceInfo, contentName);
      const proxyUrl = `http://localhost:8000/api/download/${result.id}/`;

      const iframe = document.createElement("iframe");
      iframe.style.display = "none";
      iframe.src = proxyUrl;
      document.body.appendChild(iframe);
    } catch (err: unknown) {
      alert("다운로드 실패: " + err);
    }
  };

  // 콘텐츠를 name 기준으로 그룹핑
  const groupedContents = contents.reduce((acc, content) => {
    if (!acc[content.name]) acc[content.name] = [];
    acc[content.name].push(content);
    return acc;
  }, {} as Record<string, ContentItem[]>);

  return (
    <main className="p-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">실시간 다운로드 대시보드</h1>
        <Link href="/upload">
          <button className="bg-green-600 text-white px-4 py-2 rounded">
            + 콘텐츠 업로드
          </button>
        </Link>
      </div>

      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-2">📝 업로드된 콘텐츠 목록</h2>
        {Object.entries(groupedContents).map(([name, items]) => (
          <div key={name} className="mb-4 border border-gray-300 rounded">
            <div className="bg-gray-300 px-4 py-2 flex justify-between items-center">
              <span className="font-bold">{name}</span>
              <button
                onClick={() => handleDownload(name)}
                className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
              >
                다운로드
              </button>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-200 text-gray-800 font-semibold text-left">
                  <th className="px-4 py-2 w-1/4">타입</th>
                  <th className="px-4 py-2 w-1/4">버전</th>
                  <th className="px-4 py-2">업로드 시각</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-t">
                    <td className="px-4 py-2">{item.type}</td>
                    <td className="px-4 py-2">{item.version}</td>
                    <td className="px-4 py-2">
                      {new Date(item.uploaded_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">📦 다운로드 진행률</h2>
        <DownloadProgressBox />
      </section>
    </main>
  );
}

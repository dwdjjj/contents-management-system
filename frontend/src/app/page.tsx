"use client";

import useDownloadSocket from "@/hooks/useDownloadSocket";
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
        <table className="table-auto w-full text-sm border">
          <thead>
            <tr className="bg-gray-400">
              <th className="border p-2">이름</th>
              <th className="border p-2">버전</th>
              <th className="border p-2">타입</th>
              <th className="border p-2">업로드 시각</th>
            </tr>
          </thead>
          <tbody>
            {contents.map((item) => (
              <tr key={item.id}>
                <td className="border p-2">{item.name}</td>
                <td className="border p-2">{item.version}</td>
                <td className="border p-2">{item.type}</td>
                <td className="border p-2">
                  {new Date(item.uploaded_at).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">📦 다운로드 진행률</h2>
        <DownloadProgressBox />
      </section>
    </main>
  );
}

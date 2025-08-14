"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiUrl } from "@/lib/endpoints";
import { useUploadContent, type UploadForm } from "@/hooks/useUpload";

export default function ContentUploadPage() {
  const [form, setForm] = useState<UploadForm>({
    name: "",
    version: "1.0.0",
    type: "original",
    chipset: "",
    min_memory: 0,
    resolution: "1080p",
  });
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { upload, loading, lastError } = useUploadContent();
  const router = useRouter();

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === "min_memory" ? Number(value) : (value as any),
    }));
  };

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return alert("📂 파일을 선택해주세요.");

    const res = await upload(form, file);
    if (res.ok) {
      alert(`✅ 업로드 완료: ${res.data?.name ?? form.name}`);
      router.push("/");
    }
  };

  return (
    <main className="max-w-xl mx-auto p-8">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">콘텐츠 업로드</h1>
        <Link href="/">
          <button className="text-sm underline text-gray-600 hover:text-white hover:cursor-pointer">
            ← 대시보드로
          </button>
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          name="name"
          placeholder="콘텐츠 이름"
          className="border p-2 w-full"
          onChange={handleChange}
        />
        <input
          name="version"
          defaultValue="1.0.0"
          className="border p-2 w-full"
          onChange={handleChange}
        />
        <select
          name="type"
          className="border p-2 w-full"
          onChange={handleChange}
        >
          <option value="original">original</option>
          <option value="high">high</option>
          <option value="normal">normal</option>
          <option value="low">low</option>
        </select>
        <input
          name="chipset"
          placeholder="칩셋 (예: snapdragon888)"
          className="border p-2 w-full"
          onChange={handleChange}
        />
        <input
          name="min_memory"
          type="number"
          placeholder="최소 메모리 (MB)"
          className="border p-2 w-full"
          onChange={handleChange}
        />
        <input
          name="resolution"
          placeholder="해상도 (예: 1080p)"
          className="border p-2 w-full"
          onChange={handleChange}
        />

        <div className="flex gap-4 items-center">
          <button
            type="button"
            onClick={handleFileClick}
            className="bg-gray-400 px-4 py-2 border rounded hover:bg-gray-500 hover:cursor-pointer"
          >
            📁 파일 선택
          </button>
          <span className="text-sm text-gray-600">
            {file ? file.name : "선택된 파일 없음"}
          </span>
          <input
            type="file"
            accept="*/*"
            ref={fileInputRef}
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
        </div>

        <div className="flex justify-end gap-4 mt-6">
          <Link href="/">
            <button
              type="button"
              className="px-4 py-2 rounded bg-red-500 hover:bg-red-600 hover:cursor-pointer"
            >
              취소
            </button>
          </Link>
          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 hover:cursor-pointer disabled:opacity-60"
            disabled={loading}
          >
            {loading ? "업로드 중..." : "업로드"}
          </button>
        </div>
      </form>

      {lastError && (
        <p className="mt-4 text-sm text-red-500">❌ 오류: {lastError}</p>
      )}
    </main>
  );
}

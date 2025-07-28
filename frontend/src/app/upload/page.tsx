"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function ContentUploadPage() {
  const [form, setForm] = useState({
    name: "",
    version: "1.0.0",
    type: "original",
    chipset: "",
    min_memory: 0,
    resolution: "1080p",
  });
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const router = useRouter();

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return setMessage("📂 파일을 선택해주세요.");

    const formData = new FormData();
    Object.entries(form).forEach(([key, value]) =>
      formData.append(key, String(value))
    );
    formData.append("file", file);

    const res = await fetch("http://localhost:8000/api/upload-content/", {
      method: "POST",
      body: formData,
    });

    if (res.ok) {
      const data = await res.json();
      alert("✅ 업로드 완료: " + data.name);
      router.push("/"); // ✅ 대시보드로 이동
    } else {
      const data = await res.json();
      setMessage(`❌ 오류: ${data.error || "알 수 없는 오류"}`);
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
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 hover:cursor-pointer"
          >
            업로드
          </button>
        </div>
      </form>

      {message && <p className="mt-4 text-sm text-gray-700">{message}</p>}
    </main>
  );
}

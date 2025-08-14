"use client";

import { useState, useCallback } from "react";
import { apiUrl } from "@/lib/endpoints";

export type UploadForm = {
  name: string;
  version: string;
  type: "original" | "high" | "normal" | "low";
  chipset: string;
  min_memory: number;
  resolution: string;
};

export type UploadResponse = { name?: string } & Record<string, unknown>;
export type UploadResult =
  | { ok: true; data: UploadResponse }
  | { ok: false; error: string };

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}
function getErrorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  if (isRecord(e) && typeof (e as { message?: unknown }).message === "string") {
    return (e as { message: string }).message;
  }
  return "네트워크 오류";
}

export function useUploadContent() {
  const [loading, setLoading] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const upload = useCallback(
    async (form: UploadForm, file: File): Promise<UploadResult> => {
      setLoading(true);
      setLastError(null);
      try {
        const fd = new FormData();
        Object.entries(form).forEach(([k, v]) => fd.append(k, String(v)));
        fd.append("file", file);

        const res = await fetch(apiUrl("upload-content/"), {
          method: "POST",
          body: fd,
        });

        // body를 JSON으로 시도하되 실패해도 진행
        let data: unknown = null;
        try {
          data = await res.json();
        } catch {
          /* ignore non-JSON */
        }

        if (!res.ok) {
          const msg =
            (isRecord(data) && typeof data.error === "string" && data.error) ||
            (isRecord(data) &&
              typeof data.detail === "string" &&
              data.detail) ||
            `업로드 실패 (${res.status})`;
          setLastError(msg);
          return { ok: false, error: msg };
        }

        return { ok: true, data: (data ?? {}) as UploadResponse };
      } catch (e: unknown) {
        const msg = getErrorMessage(e);
        setLastError(msg);
        return { ok: false, error: msg };
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { upload, loading, lastError };
}

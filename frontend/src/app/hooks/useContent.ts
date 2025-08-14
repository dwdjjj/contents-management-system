import { apiUrl } from "@/lib/endpoints";

export interface DeviceInfo {
  chipset: string;
  memory: number;
  resolution: string;
}

export interface ContentItem {
  id: number;
  name: string;
  version: string;
  type: string;
  uploaded_at: string;
  conversion_status: "pending" | "in_progress" | "success" | "failed";
  variants: Array<{
    id: number;
    type: string;
    version: string;
    url: string;
  }>;
}

export interface DownloadHistoryItem {
  id: number;
  content: string;
  content_id: number;
  success: boolean;
  timestamp: string;
}

export async function fetchBestContent(
  deviceInfo: DeviceInfo,
  requestedContent: string,
  clientId: string,
  failedId: number | null = null
): Promise<{
  id: number;
  download_url: string;
  type: string;
  version: string;
  fallback: boolean;
}> {
  const res = await fetch(apiUrl("get-content/"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      device_info: deviceInfo,
      requested_content: requestedContent,
      client_id: clientId,
      ...(failedId !== null && { failed_content_id: failedId }),
    }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "콘텐츠 요청 실패");
  }
  return res.json();
}

export async function fetchContents(): Promise<ContentItem[]> {
  const res = await fetch(apiUrl("/contents/"), { credentials: "include" });
  if (!res.ok) throw new Error("콘텐츠 목록 불러오기 실패");
  return res.json();
}

export async function fetchDownloadHistory(
  clientId: string
): Promise<DownloadHistoryItem[]> {
  const res = await fetch(
    apiUrl(`/download-history/${encodeURIComponent(clientId)}/`)
  );
  if (!res.ok) throw new Error("다운로드 기록 불러오기 실패");
  return res.json();
}

export async function uploadContent(form: FormData) {
  const res = await fetch(apiUrl("/upload-content/"), {
    method: "POST",
    body: form,
    credentials: "include",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`업로드 실패: ${res.status} ${text}`);
  }
  return res.json();
}

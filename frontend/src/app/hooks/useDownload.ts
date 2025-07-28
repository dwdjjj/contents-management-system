// hooks/useDownload.ts
import { DeviceInfo, fetchBestContent } from "./useContent";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
// 로그인된 사용자 계층 (예시)
const userTier = "premium";

/**
 * clientId, deviceInfo를 받아
 * downloadContent(contentName) 함수를 반환하는 훅
 */
export function useDownloadContent(clientId: string, deviceInfo: DeviceInfo) {
  const downloadContent = async (contentName: string) => {
    const result = await fetchBestContent(deviceInfo, contentName);
    const proxyUrl = `${API_BASE}/api/download/${result.id}/?client_id=${clientId}&tier=${userTier}`;
    const iframeId = `iframe-${result.id}`;
    // 중복 iframe 제거
    document.getElementById(iframeId)?.remove();
    const iframe = document.createElement("iframe");
    iframe.id = iframeId;
    iframe.style.display = "none";
    iframe.src = proxyUrl;
    document.body.appendChild(iframe);
  };

  return { downloadContent };
}

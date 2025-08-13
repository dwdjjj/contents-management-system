import { DeviceInfo, fetchBestContent } from "./useContent";
import { useTierStore } from "@/store/tierStore";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
// 로그인된 사용자 계층
const tier = useTierStore.getState().tier;

/**
 * clientId, deviceInfo를 받아
 * downloadContent 함수를 반환하는 훅
 */
export function useDownloadContent(clientId: string, deviceInfo: DeviceInfo) {
  const downloadContent = async (
    contentName: string,
    failedContentId: number | null = null
  ) => {
    // 서버 추천(점수/페널티/fallback)에 clientId 반영
    const result = await fetchBestContent(
      deviceInfo,
      contentName,
      clientId,
      failedContentId
    );

    // 큐 등록(동시 다운로드/우선순위 관리를 위해 유지)
    await fetch(
      `${API_BASE}/api/download/${result.id}/?client_id=${clientId}&tier=${tier}`
    );
  };

  return { downloadContent };
}

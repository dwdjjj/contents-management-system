import { DeviceInfo, fetchBestContent } from "./useContent";
import { useTierStore } from "@/store/tierStore";
import { apiUrl } from "@/lib/endpoints";

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

    // Nginx 프록시(/api)로 호출
    const url = apiUrl(
      `/download/${result.id}/?client_id=${encodeURIComponent(
        clientId
      )}&tier=${encodeURIComponent(tier)}`
    );

    await fetch(url, { credentials: "include" });
  };

  return { downloadContent };
}

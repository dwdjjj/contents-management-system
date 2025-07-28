import { create } from "zustand";

type ProgressInfo = {
  request_id: string;
  status: string;
  percent: number;
};

type DownloadStore = {
  progressList: ProgressInfo[];
  updateProgress: (progress: ProgressInfo) => void;
};

export const useDownloadStore = create<DownloadStore>((set) => ({
  progressList: [],
  updateProgress: (progress) =>
    set((state) => {
      const exists = state.progressList.find(
        (p) => p.request_id === progress.request_id
      );
      const updated = exists
        ? // 기존 항목 업데이트
          state.progressList.map((p) =>
            p.request_id === progress.request_id ? progress : p
          )
        : // 새 항목 추가
          [...state.progressList, progress];

      return { progressList: updated };
    }),
}));

import { create } from "zustand";

type ProgressInfo = {
  request_id: string;
  content: string;
  clientId: string;
  percent: number;
};

type DownloadStore = {
  progressList: ProgressInfo[];
  updateProgress: (
    id: string,
    partial: Omit<ProgressInfo, "request_id">
  ) => void;
};

export const useDownloadStore = create<DownloadStore>((set) => ({
  progressList: [],
  updateProgress: (id, partial) =>
    set((state) => {
      const exists = state.progressList.find((p) => p.request_id === id);
      const newEntry = { request_id: id, ...partial };

      const updated = exists
        ? state.progressList.map((p) => (p.request_id === id ? newEntry : p))
        : [...state.progressList, newEntry];

      return { progressList: updated };
    }),
}));

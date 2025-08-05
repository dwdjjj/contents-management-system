import { create } from "zustand";

type Tier = "free" | "standard" | "premium";

type TierStore = {
  tier: Tier;
  setTier: (tier: Tier) => void;
};

export const useTierStore = create<TierStore>((set) => ({
  tier: "free", // 기본값
  setTier: (tier) => set({ tier }),
}));

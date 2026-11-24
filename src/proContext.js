import { createContext, useContext } from "react";

export const ProContext = createContext({
  gatingActive: false,
  isPro: true,
  products: [],
  busy: false,
  error: "",
  purchase: async () => ({ status: "unavailable" }),
  restore: async () => ({ isPro: true }),
  manage: async () => {},
});

export function usePro() {
  return useContext(ProContext);
}

import { useQuery } from "@tanstack/react-query";
import { fetchWallMeta } from "../services/api";

/**
 * Returns wall configuration: total_rows, price tiers, top_threshold_row.
 * Cached for the session.
 */
export function useWallMeta() {
  return useQuery({
    queryKey: ["wallMeta"],
    queryFn: fetchWallMeta,
    staleTime: Infinity,
  });
}

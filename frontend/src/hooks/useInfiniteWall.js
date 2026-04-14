import { useEffect, useRef, useState, useCallback } from "react";
import { fetchCandles } from "../services/api";

const ROWS_PER_PAGE = 10;
const MAX_ROWS = 200; // match backend WALL_TOTAL_ROWS

/**
 * Manages infinite-scroll row windows and active candle data.
 * loadMore is stable (no deps) — uses refs so the IntersectionObserver
 * never needs to reconnect on re-renders.
 * Returns: { candles (Map id→candle), loadedRowMax, sentinelRef, isLoading }
 */
export function useInfiniteWall() {
  const [candles, setCandles] = useState([]);
  const [loadedRowMax, setLoadedRowMax] = useState(ROWS_PER_PAGE - 1);
  const [isLoading, setIsLoading] = useState(false);
  const sentinelRef = useRef(null);

  // Refs mirror state so loadMore closure never goes stale
  const loadingRef     = useRef(false);
  const loadedRowRef   = useRef(ROWS_PER_PAGE - 1);

  // Stable across all renders — no deps needed
  const loadMore = useCallback(async () => {
    if (loadingRef.current) return;
    if (loadedRowRef.current >= MAX_ROWS - 1) return; // reached the end
    loadingRef.current = true;
    setIsLoading(true);
    const rowMin = loadedRowRef.current + 1;
    const rowMax = Math.min(rowMin + ROWS_PER_PAGE - 1, MAX_ROWS - 1);
    try {
      const data = await fetchCandles({ rowMin, rowMax });
      const results = data.results ?? data;
      if (results.length > 0) {
        setCandles((prev) => {
          const next = [...prev];
          results.forEach((c) => next.push(c));
          return next;
        });
      }
      // Always advance the row window, even if no candles in these rows
      loadedRowRef.current = rowMax;
      setLoadedRowMax(rowMax);
    } finally {
      loadingRef.current = false;
      setIsLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-fetch everything currently loaded (called after a new candle is lit)
  const refreshAll = useCallback(async () => {
    try {
      const data = await fetchCandles({ rowMin: 0, rowMax: loadedRowRef.current });
      const results = data.results ?? data;
      setCandles(results);
    } catch (_) {}
  }, []);

  // Listen for candle-lit event dispatched by LightCandleModal
  useEffect(() => {
    const handler = () => refreshAll();
    window.addEventListener("candle-lit", handler);
    return () => window.removeEventListener("candle-lit", handler);
  }, [refreshAll]);

  // Initial load
  useEffect(() => {
    const load = async () => {
      loadingRef.current = true;
      setIsLoading(true);
      try {
        const data = await fetchCandles({ rowMin: 0, rowMax: ROWS_PER_PAGE - 1 });
        const results = data.results ?? data;
        setCandles(results);
      } finally {
        loadingRef.current = false;
        setIsLoading(false);
      }
    };
    load();
  }, []);

  // Intersection observer — mounted once, never reconnects
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) loadMore(); },
      { rootMargin: "600px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore]);

  return { candles, loadedRowMax, sentinelRef, isLoading };
}

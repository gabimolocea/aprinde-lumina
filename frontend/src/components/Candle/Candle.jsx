import "./Candle.css";

/**
 * Deterministic pseudo-random from a seed (col, row).
 * Returns a value in [0, 1) — same inputs always give same output.
 */
function seededRand(col, row) {
  let h = (col * 1664525 + row * 1013904223 + 0xdeadbeef) | 0;
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  return ((h ^ (h >>> 16)) >>> 0) / 0xffffffff;
}

/**
 * Returns a 0–1 ratio of how much of the candle has burnt.
 * 0 = just lit (full height), 1 = about to expire (very short).
 */
function burnRatio(litAt, expiresAt) {
  if (!litAt || !expiresAt) return 0;
  const lit  = new Date(litAt).getTime();
  const exp  = new Date(expiresAt).getTime();
  const now  = Date.now();
  const total = exp - lit;
  if (total <= 0) return 1;
  return Math.min(1, Math.max(0, (now - lit) / total));
}

export default function Candle({ candle }) {
  if (!candle) return null;

  const burn = burnRatio(candle.lit_at, candle.expires_at);

  // Stable per-slot variation so each candle looks slightly unique
  const r1 = seededRand(candle.col, candle.row);
  const r2 = seededRand(candle.col + 99, candle.row + 7);
  const rotate = (r1 * 10 - 5).toFixed(2);   // –5° … +5°
  const skewX  = (r2 * 6  - 3).toFixed(2);   // –3° … +3°

  return (
    <div
      className={`candle candle--lit candle--${candle.dedication_type}`}
      style={{
        "--burn": burn,
        transform: `translateX(-50%) rotate(${rotate}deg) skewX(${skewX}deg)`,
      }}
    >
      <div className="candle__flame">
        <div className="candle__flame-shadows" />
        <div className="candle__flame-top" />
        <div className="candle__flame-middle" />
        <div className="candle__flame-bottom" />
      </div>
      <div className="candle__wick" />
      <div className="candle__wax" />
      {candle.has_photo && (
        <span className="candle__photo-dot" title="Are fotografie" />
      )}
    </div>
  );
}

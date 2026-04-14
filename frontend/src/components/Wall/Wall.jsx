import { useMemo, useEffect, useRef, memo } from "react";
import { useInfiniteWall } from "../../hooks/useInfiniteWall";
import { useWallMeta } from "../../hooks/useWallMeta";
import Candle from "../Candle/Candle";
import "./Wall.css";

const COLS = 24;
const AD_SPAN = 4; // candle slots replaced by inline ad element (desktop: 4 of 12 per half)

// Seeded pseudo-random ad placement — stable per session, predictable positions
// Uses a simple LCG so the pattern is consistent across re-renders without useState
function buildAdRows(maxRow = 400) {
  let seed = 0xdeadbeef;
  const lcg = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) | 0;
    return (seed >>> 0) / 0xffffffff;
  };
  const morti = new Set();
  const vii   = new Set();
  for (let r = 5; r < maxRow; ) {
    r += 4 + Math.floor(lcg() * 5); // gap: 4–8 rows
    if (r < maxRow) {
      (lcg() < 0.5 ? morti : vii).add(r);
    }
  }
  return { morti, vii };
}
const AD_ROWS = buildAdRows(400);

// Înlocuiește valorile de mai jos cu cele din contul tău AdSense
// data-ad-client  → publisher ID (ca-pub-XXXXXXXXXXXXXXXXX)
// data-ad-slot    → slot ID din panoul AdSense (10 cifre)
const ADSENSE_CLIENT = "ca-pub-XXXXXXXXXXXXXXXXX";
const ADSENSE_SLOTS = ["1234567890", "0987654321", "1122334455", "5544332211"];

const IS_ADSENSE_READY = !ADSENSE_CLIENT.includes("XXXXX");

// Ad formats rotating between slots
const AD_FORMATS = [
  { width: 300, height: 250, label: "300×250" },  // Medium Rectangle
  { width: 320, height: 50,  label: "320×50" },   // Mobile Banner
  { width: 300, height: 250, label: "300×250" },
  { width: 468, height: 60,  label: "468×60" },   // Full Banner
];

const InlineAd = memo(function InlineAd({ adIndex }) {
  const ref = useRef(null);
  const slot = ADSENSE_SLOTS[adIndex % ADSENSE_SLOTS.length];
  const fmt = AD_FORMATS[adIndex % AD_FORMATS.length];

  useEffect(() => {
    if (!IS_ADSENSE_READY) return;
    try {
      if (ref.current && ref.current.offsetWidth > 0) {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      }
    } catch (_) {}
  }, []);

  return (
    <div className="wall__slot-ad" ref={ref}>
      {IS_ADSENSE_READY ? (
        <ins
          className="adsbygoogle"
          style={{ display: "block", width: "100%", height: "100%" }}
          data-ad-client={ADSENSE_CLIENT}
          data-ad-slot={slot}
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
      ) : (
        <div className="wall__slot-ad-inner">
          <span className="wall__ad-placeholder-label">{fmt.label}</span>
          <span className="wall__ad-placeholder-tag">Publicitate</span>
        </div>
      )}
    </div>
  );
});

export default function Wall({ onEmptySlotClick, onCandleClick, litSlotKey }) {
  const { candles, loadedRowMax, sentinelRef, isLoading } = useInfiniteWall();
  const { data: meta } = useWallMeta();

  const splitCol = meta?.split_col ?? 12;

  const slotMap = useMemo(() => {
    const map = new Map();
    candles.forEach((c) => map.set(`${c.col},${c.row}`, c));
    return map;
  }, [candles]);

  const rows = Array.from({ length: loadedRowMax + 1 }, (_, r) => r);

  const mortiCount = splitCol;
  const viiCount = COLS - splitCol;

  function renderSlots(row, startCol, count, section, isTop, price, showAd) {
    const items = [];
    const adStart = count - AD_SPAN;
    let i = 0;
    while (i < count) {
      if (showAd && i === adStart) {
        items.push(
          <InlineAd
            key={`ad-${row}-${section}`}
            adIndex={row}
          />
        );
        i += AD_SPAN;
      } else {
        const col = startCol + i;
        const key = `${col},${row}`;
        const candle = slotMap.get(key);
        items.push(
          <div
            key={key}
            className={[
              "wall__slot",
              `wall__slot--${section}-${isTop ? "top" : "bottom"}`,
              key === litSlotKey ? "wall__slot--just-lit" : "",
            ].filter(Boolean).join(" ")}
            onClick={() =>
              candle ? onCandleClick(candle.id) : onEmptySlotClick(col, row)
            }
            title={
              candle
                ? `${candle.dedicated_to_name} — apasă pentru detalii`
                : `${section === "morti" ? "Morți" : "Vii"} · ${isTop ? "Sus" : "Jos"} · ${price} RON`
            }
          >
            <Candle candle={candle} />
          </div>
        );
        i++;
      }
    }
    return items;
  }

  return (
    <main className="wall">
      {meta?.demo_mode && (
        <div className="wall__demo-banner">
          🧪 MOD DEMO — Plata este simulată, lumânările se aprind instant
        </div>
      )}

      <div className="wall__section-headers">
        <div className="wall__section-header wall__section-header--morti">
          ✝ Pentru Morți
        </div>
        <div className="wall__section-header wall__section-header--vii">
          ☀ Pentru Vii
        </div>
      </div>

      <div className="wall__body">
        {rows.map((row) => {
          const isTop = meta ? row < meta.top_threshold_row : false;
          const price = isTop
            ? (meta?.price_top_lei ?? 10)
            : (meta?.price_bottom_lei ?? 5);
          const showMortiAd = AD_ROWS.morti.has(row);
          const showViiAd   = AD_ROWS.vii.has(row);
          return (
            <div key={row} className="wall__row">
              <div className="wall__half wall__half--morti">
                {renderSlots(row, 0, mortiCount, "morti", isTop, price, showMortiAd)}
              </div>
              <div className="wall__half wall__half--vii">
                {renderSlots(row, splitCol, viiCount, "vii", isTop, price, showViiAd)}
              </div>
            </div>
          );
        })}
      </div>

      <div ref={sentinelRef} className="wall__sentinel">
        {isLoading && <span className="wall__loading">Se încarcă...</span>}
      </div>
    </main>
  );
}

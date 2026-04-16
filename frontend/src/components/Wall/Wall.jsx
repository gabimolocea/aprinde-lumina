import { useMemo, useEffect, useRef, memo } from "react";
import { useInfiniteWall } from "../../hooks/useInfiniteWall";
import { useWallMeta } from "../../hooks/useWallMeta";
import Candle from "../Candle/Candle";
import "./Wall.css";

/* Shared placeholder shown when AdSense is not configured */
function AdPlaceholder({ width, height }) {
  return (
    <div className="wall__ad-placeholder" style={{ maxWidth: width + "px" }}>
      <span className="wall__ad-placeholder-label">{width}×{height}</span>
      <a href="/contact" className="wall__ad-placeholder-link">
        Contactează-ne pentru a pune reclama ta aici
      </a>
    </div>
  );
}

const COLS = 24;
const AD_SPAN = 4; // inline ad slots per half-grid (desktop)

// Seeded pseudo-random inline ad placement for desktop
function buildAdRows(maxRow = 400) {
  let seed = 0xdeadbeef;
  const lcg = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) | 0;
    return (seed >>> 0) / 0xffffffff;
  };
  const morti = new Set();
  const vii   = new Set();
  for (let r = 5; r < maxRow; ) {
    r += 4 + Math.floor(lcg() * 5);
    if (r < maxRow) (lcg() < 0.5 ? morti : vii).add(r);
  }
  return { morti, vii };
}
const AD_ROWS = buildAdRows(400);

// Înlocuiește valorile de mai jos cu cele din contul tău AdSense
const ADSENSE_CLIENT = "ca-pub-XXXXXXXXXXXXXXXXX";
const ADSENSE_SLOTS = ["1234567890", "0987654321", "1122334455", "5544332211"];

const IS_ADSENSE_READY = !ADSENSE_CLIENT.includes("XXXXX");

// Mobile full-width banner (every 5 rows)
const MOBILE_FORMATS = [
  { width: 320, height: 50 },
  { width: 300, height: 250 },
];

// Desktop inline ad formats
const DESKTOP_FORMATS = [
  { width: 300, height: 250 },
  { width: 320, height: 50  },
  { width: 300, height: 250 },
  { width: 468, height: 60  },
];

/* Banner above the grid: 320×50 mobile / 728×90 desktop */
const TopBanner = memo(function TopBanner() {
  const ref = useRef(null);
  useEffect(() => {
    if (!IS_ADSENSE_READY) return;
    try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (_) {}
  }, []);
  return (
    <div className="wall__top-banner" ref={ref}>
      {IS_ADSENSE_READY ? (
        <ins className="adsbygoogle"
          style={{ display: "block" }}
          data-ad-client={ADSENSE_CLIENT}
          data-ad-slot={ADSENSE_SLOTS[3]}
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
      ) : (
        <>
          <div className="wall__top-banner-inner wall__top-banner-inner--mobile">
            <AdPlaceholder width={320} height={50} />
          </div>
          <div className="wall__top-banner-inner wall__top-banner-inner--desktop">
            <AdPlaceholder width={728} height={90} />
          </div>
        </>
      )}
    </div>
  );
});

/* Mobile-only full-width banner row */
const BannerAd = memo(function BannerAd({ adIndex }) {
  const ref = useRef(null);
  const slot = ADSENSE_SLOTS[adIndex % ADSENSE_SLOTS.length];
  const fmt = MOBILE_FORMATS[adIndex % MOBILE_FORMATS.length];
  useEffect(() => {
    if (!IS_ADSENSE_READY) return;
    try {
      if (ref.current && ref.current.offsetWidth > 0)
        (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (_) {}
  }, []);
  return (
    <div className="wall__banner-ad wall__banner-ad--mobile-only" ref={ref}>
      {IS_ADSENSE_READY ? (
        <ins className="adsbygoogle"
          style={{ display: "inline-block", width: `${fmt.width}px`, height: `${fmt.height}px` }}
          data-ad-client={ADSENSE_CLIENT}
          data-ad-slot={slot}
        />
      ) : (
        <div className="wall__banner-ad-inner" style={{ width: fmt.width + "px", height: fmt.height + "px" }}>
          <AdPlaceholder width={fmt.width} height={fmt.height} />
        </div>
      )}
    </div>
  );
});

/* Desktop-only inline ad inside half-grid */
const InlineAd = memo(function InlineAd({ adIndex }) {
  const ref = useRef(null);
  const slot = ADSENSE_SLOTS[adIndex % ADSENSE_SLOTS.length];
  const fmt = DESKTOP_FORMATS[adIndex % DESKTOP_FORMATS.length];
  useEffect(() => {
    if (!IS_ADSENSE_READY) return;
    try {
      if (ref.current && ref.current.offsetWidth > 0)
        (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (_) {}
  }, []);
  return (
    <div className="wall__slot-ad" ref={ref}>
      {IS_ADSENSE_READY ? (
        <ins className="adsbygoogle"
          style={{ display: "block", width: "100%", height: "100%" }}
          data-ad-client={ADSENSE_CLIENT}
          data-ad-slot={slot}
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
      ) : (
        <div className="wall__slot-ad-inner">
          <AdPlaceholder width={fmt.width} height={fmt.height} />
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
        items.push(<InlineAd key={`ad-${row}-${section}`} adIndex={row} />);
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
                : `${section === "morti" ? "Adormiți" : "Vii"} · ${isTop ? "Sus" : "Jos"} · ${price} RON`
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
      <TopBanner />

      <div className="wall__section-headers">
        <div className="wall__section-header wall__section-header--morti">
          Pentru Adormiți
        </div>
        <div className="wall__section-header wall__section-header--vii">
          Pentru Vii
        </div>
      </div>

      <div className="wall__body">
        {rows.flatMap((row) => {
          const isTop = meta ? row < meta.top_threshold_row : false;
          const price = isTop
            ? (meta?.price_top_lei ?? 10)
            : (meta?.price_bottom_lei ?? 5);
          const elements = [];
          // Mobile-only: full-width banner every 5 rows
          if (row > 0 && row % 5 === 0) {
            elements.push(<BannerAd key={`banner-${row}`} adIndex={row / 5} />);
          }
          const showMortiAd = AD_ROWS.morti.has(row);
          const showViiAd   = AD_ROWS.vii.has(row);
          elements.push(
            <div key={row} className="wall__row">
              <div className="wall__half wall__half--morti">
                {renderSlots(row, 0, mortiCount, "morti", isTop, price, showMortiAd)}
              </div>
              <div className="wall__half wall__half--vii">
                {renderSlots(row, splitCol, viiCount, "vii", isTop, price, showViiAd)}
              </div>
            </div>
          );
          return elements;
        })}
      </div>

      <div ref={sentinelRef} className="wall__sentinel">
        {isLoading && <span className="wall__loading">Se încarcă...</span>}
      </div>
    </main>
  );
}

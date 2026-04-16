import { useMemo, useEffect, useState, memo } from "react";
import { useInfiniteWall } from "../../hooks/useInfiniteWall";
import { useWallMeta } from "../../hooks/useWallMeta";
import { fetchBanners } from "../../services/api";
import Candle from "../Candle/Candle";
import "./Wall.css";

/* Shared placeholder shown when no banner is configured */
function AdPlaceholder({ width }) {
  return (
    <div className="wall__ad-placeholder" style={{ maxWidth: width + "px" }}>
      <span className="wall__ad-placeholder-label">{width}px</span>
      <a href="/contact" className="wall__ad-placeholder-link">
        Contactează-ne pentru a pune reclama ta aici
      </a>
    </div>
  );
}

/* Pick a random item from an array, or null if empty */
function pickRandom(arr) {
  if (!arr || arr.length === 0) return null;
  return arr[Math.floor(Math.random() * arr.length)];
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

/* Banner above the grid: 320×50 mobile / 728×90 desktop */
const TopBanner = memo(function TopBanner({ banners }) {
  const mobile  = pickRandom(banners?.top_mobile);
  const desktop = pickRandom(banners?.top_desktop);
  return (
    <div className="wall__top-banner">
      <div className="wall__top-banner-inner wall__top-banner-inner--mobile">
        {mobile ? (
          <a href={mobile.link_url} target="_blank" rel="noopener noreferrer">
            <img src={mobile.image_url} width={mobile.width} height={mobile.height} alt="Banner" style={{ display: "block", maxWidth: "100%" }} />
          </a>
        ) : (
          <AdPlaceholder width={320} height={50} />
        )}
      </div>
      <div className="wall__top-banner-inner wall__top-banner-inner--desktop">
        {desktop ? (
          <a href={desktop.link_url} target="_blank" rel="noopener noreferrer">
            <img src={desktop.image_url} width={desktop.width} height={desktop.height} alt="Banner" style={{ display: "block", maxWidth: "100%" }} />
          </a>
        ) : (
          <AdPlaceholder width={728} height={90} />
        )}
      </div>
    </div>
  );
});

/* Mobile-only full-width banner row */
const BannerAd = memo(function BannerAd({ banners }) {
  const banner = pickRandom(banners?.strip_mobile);
  const fmt = { width: 320, height: 50 };
  return (
    <div className="wall__banner-ad wall__banner-ad--mobile-only">
      {banner ? (
        <a href={banner.link_url} target="_blank" rel="noopener noreferrer">
          <img src={banner.image_url} width={banner.width} height={banner.height} alt="Banner" style={{ display: "block", maxWidth: "100%" }} />
        </a>
      ) : (
        <div className="wall__banner-ad-inner" style={{ width: fmt.width + "px", height: fmt.height + "px" }}>
          <AdPlaceholder width={fmt.width} height={fmt.height} />
        </div>
      )}
    </div>
  );
});

/* Desktop-only inline ad inside half-grid */
const InlineAd = memo(function InlineAd({ banners }) {
  const banner = pickRandom(banners?.inline_desktop);
  const fmt = { width: 300, height: 250 };
  return (
    <div className="wall__slot-ad">
      {banner ? (
        <a href={banner.link_url} target="_blank" rel="noopener noreferrer" style={{ display: "flex", width: "100%", height: "100%" }}>
          <img src={banner.image_url} width={banner.width} height={banner.height} alt="Banner" style={{ display: "block", maxWidth: "100%", objectFit: "contain" }} />
        </a>
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

  // Fetch all active banners once; group by placement for easy lookup
  const [banners, setBanners] = useState({});
  useEffect(() => {
    fetchBanners().then((list) => {
      const grouped = {};
      list.forEach((b) => {
        if (!grouped[b.placement]) grouped[b.placement] = [];
        grouped[b.placement].push(b);
      });
      setBanners(grouped);
    }).catch(() => {});
  }, []);

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
        items.push(<InlineAd key={`ad-${row}-${section}`} banners={banners} />);
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
      <TopBanner banners={banners} />

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
            elements.push(<BannerAd key={`banner-${row}`} banners={banners} />);
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

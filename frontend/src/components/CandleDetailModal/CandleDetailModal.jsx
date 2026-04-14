import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { fetchCandleDetail } from "../../services/api";
import "./CandleDetailModal.css";

function formatTimeLeft(expiresAt) {
  const ms = expiresAt - Date.now();
  if (ms <= 0) return { label: "Lumânarea s-a stins", expired: true };
  const totalMin = Math.floor(ms / 60_000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 0) return { label: `Mai arde ${h}h ${m}min`, expired: false };
  return { label: `Mai arde ${m} minut${m === 1 ? "" : "e"}`, expired: false };
}

function formatLitAt(litAt) {
  return litAt.toLocaleString("ro-RO", {
    day: "numeric", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function CandleDetailModal({ candleId, onClose }) {
  const { data: candle, isLoading, isError } = useQuery({
    queryKey: ["candle", candleId],
    queryFn: () => fetchCandleDetail(candleId),
  });

  const expiresAt = candle?.expires_at ? new Date(candle.expires_at) : null;
  const litAt = candle?.lit_at ? new Date(candle.lit_at) : null;

  // Tick every 30s so the countdown stays fresh
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!expiresAt) return;
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, [expiresAt?.getTime()]);

  const timeLeft = expiresAt ? formatTimeLeft(expiresAt) : null;

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal modal--detail" role="dialog" aria-modal="true">
        <button className="modal__close" onClick={onClose} aria-label="Închide">✕</button>

        {isLoading && <p className="detail__loading">Se încarcă...</p>}
        {isError && <p className="modal__error">Nu s-a putut încărca lumânarea.</p>}

        {candle && (
          <>
            <div className="detail__flame-icon" aria-hidden="true">🕯</div>
            <h2 className="modal__title">{candle.dedicated_to_name}</h2>
            <p className="detail__type">
              {candle.dedication_type === "viu" ? "Lumânare pentru vii" : "Lumânare pentru morți"}
            </p>

            {candle.photo_url && (
              <img
                className="detail__photo"
                src={candle.photo_url}
                alt={`Fotografie pentru ${candle.dedicated_to_name}`}
              />
            )}

            {litAt && (
              <p className="detail__expiry">
                Aprinsă: {formatLitAt(litAt)}
              </p>
            )}
            {timeLeft && (
              <p className={`detail__expiry${timeLeft.expired ? " detail__expiry--expired" : ""}`}>
                {timeLeft.label}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

import { useState } from "react";
import { useWallMeta } from "../../hooks/useWallMeta";
import { createFreeCandle } from "../../services/api";
import Candle from "../Candle/Candle";
import "./LightCandleModal.css";

const STEPS = { FREE: "free", SUCCESS: "success", LIMIT: "limit" };

export default function LightCandleModal({ slot, onClose, onLit }) {
  const { data: meta } = useWallMeta();

  const [step, setStep] = useState(STEPS.FREE);

  // Free candle state
  const [freeForm, setFreeForm] = useState({ phone: "", requester_name: "", dedicated_to_name: "" });

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Derive zone info from slot position
  const splitCol = meta?.split_col ?? 6;
  const isMorti = slot.col < splitCol;
  const dedicatiaLabel = isMorti ? "Pentru Adormiți" : "Pentru Vii";
  const isDemoMode = meta?.demo_mode ?? true;
  const decoCandle = { col: slot.col, row: slot.row, dedication_type: isMorti ? "morti" : "vii", has_photo: false };

  async function handleFreeSubmit(e) {
    e.preventDefault();
    if (!freeForm.phone.trim()) { setError("Numărul de telefon este obligatoriu."); return; }
    if (!freeForm.requester_name.trim()) { setError("Numele tău este obligatoriu."); return; }
    if (!freeForm.dedicated_to_name.trim()) { setError("Numele celui pentru care aprinzi este obligatoriu."); return; }
    setError("");
    setSubmitting(true);
    try {
      await createFreeCandle({
        phone: freeForm.phone.trim(),
        requester_name: freeForm.requester_name.trim(),
        dedicated_to_name: freeForm.dedicated_to_name.trim(),
        col: slot.col,
        row: slot.row,
      });
      window.dispatchEvent(new CustomEvent("candle-lit", { detail: { col: slot.col, row: slot.row } }));
      onLit?.(slot.col, slot.row);
      setStep(STEPS.SUCCESS);
    } catch (err) {
      const detail = err.response?.data?.detail ?? "";
      // Specific error: already has a free candle active
      if (detail.includes("deja") || detail.includes("gratuit")) {
        setStep(STEPS.LIMIT);
      } else {
        setError(
          detail ||
          err.response?.data?.phone?.[0] ||
          err.response?.data?.dedicated_to_name?.[0] ||
          "A apărut o eroare. Încearcă din nou."
        );
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true">
        <button className="modal__close" onClick={onClose} aria-label="Închide">✕</button>

        {/* ── Step LIMIT: already has a free candle ── */}
        {step === STEPS.LIMIT && (
          <div className="modal__limit">
            <div className="modal__success-icon"><Candle candle={decoCandle} /></div>
            <h2 className="modal__title">Ai deja o lumânare aprinsă</h2>
            <p className="modal__sub">
              Fiecare persoană poate aprinde <strong>o lumânare gratuită</strong> simultan.<br />
              După ce lumânarea ta se stinge (12 ore), poți aprinde alta gratuit.
            </p>
            <p className="modal__sub" style={{ marginTop: "0.5rem", color: "#f7c948" }}>
              Vrei să aprinzi mai multe? Contactează-ne pentru opțiuni cu plată.
            </p>
            <button className="modal__btn" onClick={onClose}>Am înțeles</button>
          </div>
        )}

        {/* ── Step FREE: phone + name — no auth, no payment ── */}
        {step === STEPS.FREE && (
          <>
            <div className="modal__flame" aria-hidden="true"><Candle candle={decoCandle} /></div>
            <h2 className="modal__title">Aprinde o lumânare {dedicatiaLabel}</h2>
            <p className="modal__sub">
              Complet ează datele de mai jos — lumânarea se aprinde instant, gratuit.
            </p>
            <form onSubmit={handleFreeSubmit} className="modal__form" noValidate>
              <label className="modal__label">
                Numărul tău de telefon *
                <input
                  className="modal__input modal__input--phone"
                  type="tel"
                  inputMode="tel"
                  placeholder="07XXXXXXXX"
                  autoComplete="tel"
                  value={freeForm.phone}
                  onChange={(e) => setFreeForm({ ...freeForm, phone: e.target.value })}
                  required
                />
              </label>
              <label className="modal__label">
                Numele tău *
                <input
                  className="modal__input"
                  type="text"
                  maxLength={100}
                  placeholder="Prenume Nume"
                  value={freeForm.requester_name}
                  onChange={(e) => setFreeForm({ ...freeForm, requester_name: e.target.value })}
                  required
                />
              </label>
              <label className="modal__label">
                Cui îi aprinzi lumânarea? *
                <input
                  className="modal__input"
                  type="text"
                  maxLength={200}
                  placeholder="Nume prenume"
                  value={freeForm.dedicated_to_name}
                  onChange={(e) => setFreeForm({ ...freeForm, dedicated_to_name: e.target.value })}
                  required
                />
              </label>
              {error && <p className="modal__error">{error}</p>}
              <button className="modal__btn modal__btn--free" type="submit" disabled={submitting}>
                {submitting ? "Se aprinde..." : "Aprinde lumânare"}
              </button>
            </form>
          </>
        )}

        {/* ── Step 5: Success ── */}
        {step === STEPS.SUCCESS && (
          <div className="modal__success">
            <div className="modal__success-icon"><Candle candle={decoCandle} /></div>
            <h2 className="modal__title">Lumânarea a fost aprinsă!</h2>
            <p className="modal__sub">
              Lumânarea pentru <strong>{freeForm.dedicated_to_name}</strong> va arde 12 ore.
              {freeForm.phone
                ? " Vei primi un SMS de reînnoire după 12 ore."
                : !isDemoMode
                  ? " Vei primi un SMS când este pe cale să se stingă."
                  : " (Mod Demo)"}
            </p>
            <button className="modal__btn" onClick={onClose}>Închide</button>
          </div>
        )}
      </div>
    </div>
  );
}

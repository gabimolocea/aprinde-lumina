import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import "./LoginScreen.css";

const STEPS = { PHONE: "phone", OTP: "otp" };

export default function LoginScreen({ onClose }) {
  const { sendOTP, confirmOTP } = useAuth();
  const [step, setStep] = useState(STEPS.PHONE);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  async function handleSendOTP(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await sendOTP(phone.trim());
      setStep(STEPS.OTP);
      startCountdown(60);
    } catch (err) {
      setError(
        err.response?.data?.phone?.[0] ??
        err.response?.data?.detail ??
        "Nu s-a putut trimite SMS-ul. Încearcă din nou."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOTP(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await confirmOTP(phone.trim(), code.trim());
      // AuthContext sets user → App re-renders
    } catch (err) {
      setError(
        err.response?.data?.detail ??
        "Cod greșit sau expirat. Încearcă din nou."
      );
    } finally {
      setLoading(false);
    }
  }

  function startCountdown(seconds) {
    setCountdown(seconds);
    const id = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) { clearInterval(id); return 0; }
        return c - 1;
      });
    }, 1000);
  }

  return (
    <div className={onClose ? "login login--overlay" : "login"} onClick={onClose ? (e) => { if (e.target === e.currentTarget) onClose(); } : undefined}>
      <div className="login__card">
        {onClose && (
          <button className="login__close" onClick={onClose} aria-label="Închide">✕</button>
        )}
        <div className="login__flame" aria-hidden="true">🕯</div>
        <h1 className="login__title">Lumânar</h1>
        <p className="login__sub">Intră în cont cu numărul tău de telefon</p>

        {step === STEPS.PHONE && (
          <form className="login__form" onSubmit={handleSendOTP}>
            <label className="login__label" htmlFor="phone-input">
              Număr de telefon
            </label>
            <input
              id="phone-input"
              className="login__input login__input--big"
              type="tel"
              inputMode="tel"
              placeholder="07XXXXXXXX"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
            {error && <p className="login__error">{error}</p>}
            <button className="login__btn" type="submit" disabled={loading}>
              {loading ? "Se trimite..." : "Trimite cod SMS"}
            </button>
          </form>
        )}

        {step === STEPS.OTP && (
          <form className="login__form" onSubmit={handleVerifyOTP}>
            <p className="login__hint">
              Introdu codul de 6 cifre primit pe <strong>{phone}</strong>
            </p>
            <input
              className="login__input login__input--otp"
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              placeholder="• • • • • •"
              autoComplete="one-time-code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              required
            />
            {error && <p className="login__error">{error}</p>}
            <button className="login__btn" type="submit" disabled={loading || code.length < 6}>
              {loading ? "Se verifică..." : "Verifică codul"}
            </button>
            <button
              className="login__link"
              type="button"
              disabled={countdown > 0}
              onClick={() => { setStep(STEPS.PHONE); setCode(""); setError(""); }}
            >
              {countdown > 0
                ? `Retrimite în ${countdown}s`
                : "Nu ai primit codul? Retrimite"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

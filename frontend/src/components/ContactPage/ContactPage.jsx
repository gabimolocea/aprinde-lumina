import { useState } from "react";
import { submitContact } from "../../services/api";
import "./ContactPage.css";

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  function set(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await submitContact(form);
      setSuccess(true);
    } catch (err) {
      const detail =
        err.response?.data?.detail ||
        Object.values(err.response?.data ?? {})?.[0]?.[0] ||
        "A apărut o eroare. Încearcă din nou.";
      setError(detail);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="contact-page">
      <div className="contact-page__card">
        <a href="/" className="contact-page__back">← Înapoi la lumânări</a>
        <h1 className="contact-page__title">Contactează-ne</h1>
        <p className="contact-page__sub">
          Vrei să plasezi o reclamă pe Lumânar sau ai o întrebare? Scrie-ne mai jos.
        </p>

        {success ? (
          <div className="contact-page__success">
            <p>Mesajul tău a fost trimis! Te vom contacta în curând.</p>
            <a href="/" className="contact-page__btn">Înapoi la lumânări</a>
          </div>
        ) : (
          <form className="contact-page__form" onSubmit={handleSubmit}>
            <label className="contact-page__label">
              Numele tău *
              <input
                className="contact-page__input"
                type="text"
                maxLength={150}
                required
                value={form.name}
                onChange={set("name")}
                placeholder="Prenume Nume"
              />
            </label>

            <label className="contact-page__label">
              Email *
              <input
                className="contact-page__input"
                type="email"
                required
                value={form.email}
                onChange={set("email")}
                placeholder="adresa@email.com"
              />
            </label>

            <label className="contact-page__label">
              Telefon (opțional)
              <input
                className="contact-page__input"
                type="tel"
                maxLength={30}
                value={form.phone}
                onChange={set("phone")}
                placeholder="07XXXXXXXX"
              />
            </label>

            <label className="contact-page__label">
              Mesajul tău *
              <textarea
                className="contact-page__input contact-page__textarea"
                required
                rows={5}
                maxLength={2000}
                value={form.message}
                onChange={set("message")}
                placeholder="Descrie ce dorești..."
              />
            </label>

            {error && <p className="contact-page__error">{error}</p>}

            <button
              className="contact-page__btn"
              type="submit"
              disabled={submitting}
            >
              {submitting ? "Se trimite..." : "Trimite mesajul"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

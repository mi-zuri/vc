import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shell } from '../components/Layout.jsx';

const INTEREST_OPTIONS = [
  'muzyka', 'historia', 'gotowanie', 'spacery', 'książki',
  'gry planszowe', 'ogrodnictwo', 'rękodzieło', 'film', 'sport',
  'poezja', 'teatr', 'szachy', 'fotografia'
];
const DAYS = [
  { key: 'mon', label: 'Pon' },
  { key: 'tue', label: 'Wt' },
  { key: 'wed', label: 'Śr' },
  { key: 'thu', label: 'Czw' },
  { key: 'fri', label: 'Pt' },
  { key: 'sat', label: 'Sb' },
  { key: 'sun', label: 'Nd' },
];

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    first_name: '', city: '', email: '', phone: '',
    days: [], hours: 'po_17',
    interests: [],
    experience_level: 2,
    motivation: '',
    rodo_consent: false,
  });
  const [err, setErr] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const toggle = (key, value) => {
    setForm((f) => {
      const arr = f[key];
      return { ...f, [key]: arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value] };
    });
  };

  const submit = async (e) => {
    e.preventDefault();
    setErr(null);
    if (!form.first_name || !form.city || !form.email) {
      setErr('Wypełnij imię, miasto i e-mail.');
      return;
    }
    if (!form.rodo_consent) {
      setErr('Aby kontynuować, potwierdź zgodę na przetwarzanie danych.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/volunteers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: form.first_name,
          city: form.city,
          email: form.email,
          phone: form.phone || null,
          availability: { days: form.days, hours: form.hours },
          interests: form.interests,
          experience_level: Number(form.experience_level),
          motivation: form.motivation,
          rodo_consent: form.rodo_consent,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'nie udało się zapisać');
      }
      const volunteer = await res.json();
      navigate(`/seniorzy-czekajacy?volunteerId=${volunteer.id}`);
    } catch (e) {
      setErr(e.message || 'Coś poszło nie tak');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Shell>
      <section className="section">
        <div className="wrap">
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <div className="eyebrow" style={{ justifyContent: 'center' }}>
              <span className="dot" /> Krok 1 z 3
            </div>
            <h1 style={{ maxWidth: '20ch', margin: '0 auto 16px' }}>Zostań wolontariuszem.</h1>
            <p style={{ color: 'var(--ink-soft)', maxWidth: '50ch', margin: '0 auto', fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 19 }}>
              Kilka pytań o Tobie i Twoim czasie. Bez zdjęć, bez CV.
            </p>
          </div>

          <form className="form-card" onSubmit={submit} noValidate>
            {err && <div className="inline-err">{err}</div>}

            <div className="field">
              <label htmlFor="first_name">Imię *</label>
              <input id="first_name" type="text" required value={form.first_name}
                onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
            </div>

            <div className="field">
              <label htmlFor="city">Miasto *</label>
              <input id="city" type="text" required value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </div>

            <div className="field">
              <label htmlFor="email">E-mail *</label>
              <input id="email" type="email" required value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>

            <div className="field">
              <label htmlFor="phone">Telefon (opcjonalnie)</label>
              <input id="phone" type="tel" value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>

            <div className="field">
              <label>Dni dostępności</label>
              <div className="checkline">
                {DAYS.map(d => (
                  <label key={d.key} className={`chip ${form.days.includes(d.key) ? 'on' : ''}`}>
                    <input type="checkbox" checked={form.days.includes(d.key)}
                      onChange={() => toggle('days', d.key)} />
                    {d.label}
                  </label>
                ))}
              </div>
            </div>

            <div className="field">
              <label htmlFor="hours">Pora dnia</label>
              <select id="hours" value={form.hours}
                onChange={(e) => setForm({ ...form, hours: e.target.value })}>
                <option value="rano">Rano (8:00–12:00)</option>
                <option value="popoludnie">Popołudnie (12:00–17:00)</option>
                <option value="po_17">Wieczorem (po 17:00)</option>
                <option value="elastycznie">Elastycznie</option>
              </select>
            </div>

            <div className="field">
              <label>Zainteresowania</label>
              <div className="checkline">
                {INTEREST_OPTIONS.map(i => (
                  <label key={i} className={`chip ${form.interests.includes(i) ? 'on' : ''}`}>
                    <input type="checkbox" checked={form.interests.includes(i)}
                      onChange={() => toggle('interests', i)} />
                    {i}
                  </label>
                ))}
              </div>
              <p className="field-hint">Zaznacz tematy, w których czujesz się swobodnie w rozmowie.</p>
            </div>

            <div className="field">
              <label htmlFor="experience_level">Doświadczenie z osobami starszymi (1–5)</label>
              <input id="experience_level" type="range" min="1" max="5"
                value={form.experience_level}
                onChange={(e) => setForm({ ...form, experience_level: e.target.value })}
                style={{ width: '100%', accentColor: 'var(--primary)' }} />
              <p className="field-hint">Aktualna wartość: <strong>{form.experience_level}</strong>. 1 = żadne, 5 = pracuję z seniorami zawodowo. To tylko wskazówka dla koordynatora.</p>
            </div>

            <div className="field">
              <label htmlFor="motivation">Co Cię motywuje? (opcjonalnie)</label>
              <textarea id="motivation" value={form.motivation}
                onChange={(e) => setForm({ ...form, motivation: e.target.value })}
                placeholder="Kilka zdań — jak chcesz, o czym byś rozmawiał(a), co chciałbyś dać i dostać." />
            </div>

            <div className="field">
              <label className="consent">
                <input type="checkbox" checked={form.rodo_consent}
                  onChange={(e) => setForm({ ...form, rodo_consent: e.target.checked })} />
                <span>
                  Zgadzam się na przetwarzanie moich danych przez Fundację mbU w celu realizacji programu „Obecność". Dane nie będą udostępniane osobom trzecim.
                </span>
              </label>
            </div>

            <button type="submit" className="btn btn-cta btn-lg" disabled={submitting} style={{ width: '100%' }}>
              {submitting ? 'Zapisuję…' : 'Przejdź do listy seniorów →'}
            </button>
          </form>
        </div>
      </section>
    </Shell>
  );
}

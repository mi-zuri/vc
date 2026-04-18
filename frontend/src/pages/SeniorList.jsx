import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Shell } from '../components/Layout.jsx';

function initials(name) {
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

function weeksSince(dateStr) {
  const d = new Date(dateStr);
  const diff = Math.max(1, Math.round((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24 * 7)));
  return diff;
}

export default function SeniorList() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const volunteerId = params.get('volunteerId');

  const [seniors, setSeniors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [selected, setSelected] = useState([]);
  const [cityFilter, setCityFilter] = useState('');
  const [interestFilter, setInterestFilter] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!volunteerId) {
      setErr('Brakuje identyfikatora wolontariusza. Wróć do formularza.');
      setLoading(false);
      return;
    }
    fetch('/api/seniors')
      .then(r => r.json())
      .then(data => { setSeniors(data); setLoading(false); })
      .catch(() => { setErr('Nie udało się pobrać listy'); setLoading(false); });
  }, [volunteerId]);

  const cities = useMemo(() => Array.from(new Set(seniors.map(s => s.city))).sort(), [seniors]);
  const allInterests = useMemo(() => {
    const s = new Set();
    seniors.forEach(sn => (sn.interests || []).forEach(i => s.add(i)));
    return Array.from(s).sort();
  }, [seniors]);

  const filtered = useMemo(() => {
    return seniors.filter(s => {
      if (cityFilter && s.city !== cityFilter) return false;
      if (interestFilter && !(s.interests || []).includes(interestFilter)) return false;
      return true;
    });
  }, [seniors, cityFilter, interestFilter]);

  const toggle = (id) => {
    setSelected(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= 5) return prev;
      return [...prev, id];
    });
  };

  const submit = async () => {
    if (!selected.length) return;
    setSubmitting(true);
    setErr(null);
    try {
      const res = await fetch(`/api/volunteers/${volunteerId}/proposals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senior_ids: selected }),
      });
      if (!res.ok) throw new Error('nie udało się zapisać propozycji');
      navigate(`/oczekiwanie?volunteerId=${volunteerId}`);
    } catch (e) {
      setErr(e.message);
      setSubmitting(false);
    }
  };

  return (
    <Shell>
      <section className="section">
        <div className="wrap">
          <div style={{ marginBottom: 40, maxWidth: '60ch' }}>
            <div className="eyebrow"><span className="dot" /> Krok 2 z 3</div>
            <h1 style={{ marginBottom: 18 }}>Z kim czułbyś się komfortowo?</h1>
            <p style={{ color: 'var(--ink-soft)', fontSize: 17, lineHeight: 1.5 }}>
              Wskaż od jednej do pięciu osób. <strong>Ostateczne dopasowanie wykona koordynator mbU</strong>,
              uwzględniając też preferencje seniora. Ty proponujesz — nie wybierasz.
            </p>
          </div>

          {err && <div className="inline-err">{err}</div>}

          {!loading && seniors.length > 0 && (
            <div className="filter-bar">
              <div>
                <label htmlFor="city">Miasto</label>
                <select id="city" value={cityFilter} onChange={(e) => setCityFilter(e.target.value)}>
                  <option value="">wszystkie</option>
                  {cities.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="interest">Zainteresowanie</label>
                <select id="interest" value={interestFilter} onChange={(e) => setInterestFilter(e.target.value)}>
                  <option value="">dowolne</option>
                  {allInterests.map(i => <option key={i} value={i}>{i}</option>)}
                </select>
              </div>
              <div style={{ marginLeft: 'auto', color: 'var(--ink-mute)', fontSize: 14 }}>
                {filtered.length} {filtered.length === 1 ? 'osoba' : 'osób'} pasuje
              </div>
            </div>
          )}

          {loading && <div className="empty">Wczytuję…</div>}
          {!loading && filtered.length === 0 && <div className="empty">Żadna osoba nie pasuje do filtrów.</div>}

          <div className="senior-grid">
            {filtered.map(s => {
              const on = selected.includes(s.id);
              return (
                <article
                  key={s.id}
                  className={`senior-card ${on ? 'selected' : ''}`}
                  onClick={() => toggle(s.id)}
                  role="button"
                  aria-pressed={on}
                >
                  <div className="check" />
                  <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                    <div className="avatar">{initials(s.display_name)}</div>
                    <div>
                      <h3>{s.display_name}</h3>
                      <div className="meta">{s.age_range} · {s.city}{s.district ? `, ${s.district}` : ''}</div>
                    </div>
                  </div>
                  <p className="desc">{s.short_description}</p>
                  <div className="tags">
                    {(s.interests || []).slice(0, 4).map(t => <span key={t}>{t}</span>)}
                  </div>
                  <div className="waiting">Czeka {weeksSince(s.waiting_since)} tygodni</div>
                </article>
              );
            })}
          </div>

          {filtered.length > 0 && (
            <div className="select-bar">
              <div style={{ color: 'var(--ink-soft)', fontSize: 15 }}>
                Wybrano <strong>{selected.length}</strong> {selected.length === 1 ? 'osobę' : 'osób'} (maks. 5)
              </div>
              <button className="btn btn-cta btn-lg"
                disabled={!selected.length || submitting}
                onClick={submit}>
                {submitting ? 'Wysyłam…' : 'Zaproponuj spotkanie →'}
              </button>
            </div>
          )}
        </div>
      </section>
    </Shell>
  );
}

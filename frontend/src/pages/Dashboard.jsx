import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Shell } from '../components/Layout.jsx';

function initials(name) {
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

const MOODS = [
  { key: 'happy', label: 'Bardzo dobrze' },
  { key: 'good', label: 'Dobrze' },
  { key: 'neutral', label: 'Zwyczajnie' },
  { key: 'worried', label: 'Coś mnie niepokoi' },
];

function MoodLabel({ mood }) {
  const m = MOODS.find(x => x.key === mood);
  return m ? <span className="mood">{m.label}</span> : null;
}

function VisitModal({ assignmentId, onClose, onAdded }) {
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    duration_minutes: 60,
    what_we_did: '',
    mood: 'good',
    anecdote: '',
    next_time_plan: '',
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    try {
      const res = await fetch('/api/visits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignment_id: assignmentId, ...form }),
      });
      if (!res.ok) throw new Error('nie udało się zapisać');
      const visit = await res.json();
      onAdded(visit);
    } catch (e) {
      setErr(e.message);
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={save}>
        <h3>Nowy wpis po wizycie</h3>
        {err && <div className="inline-err">{err}</div>}
        <div className="field">
          <label>Data</label>
          <input type="text" value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })} />
          <p className="field-hint">Format RRRR-MM-DD.</p>
        </div>
        <div className="field">
          <label>Czas trwania (minut)</label>
          <input type="text" value={form.duration_minutes}
            onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })} />
        </div>
        <div className="field">
          <label>Co robiliście</label>
          <textarea value={form.what_we_did}
            onChange={(e) => setForm({ ...form, what_we_did: e.target.value })} />
        </div>
        <div className="field">
          <label>Nastrój seniora</label>
          <div className="mood-row">
            {MOODS.map(m => (
              <div key={m.key}
                className={`mood-opt ${form.mood === m.key ? 'on' : ''}`}
                onClick={() => setForm({ ...form, mood: m.key })}>
                {m.label}
              </div>
            ))}
          </div>
        </div>
        <div className="field">
          <label>Anegdota / co ciekawego powiedział(a)?</label>
          <textarea value={form.anecdote}
            onChange={(e) => setForm({ ...form, anecdote: e.target.value })} />
        </div>
        <div className="field">
          <label>Plan na następny raz</label>
          <textarea value={form.next_time_plan}
            onChange={(e) => setForm({ ...form, next_time_plan: e.target.value })} />
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-ghost" onClick={onClose}>Anuluj</button>
          <button type="submit" className="btn btn-cta" disabled={saving}>
            {saving ? 'Zapisuję…' : 'Zapisz wpis'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function Dashboard() {
  const [params] = useSearchParams();
  const volunteerId = params.get('volunteerId');

  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [duration, setDuration] = useState('1h');
  const [location, setLocation] = useState('mieszkanie');
  const [energy, setEnergy] = useState('normalnie');
  const [ideas, setIdeas] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [showVisitModal, setShowVisitModal] = useState(false);

  useEffect(() => {
    if (!volunteerId) {
      setErr('Brak identyfikatora wolontariusza.');
      return;
    }
    fetch(`/api/volunteers/${volunteerId}/dashboard`)
      .then(r => r.json())
      .then(setData)
      .catch(() => setErr('Nie udało się pobrać pulpitu'));
  }, [volunteerId]);

  const savePlanned = async (idea) => {
    if (!data?.assignment) return;
    try {
      const res = await fetch('/api/planned-ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignment_id: data.assignment.id, ...idea }),
      });
      if (!res.ok) throw new Error('nie udało się zapisać');
      const saved = await res.json();
      setData(d => ({ ...d, planned: [saved, ...(d.planned || [])] }));
      setIdeas(list => list.map(x => x === idea ? { ...x, _saved: true } : x));
    } catch (e) {
      setErr(e.message);
    }
  };

  const removePlanned = async (id) => {
    try {
      await fetch(`/api/planned-ideas/${id}`, { method: 'DELETE' });
      setData(d => ({ ...d, planned: (d.planned || []).filter(p => p.id !== id) }));
    } catch (e) {
      setErr('Nie udało się usunąć');
    }
  };

  const generate = async () => {
    if (!data?.assignment) return;
    setGenerating(true);
    try {
      const res = await fetch('/api/inspirations/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignment_id: data.assignment.id,
          duration, location, energy,
        }),
      });
      const body = await res.json();
      setIdeas(body.inspirations || []);
    } catch (e) {
      setErr('Nie udało się wygenerować pomysłów');
    } finally {
      setGenerating(false);
    }
  };

  if (err) return <Shell><div className="empty">{err} <Link to="/">Wróć na stronę główną →</Link></div></Shell>;
  if (!data) return <Shell><div className="empty">Wczytuję pulpit…</div></Shell>;

  if (!data.assignment) {
    return (
      <Shell>
        <div className="empty">
          <p>Jeszcze nie masz dopasowanego seniora.</p>
          <Link className="btn btn-cta" to={`/seniorzy-czekajacy?volunteerId=${volunteerId}`}>Zaproponuj osobę</Link>
        </div>
      </Shell>
    );
  }

  const { senior, volunteer, assignment, visits } = data;
  const planned = data.planned || [];

  return (
    <Shell>
      <section className="dash">
        <div className="wrap">
          <div style={{ marginBottom: 32 }}>
            <div className="eyebrow"><span className="dot" /> Twój pulpit</div>
            <h1>Dzień dobry, <em style={{ fontStyle: 'italic', color: 'var(--primary)' }}>{volunteer.first_name}</em>.</h1>
          </div>

          <div className="dash-grid">
            {/* SENIOR PANEL */}
            <div className="panel">
              <div className="panel-kicker">Twoja osoba do towarzystwa</div>
              <div className="senior-detail">
                <div className="avatar">{initials(senior.display_name)}</div>
                <div>
                  <h2 style={{ fontSize: 30 }}>{senior.display_name}</h2>
                  <div style={{ color: 'var(--ink-mute)', fontSize: 14, marginTop: 4 }}>
                    {senior.age_range} · {senior.city}{senior.district ? `, ${senior.district}` : ''} · sprawność: {senior.mobility}
                  </div>
                  <p style={{ color: 'var(--ink-soft)', marginTop: 14, lineHeight: 1.6 }}>
                    {senior.full_description}
                  </p>
                  <div className="tags">
                    {(senior.interests || []).map(t => <span key={t}>{t}</span>)}
                  </div>

                  <div className="sd-grid">
                    <div>
                      <h4>Lubi</h4>
                      <ul>
                        {(senior.likes || []).map(l => <li key={l}>· {l}</li>)}
                      </ul>
                    </div>
                    <div>
                      <h4>Tematy, których unikać</h4>
                      <ul>
                        {(senior.avoid_topics || []).length
                          ? senior.avoid_topics.map(t => <li key={t}>· {t}</li>)
                          : <li style={{ color: 'var(--ink-mute)', fontStyle: 'italic' }}>— brak zastrzeżeń</li>}
                      </ul>
                    </div>
                  </div>

                  <div style={{ marginTop: 18, fontSize: 13, color: 'var(--ink-mute)' }}>
                    Poznaliście się: {new Date(assignment.matched_at).toLocaleDateString('pl-PL')}
                  </div>
                </div>
              </div>
            </div>

            {/* INSPIRATION GENERATOR */}
            <div className="panel">
              <div className="panel-kicker">Generator pomysłów</div>
              <h2>Pomysły na następne spotkanie</h2>
              <p style={{ color: 'var(--ink-soft)', marginTop: 8 }}>
                Każdy pomysł ma uzasadnienie — dlaczego właśnie dla Was. Możesz generować wiele razy.
              </p>

              <div className="ig-controls">
                <div className="field" style={{ marginBottom: 0 }}>
                  <label>Czas</label>
                  <select value={duration} onChange={(e) => setDuration(e.target.value)}>
                    <option value="30min">30 minut</option>
                    <option value="45min">45 minut</option>
                    <option value="1h">1 godzina</option>
                    <option value="2h">2 godziny</option>
                  </select>
                </div>
                <div className="field" style={{ marginBottom: 0 }}>
                  <label>Miejsce</label>
                  <select value={location} onChange={(e) => setLocation(e.target.value)}>
                    <option value="mieszkanie">Mieszkanie</option>
                    <option value="spacer">Spacer / park</option>
                    <option value="kawiarnia">Kawiarnia</option>
                  </select>
                </div>
                <div className="field" style={{ marginBottom: 0 }}>
                  <label>Energia dziś</label>
                  <select value={energy} onChange={(e) => setEnergy(e.target.value)}>
                    <option value="zmęczona">Zmęczona</option>
                    <option value="normalnie">Normalnie</option>
                    <option value="w_formie">W dobrej formie</option>
                  </select>
                </div>
                <button type="button" className="btn btn-cta" onClick={generate} disabled={generating}>
                  {generating ? 'Generuję…' : 'Wygeneruj pomysły'}
                </button>
              </div>

              {ideas.length > 0 && (
                <div className="ig-cards">
                  {ideas.map((idea, i) => (
                    <article key={i} className="ig-card">
                      <h3>{idea.title}</h3>
                      <div className="meta">
                        <span>⏱ {idea.duration}</span>
                      </div>
                      <p className="desc">{idea.description}</p>
                      <div className="reasoning">
                        <strong>Dlaczego dla Was?</strong><br />
                        {idea.reasoning}
                      </div>
                      {idea.prep && <p className="prep"><strong>Co warto przygotować:</strong> {idea.prep}</p>}
                      <div className="ig-actions">
                        <button type="button" className="btn btn-ghost" style={{ flex: 1 }}
                          disabled={idea._saved}
                          onClick={() => savePlanned(idea)}>
                          {idea._saved ? '✓ Zapisano' : 'Zapisz na następne'}
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}

              {ideas.length === 0 && !generating && (
                <div style={{ color: 'var(--ink-mute)', fontStyle: 'italic', padding: '8px 0' }}>
                  Ustaw kontekst powyżej i kliknij „Wygeneruj pomysły".
                </div>
              )}
            </div>

            {/* JOURNAL */}
            <div className="panel">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', gap: 20 }}>
                <div>
                  <div className="panel-kicker">Dziennik</div>
                  <h2>Historia, którą razem zapisujecie</h2>
                </div>
                <button type="button" className="btn btn-cta" onClick={() => setShowVisitModal(true)}>
                  + Dodaj wpis po wizycie
                </button>
              </div>

              {planned.length > 0 && (
                <div style={{ marginTop: 24 }}>
                  <h4 style={{ fontFamily: 'var(--sans)', fontSize: 12, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-mute)', fontWeight: 600, marginBottom: 12 }}>
                    Zaplanowane na następne spotkania
                  </h4>
                  <div className="journal-list">
                    {planned.map(p => (
                      <div key={p.id} className="journal-item planned">
                        <div className="date">
                          <span style={{ color: 'var(--primary)' }}>◆ Zaplanowane</span>
                          {p.duration && ` · ${p.duration}`}
                        </div>
                        <p style={{ fontWeight: 600, color: 'var(--ink)', marginTop: 4 }}>{p.title}</p>
                        {p.description && <p style={{ marginTop: 6 }}>{p.description}</p>}
                        {p.reasoning && <div className="anecdote">{p.reasoning}</div>}
                        {p.prep && <p style={{ marginTop: 8, fontSize: 14 }}><strong>Przygotować:</strong> {p.prep}</p>}
                        <button type="button" className="btn btn-ghost"
                          style={{ marginTop: 12, padding: '6px 14px', fontSize: 13 }}
                          onClick={() => removePlanned(p.id)}>
                          Usuń z planu
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {visits.length === 0 && planned.length === 0 && (
                <div className="journal-item" style={{ marginTop: 24, textAlign: 'center', color: 'var(--ink-mute)' }}>
                  Jeszcze nie ma wpisów. Po pierwszym spotkaniu dodaj krótką notatkę — co zapamiętać, co zrobić następnym razem.
                </div>
              )}

              {visits.length > 0 && (
                <h4 style={{ fontFamily: 'var(--sans)', fontSize: 12, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-mute)', fontWeight: 600, margin: '32px 0 12px' }}>
                  Odbyte spotkania
                </h4>
              )}

              <div className="journal-list">
                {visits.map(v => (
                  <div key={v.id} className="journal-item">
                    <div className="date">
                      {new Date(v.date).toLocaleDateString('pl-PL')}
                      {v.duration_minutes && ` · ${v.duration_minutes} min`}
                      <MoodLabel mood={v.mood} />
                    </div>
                    {v.what_we_did && <p><strong>Co robiliśmy:</strong> {v.what_we_did}</p>}
                    {v.anecdote && <div className="anecdote">„{v.anecdote}"</div>}
                    {v.next_time_plan && <p style={{ marginTop: 10 }}><strong>Następnym razem:</strong> {v.next_time_plan}</p>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {showVisitModal && (
        <VisitModal
          assignmentId={assignment.id}
          onClose={() => setShowVisitModal(false)}
          onAdded={(visit) => {
            setData(d => ({ ...d, visits: [visit, ...d.visits] }));
            setShowVisitModal(false);
          }}
        />
      )}
    </Shell>
  );
}

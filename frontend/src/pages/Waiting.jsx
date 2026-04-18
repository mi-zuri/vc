import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Shell } from '../components/Layout.jsx';

export default function Waiting() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const volunteerId = params.get('volunteerId');
  const [err, setErr] = useState(null);

  useEffect(() => {
    if (!volunteerId) {
      setErr('Brak identyfikatora wolontariusza.');
      return;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/volunteers/${volunteerId}/assign`, { method: 'POST' });
        if (!res.ok) throw new Error('koordynator nie zdążył — spróbuj odświeżyć');
        if (!cancelled) navigate(`/dashboard?volunteerId=${volunteerId}`);
      } catch (e) {
        if (!cancelled) setErr(e.message);
      }
    }, 2200);
    return () => { cancelled = true; clearTimeout(t); };
  }, [volunteerId, navigate]);

  return (
    <Shell>
      <div className="waiting">
        <div>
          <div className="waiting-ring" aria-hidden="true" />
          <h2>Twoja propozycja trafiła do koordynatora.</h2>
          <p>
            Gdy tylko dopasuje parę, zobaczysz swój pulpit. Na demo to zajmie
            dwie sekundy — w prawdziwym świecie zwykle kilka dni, i napiszemy
            do Ciebie mailem.
          </p>
          {err && <div className="inline-err" style={{ marginTop: 20 }}>{err}</div>}
        </div>
      </div>
    </Shell>
  );
}

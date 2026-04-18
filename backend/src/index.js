const express = require('express');
const fs = require('fs');
const path = require('path');
const { pool, init } = require('./db');

const app = express();
app.use(express.json({ limit: '1mb' }));

const port = Number(process.env.PORT) || 3000;

const INSPIRATIONS = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'seeds/inspirations.json'), 'utf8')
);

function requireDb(res) {
  if (!pool) {
    res.status(503).json({ error: 'db-not-configured' });
    return false;
  }
  return true;
}

app.get('/health', async (_req, res) => {
  if (!pool) return res.json({ status: 'ok', db: 'not-configured' });
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'up' });
  } catch (err) {
    res.status(503).json({ status: 'degraded', db: 'down', error: err.message });
  }
});

// Create volunteer
app.post('/volunteers', async (req, res) => {
  if (!requireDb(res)) return;
  const { first_name, city, email, phone, availability, interests, experience_level, motivation, rodo_consent } = req.body || {};
  if (!first_name || !city || !email || !rodo_consent) {
    return res.status(400).json({ error: 'missing-required-fields' });
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO volunteers (first_name, city, email, phone, availability, interests, experience_level, motivation, rodo_consent)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [first_name, city, email, phone || null, availability || {}, interests || [],
       Number(experience_level) || 1, motivation || null, !!rodo_consent]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/volunteers/:id', async (req, res) => {
  if (!requireDb(res)) return;
  const { rows } = await pool.query('SELECT * FROM volunteers WHERE id=$1', [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'not-found' });
  res.json(rows[0]);
});

// List seniors (optional filters by city / interests)
app.get('/seniors', async (req, res) => {
  if (!requireDb(res)) return;
  const { city, interests } = req.query;
  const clauses = [];
  const args = [];
  if (city) { args.push(city); clauses.push(`city = $${args.length}`); }
  if (interests) {
    const tags = String(interests).split(',').filter(Boolean);
    if (tags.length) { args.push(tags); clauses.push(`interests && $${args.length}`); }
  }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const { rows } = await pool.query(
    `SELECT id, display_name, age_range, city, district, interests, short_description, waiting_since
     FROM seniors ${where} ORDER BY waiting_since ASC`, args
  );
  res.json(rows);
});

app.get('/seniors/:id', async (req, res) => {
  if (!requireDb(res)) return;
  const { rows } = await pool.query('SELECT * FROM seniors WHERE id=$1', [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'not-found' });
  res.json(rows[0]);
});

// Volunteer proposes up to 5 seniors
app.post('/volunteers/:id/proposals', async (req, res) => {
  if (!requireDb(res)) return;
  const { senior_ids } = req.body || {};
  if (!Array.isArray(senior_ids) || senior_ids.length === 0 || senior_ids.length > 5) {
    return res.status(400).json({ error: 'senior_ids-must-be-1-to-5' });
  }
  try {
    await pool.query('DELETE FROM proposals WHERE volunteer_id=$1', [req.params.id]);
    for (const sid of senior_ids) {
      await pool.query(
        'INSERT INTO proposals (volunteer_id, senior_id) VALUES ($1,$2)',
        [req.params.id, sid]
      );
    }
    res.status(201).json({ count: senior_ids.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Simulate coordinator: randomly pick one proposed senior and create assignment
app.post('/volunteers/:id/assign', async (req, res) => {
  if (!requireDb(res)) return;
  try {
    const existing = await pool.query('SELECT * FROM assignments WHERE volunteer_id=$1', [req.params.id]);
    if (existing.rows.length) return res.json(existing.rows[0]);

    const { rows } = await pool.query(
      'SELECT senior_id FROM proposals WHERE volunteer_id=$1 AND status=$2 ORDER BY random() LIMIT 1',
      [req.params.id, 'proposed']
    );
    if (!rows.length) return res.status(400).json({ error: 'no-proposals' });

    const seniorId = rows[0].senior_id;
    const ins = await pool.query(
      'INSERT INTO assignments (volunteer_id, senior_id) VALUES ($1,$2) RETURNING *',
      [req.params.id, seniorId]
    );
    await pool.query(
      "UPDATE proposals SET status='accepted' WHERE volunteer_id=$1 AND senior_id=$2",
      [req.params.id, seniorId]
    );
    res.status(201).json(ins.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Dashboard: volunteer + matched senior + visits
app.get('/volunteers/:id/dashboard', async (req, res) => {
  if (!requireDb(res)) return;
  try {
    const v = await pool.query('SELECT * FROM volunteers WHERE id=$1', [req.params.id]);
    if (!v.rows.length) return res.status(404).json({ error: 'volunteer-not-found' });

    const a = await pool.query('SELECT * FROM assignments WHERE volunteer_id=$1', [req.params.id]);
    if (!a.rows.length) return res.json({ volunteer: v.rows[0], assignment: null, senior: null, visits: [] });

    const s = await pool.query('SELECT * FROM seniors WHERE id=$1', [a.rows[0].senior_id]);
    const vis = await pool.query(
      'SELECT * FROM visits WHERE assignment_id=$1 ORDER BY date DESC',
      [a.rows[0].id]
    );
    res.json({
      volunteer: v.rows[0],
      assignment: a.rows[0],
      senior: s.rows[0],
      visits: vis.rows,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Visits
app.post('/visits', async (req, res) => {
  if (!requireDb(res)) return;
  const { assignment_id, date, duration_minutes, what_we_did, mood, anecdote, next_time_plan } = req.body || {};
  if (!assignment_id || !date) return res.status(400).json({ error: 'missing-required-fields' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO visits (assignment_id, date, duration_minutes, what_we_did, mood, anecdote, next_time_plan)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [assignment_id, date, duration_minutes || null, what_we_did || null, mood || null, anecdote || null, next_time_plan || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Inspiration generator — simplified: pick 3 from seed JSON matching senior interests,
// produce a reasoning string personalized with the senior's data.
// Later we swap this for Claude API.
app.post('/inspirations/generate', async (req, res) => {
  if (!requireDb(res)) return;
  const { assignment_id, duration, location, energy } = req.body || {};
  if (!assignment_id) return res.status(400).json({ error: 'assignment_id-required' });

  try {
    const a = await pool.query('SELECT * FROM assignments WHERE id=$1', [assignment_id]);
    if (!a.rows.length) return res.status(404).json({ error: 'assignment-not-found' });
    const s = await pool.query('SELECT * FROM seniors WHERE id=$1', [a.rows[0].senior_id]);
    const senior = s.rows[0];

    const interests = senior.interests || [];
    const likes = senior.likes || [];

    const scored = INSPIRATIONS.map((idea) => {
      let score = 0;
      for (const t of idea.tags) if (interests.includes(t)) score += 3;
      for (const t of idea.tags) if (likes.some(l => l.toLowerCase().includes(t))) score += 1;
      if (duration && idea.duration === duration) score += 1;
      if (energy === 'zmęczona' && idea.tags.includes('łagodne')) score += 2;
      if (location === 'mieszkanie' && idea.tags.includes('mieszkanie')) score += 1;
      if (location === 'spacer' && (idea.tags.includes('spacer') || idea.tags.includes('park'))) score += 2;
      score += Math.random() * 0.5;
      return { ...idea, score };
    });
    scored.sort((a, b) => b.score - a.score);
    const top = scored.slice(0, 3);

    const reasoned = top.map((idea) => {
      const matched = idea.tags.filter(t => interests.includes(t));
      const matchedLikes = likes.filter(l => idea.tags.some(t => l.toLowerCase().includes(t)));
      let reasoning;
      if (matchedLikes.length) {
        reasoning = `W profilu ${senior.display_name} pojawia się „${matchedLikes[0]}". To pomysł, który bezpośrednio w to trafia.`;
      } else if (matched.length) {
        reasoning = `${senior.display_name} lubi ${matched.join(', ')} — ten pomysł korzysta z tego naturalnie.`;
      } else {
        reasoning = `Pomysł spokojny, dobry na rozgrzanie relacji — nie wymaga wiele, a daje wspólny rytuał.`;
      }
      return {
        title: idea.title,
        description: idea.description,
        reasoning,
        duration: idea.duration,
        prep: idea.prep,
      };
    });

    res.json({ inspirations: reasoned });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

init().catch((err) => {
  console.error('[db] init failed:', err.message);
});

app.listen(port, () => {
  console.log(`backend listening on :${port}`);
});

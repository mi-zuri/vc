const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const pool = process.env.DATABASE_URL
  ? new Pool({ connectionString: process.env.DATABASE_URL })
  : null;

async function init() {
  if (!pool) {
    console.warn('[db] DATABASE_URL not set — running without persistence');
    return;
  }
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await pool.query(schema);

  const { rows } = await pool.query('SELECT COUNT(*)::int AS n FROM seniors');
  if (rows[0].n === 0) {
    const seniors = JSON.parse(fs.readFileSync(path.join(__dirname, 'seeds/seniors.json'), 'utf8'));
    for (const s of seniors) {
      await pool.query(
        `INSERT INTO seniors (display_name, age_range, city, district, interests, short_description, full_description, mobility, likes, avoid_topics, waiting_since)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [s.display_name, s.age_range, s.city, s.district, s.interests || [], s.short_description,
         s.full_description, s.mobility, s.likes || [], s.avoid_topics || [], s.waiting_since]
      );
    }
    console.log(`[db] seeded ${seniors.length} seniors`);
  }
}

module.exports = { pool, init };

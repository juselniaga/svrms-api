// Repairs rows written by older versions of this API.
//   node scripts/repair-pwa-data.js           report only, changes nothing
//   node scripts/repair-pwa-data.js --apply   apply the changes
// Back up the database before using --apply. Duplicate visits are reported, never deleted.
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const pool = require('../src/config/db');

const apply = process.argv.includes('--apply');
const PHOTO_FIELDS = ['photos_north', 'photos_south', 'photo_east', 'photo_west'];
const storagePath = path.resolve(process.cwd(), process.env.STORAGE_PATH || '../svrms/storage/app/public/photos');

const repairStatusIds = async (conn) => {
  // Laravel always writes both columns, so on a mismatch status holds the API's newer value
  const [rows] = await conn.execute(
    `SELECT a.application_id, a.status, current.code AS status_id_code, target.id AS target_id
     FROM applications a
     LEFT JOIN application_statuses current ON current.id = a.status_id
     LEFT JOIN application_statuses target ON target.code = a.status
     WHERE a.status IS NOT NULL AND NOT (a.status <=> current.code)`
  );
  console.log(`\nStatus mismatches: ${rows.length}`);
  for (const row of rows) {
    if (!row.target_id) {
      console.log(`  #${row.application_id}: unknown status '${row.status}' (status_id=${row.status_id_code}) - fix by hand`);
      continue;
    }
    console.log(`  #${row.application_id}: status_id ${row.status_id_code} -> ${row.status}`);
    if (apply) {
      await conn.execute('UPDATE applications SET status_id = ? WHERE application_id = ?', [row.target_id, row.application_id]);
    }
  }
};

const repairPhotoPaths = async (conn) => {
  const [rows] = await conn.execute(`SELECT site_visit_id, ${PHOTO_FIELDS.join(', ')} FROM site_visits`);
  let changed = 0;
  for (const row of rows) {
    for (const field of PHOTO_FIELDS) {
      const raw = row[field];
      const paths = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (!Array.isArray(paths)) continue;

      // Anything but 'photos/filename' is a disk path saved by the old API
      const fixed = paths.map((p) => (/^photos\/[^/\\]+$/.test(p) ? p : `photos/${p.split(/[\\/]/).pop()}`));
      if (JSON.stringify(fixed) === JSON.stringify(paths)) continue;

      changed++;
      console.log(`  visit #${row.site_visit_id} ${field}: ${paths[0]} -> ${fixed[0]}`);
      for (const p of fixed) {
        if (!fs.existsSync(path.join(storagePath, path.basename(p)))) {
          console.log(`    WARNING: file not found in ${storagePath}: ${path.basename(p)}`);
        }
      }
      if (apply) {
        await conn.execute(`UPDATE site_visits SET ${field} = ? WHERE site_visit_id = ?`, [JSON.stringify(fixed), row.site_visit_id]);
      }
    }
  }
  console.log(`Photo paths to fix: ${changed}`);
};

const repairVisitTimestamps = async (conn) => {
  const [[{ total }]] = await conn.execute('SELECT COUNT(*) AS total FROM site_visits WHERE created_at IS NULL');
  console.log(`\nVisits without created_at: ${total}`);
  if (apply && total > 0) {
    // Laravel picks the visit by latest created_at; adding the id keeps same-day rows in insertion order
    await conn.execute(
      `UPDATE site_visits
       SET created_at = TIMESTAMPADD(SECOND, site_visit_id, visit_date),
           updated_at = COALESCE(updated_at, TIMESTAMPADD(SECOND, site_visit_id, visit_date))
       WHERE created_at IS NULL`
    );
  }
};

const reportDuplicateVisits = async (conn) => {
  const [rows] = await conn.execute(
    `SELECT application_id, COUNT(*) AS total, MAX(site_visit_id) AS newest
     FROM site_visits GROUP BY application_id HAVING total > 1`
  );
  console.log(`\nApplications with duplicate visits (newest is the one in use): ${rows.length}`);
  rows.forEach((row) => console.log(`  #${row.application_id}: ${row.total} rows, newest #${row.newest}`));
};

(async () => {
  const conn = await pool.getConnection();
  try {
    console.log(apply ? 'APPLY MODE: writing changes' : 'REPORT ONLY: no changes (use --apply to write)');
    await conn.beginTransaction();
    await repairStatusIds(conn);
    console.log('\nPhoto paths:');
    await repairPhotoPaths(conn);
    await repairVisitTimestamps(conn);
    await reportDuplicateVisits(conn);
    await conn.commit();
  } catch (error) {
    await conn.rollback();
    console.error(error);
    process.exitCode = 1;
  } finally {
    conn.release();
    await pool.end();
  }
})();

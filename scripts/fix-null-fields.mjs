/**
 * fix-null-fields.mjs
 * Connects to Firestore emulator via its REST API (no credentials needed)
 * and patches all null field values to empty strings.
 *
 * Usage: node scripts/fix-null-fields.mjs
 */

import https from 'https';
import http  from 'http';

const PROJECT_ID  = 'team4job-live';
const EMU_HOST    = '127.0.0.1';
const EMU_PORT    = 8080;
const BASE        = `http://${EMU_HOST}:${EMU_PORT}/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

/* ── tiny HTTP helper ────────────────────────────────────────────── */
function request(method, url, body = null) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const opts = {
      hostname : parsed.hostname,
      port     : parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path     : parsed.pathname + parsed.search,
      method,
      // 'owner' token bypasses Firestore security rules in the emulator
      headers  : { 'Content-Type': 'application/json', 'Authorization': 'Bearer owner' },
    };
    const mod = parsed.protocol === 'https:' ? https : http;
    const req = mod.request(opts, res => {
      let data = '';
      res.on('data', c => (data += c));
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

/* ── Firestore value helpers ─────────────────────────────────────── */
function encodeValue(v) {
  if (v === null || v === undefined) return { stringValue: '' };   // <-- key fix
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number' && Number.isInteger(v)) return { integerValue: String(v) };
  if (typeof v === 'number') return { doubleValue: v };
  if (typeof v === 'string') return { stringValue: v };
  if (v instanceof Date) return { timestampValue: v.toISOString() };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(encodeValue) } };
  if (typeof v === 'object') {
    const fields = {};
    for (const [k, val] of Object.entries(v)) fields[k] = encodeValue(val);
    return { mapValue: { fields } };
  }
  return { stringValue: String(v) };
}

function decodeValue(v) {
  if (v.nullValue !== undefined) return null;
  if (v.stringValue !== undefined) return v.stringValue;
  if (v.integerValue !== undefined) return Number(v.integerValue);
  if (v.doubleValue !== undefined) return v.doubleValue;
  if (v.booleanValue !== undefined) return v.booleanValue;
  if (v.timestampValue !== undefined) return new Date(v.timestampValue);
  if (v.arrayValue !== undefined) return (v.arrayValue.values || []).map(decodeValue);
  if (v.mapValue !== undefined) {
    const obj = {};
    for (const [k, vv] of Object.entries(v.mapValue.fields || {})) obj[k] = decodeValue(vv);
    return obj;
  }
  return null;
}

function decodeDoc(doc) {
  const out = {};
  for (const [k, v] of Object.entries(doc.fields || {})) out[k] = decodeValue(v);
  return out;
}

/** Returns true if any null is present (recursively) */
function hasNull(obj) {
  for (const v of Object.values(obj)) {
    if (v === null) return true;
    if (typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date) && hasNull(v)) return true;
  }
  return false;
}

/** Encode plain JS object into Firestore REST fields map */
function encodeFields(obj) {
  const fields = {};
  for (const [k, v] of Object.entries(obj)) fields[k] = encodeValue(v);
  return fields;
}

/* ── collection scanner ──────────────────────────────────────────── */
async function fixCollection(colId) {
  process.stdout.write(`\n📂 ${colId} ... `);
  const url = `${BASE}/${colId}?pageSize=300`;
  const res = await request('GET', url);
  const docs = res.body.documents || [];
  process.stdout.write(`${docs.length} docs`);

  let fixed = 0;
  for (const doc of docs) {
    const data = decodeDoc(doc);
    if (!hasNull(data)) continue;

    // Re-encode entire document (encodeValue replaces null → '')
    const fields = encodeFields(data);
    const patch = await request('PATCH', `${BASE}/${doc.name.split('/documents/')[1]}`, { fields });
    if (patch.status === 200) {
      console.log(`\n  ✅  Fixed ${doc.name.split('/documents/')[1]}`);
      fixed++;
    } else {
      console.warn(`\n  ⚠️  Patch failed (${patch.status}) for ${doc.name}`, patch.body);
    }
  }

  if (fixed === 0) process.stdout.write(' — clean ✓\n');
  return fixed;
}

/* ── main ────────────────────────────────────────────────────────── */
async function main() {
  console.log('🔧  Firestore Emulator Null-Field Fixer (REST)');
  console.log('===============================================');

  // ping
  const ping = await request('GET', `${BASE}?pageSize=1`).catch(e => ({ status: 0, body: e.message }));
  if (ping.status === 0 || ping.status >= 500) {
    console.error(`❌  Cannot reach emulator at ${EMU_HOST}:${EMU_PORT} — is it running?`);
    process.exit(1);
  }
  console.log(`✅  Emulator reachable (HTTP ${ping.status})\n`);

  const cols = ['users', 'jobs', 'bids', 'transactions', 'disputes', 'milestones', 'notifications', 'reviews', 'notificationPreferences', 'stitchJobs', 'stitchBids', 'coupons', 'auditLogs', 'subscriptions', 'invoices', 'activities'];
  let total = 0;
  for (const c of cols) total += await fixCollection(c);

  console.log(`\n===============================================`);
  console.log(`Documents patched: ${total}`);
  console.log('Done! Hard-refresh the browser (Ctrl+Shift+R).\n');
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });

/**
 * CSV Member Import Script
 * Reads Mitglieder_Export CSV and imports all members via the API.
 *
 * Usage: npx tsx scripts/import-members.ts <admin-email> <admin-password>
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const API = 'https://verein-connect-api.cloudflareone-demo-account.workers.dev';
const CSV_PATH = resolve(__dirname, '..', 'Mitglieder_Export - Tabellenblatt1.csv');

// ─── Phone normalization ────────────────────────────────────────────────────
function normalizePhone(raw: string): string {
  if (!raw || !raw.trim()) return '';
  let phone = raw.trim();
  // Some cells have extra text like "0162 5743802  marc-koch@gmx.de"
  phone = phone.split(/\s{2,}/)[0].trim();
  // Remove email-like text if still present
  if (phone.includes('@')) phone = phone.split(/\s/)[0];
  // Already +49
  if (phone.startsWith('+49')) return phone;
  // Starts with 0 → replace with +49
  if (phone.startsWith('0')) return '+49 ' + phone.slice(1);
  // Starts with digit but no 0 (e.g. "1622387648") → prepend +49
  if (/^\d/.test(phone)) return '+49 ' + phone;
  return phone;
}

// ─── Date parsing ───────────────────────────────────────────────────────────
function parseBirthDate(raw: string): string {
  if (!raw || !raw.trim()) return '';
  const parts = raw.trim().split('/');
  if (parts.length !== 3) return '';
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  let year = parseInt(parts[2], 10);
  if (isNaN(day) || isNaN(month) || isNaN(year)) return '';
  // 2-digit year
  if (year < 100) {
    year = year <= 30 ? 2000 + year : 1900 + year;
  }
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

// ─── CSV parsing (handles commas in fields when quoted) ─────────────────────
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

// ─── Status mapping ─────────────────────────────────────────────────────────
function mapStatus(art: string): 'active' | 'inactive' {
  const lower = art.toLowerCase();
  if (lower === 'p') return 'inactive';
  return 'active';
}

// ─── Main ───────────────────────────────────────────────────────────────────
async function main() {
  const email = process.argv[2];
  const password = process.argv[3];
  if (!email || !password) {
    console.error('Usage: npx tsx scripts/import-members.ts <admin-email> <admin-password>');
    process.exit(1);
  }

  // Login
  console.log('🔐 Logging in...');
  const loginRes = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!loginRes.ok) {
    console.error('Login failed:', await loginRes.text());
    process.exit(1);
  }
  const loginData = await loginRes.json() as any;
  const token = loginData.access_token;
  console.log(`✅ Logged in as ${loginData.user.firstName} ${loginData.user.lastName}`);

  // Read CSV
  const csv = readFileSync(CSV_PATH, 'utf-8');
  const lines = csv.split('\n').filter(l => l.trim());
  const header = parseCSVLine(lines[0]);
  console.log(`📄 CSV loaded: ${lines.length - 1} rows`);
  console.log(`   Headers: ${header.join(' | ')}`);

  // Parse rows
  const rows = lines.slice(1).map((line, idx) => {
    const cols = parseCSVLine(line);
    return {
      lineNum: idx + 2,
      mannschaft: cols[0] || '',
      lastName: (cols[1] || '').trim(),
      firstName: (cols[2] || '').trim(),
      art: cols[3] || '',
      birthDate: cols[4] || '',
      year: cols[5] || '',
      passNr: cols[6] || '',
      email: (cols[7] || '').trim(),
      mobile: cols[8] || '',
      street: cols[9] || '',
      houseNr: cols[10] || '',
      zip: cols[11] || '',
      city: (cols[12] || '').trim(),
    };
  });

  // Filter out rows with no name
  const validRows = rows.filter(r => r.firstName && r.lastName);
  console.log(`✅ ${validRows.length} valid rows (with first+last name)`);
  const skippedRows = rows.filter(r => !r.firstName || !r.lastName);
  if (skippedRows.length > 0) {
    console.log(`⏭️  Skipped ${skippedRows.length} rows without name: lines ${skippedRows.map(r => r.lineNum).join(', ')}`);
  }

  // Handle duplicate emails
  const emailCounts: Record<string, number> = {};
  for (const row of validRows) {
    const baseEmail = row.email || `import-${row.lineNum}@platzhalter.local`;
    if (!emailCounts[baseEmail]) emailCounts[baseEmail] = 0;
    emailCounts[baseEmail]++;
  }

  const emailUsed: Record<string, number> = {};
  function getUniqueEmail(row: typeof validRows[0]): string {
    const baseEmail = row.email || `import-${row.lineNum}@platzhalter.local`;
    if (!emailUsed[baseEmail]) emailUsed[baseEmail] = 0;
    emailUsed[baseEmail]++;

    if (emailCounts[baseEmail] <= 1) return baseEmail;
    if (emailUsed[baseEmail] === 1) return baseEmail;

    // Add +N suffix before @
    const atIdx = baseEmail.indexOf('@');
    return `${baseEmail.slice(0, atIdx)}+${emailUsed[baseEmail]}${baseEmail.slice(atIdx)}`;
  }

  // Import
  let success = 0;
  let failed = 0;
  const errors: { line: number; name: string; error: string }[] = [];

  for (const row of validRows) {
    const uniqueEmail = getUniqueEmail(row);
    const streetFull = [row.street, row.houseNr].filter(Boolean).join(' ').trim();
    const mobile = normalizePhone(row.mobile);
    const birthDate = parseBirthDate(row.birthDate);

    const payload: Record<string, any> = {
      first_name: row.firstName,
      last_name: row.lastName,
      email: uniqueEmail,
      status: mapStatus(row.art),
    };
    if (streetFull) payload.street = streetFull;
    if (row.zip) payload.zip = row.zip;
    if (row.city) payload.city = row.city;
    if (mobile) payload.mobile = mobile;
    if (birthDate) payload.birth_date = birthDate;

    try {
      const res = await fetch(`${API}/v1/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        success++;
        const data = await res.json() as any;
        console.log(`  ✅ [${row.lineNum}] ${row.firstName} ${row.lastName} → ${data.memberNumber} (${uniqueEmail})`);
      } else {
        failed++;
        const errBody = await res.text();
        errors.push({ line: row.lineNum, name: `${row.firstName} ${row.lastName}`, error: errBody });
        console.log(`  ❌ [${row.lineNum}] ${row.firstName} ${row.lastName}: ${res.status} ${errBody.slice(0, 120)}`);
      }
    } catch (err: any) {
      failed++;
      errors.push({ line: row.lineNum, name: `${row.firstName} ${row.lastName}`, error: err.message });
      console.log(`  ❌ [${row.lineNum}] ${row.firstName} ${row.lastName}: ${err.message}`);
    }
  }

  console.log('\n════════════════════════════════════════');
  console.log(`✅ Erfolgreich: ${success}`);
  console.log(`❌ Fehler: ${failed}`);
  if (errors.length > 0) {
    console.log('\nFehlerdetails:');
    for (const e of errors) {
      console.log(`  Zeile ${e.line}: ${e.name} → ${e.error.slice(0, 200)}`);
    }
  }
}

main().catch(console.error);

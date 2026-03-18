/**
 * Assign imported members to groups based on CSV "Mannschaft A" column.
 * Usage: npx tsx scripts/assign-groups.ts <admin-email> <admin-password>
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const API = 'https://verein-connect-api.cloudflareone-demo-account.workers.dev';
const CSV_PATH = resolve(__dirname, '..', 'Mitglieder_Export - Tabellenblatt1.csv');

// Mannschaft → Group ID mapping
const MANNSCHAFT_TO_GROUP: Record<string, string> = {
  'U7': '10df22b2-83b6-46e5-bf9d-6d19ffeb8aa3',
  'U13': 'dd09e46a-c973-434a-8f41-ced788caf61b',
  'U11 / Goaly': '9a3c2619-5d63-4d55-9654-7a764988348d',
  'U15': '1da4581b-7a43-43c0-be4d-e74111b1fa40',
  'U17': '0a3dd3ce-6162-48f3-b45c-d3271869ef24',
  'U20': 'f2fe8a45-26f3-4b80-a551-60a204a82970',
  'Damen': 'bda9d420-13a8-4763-9add-23aa82e1f2fb',
  'Senioren': '38603c46-4dd6-459a-956d-2f9685bb2d85',
  'Hobby': 'd48fe3ca-b968-497f-80ca-c1e85aad770a',
  'Passiv': 'f1b4b2d8-d8e0-4619-b1cc-a09e488e3c82',
};

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQuotes = !inQuotes; }
    else if (ch === ',' && !inQuotes) { result.push(current.trim()); current = ''; }
    else { current += ch; }
  }
  result.push(current.trim());
  return result;
}

async function main() {
  const email = process.argv[2];
  const password = process.argv[3];
  if (!email || !password) {
    console.error('Usage: npx tsx scripts/assign-groups.ts <admin-email> <admin-password>');
    process.exit(1);
  }

  // Login
  console.log('🔐 Logging in...');
  const loginRes = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!loginRes.ok) { console.error('Login failed:', await loginRes.text()); process.exit(1); }
  const loginData = await loginRes.json() as any;
  const token = loginData.access_token;
  console.log(`✅ Logged in`);

  // Fetch ALL members (paginated)
  console.log('📋 Fetching all members...');
  let allMembers: any[] = [];
  let page = 1;
  while (true) {
    const res = await fetch(`${API}/v1/members?page=${page}&per_page=100`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    const data = await res.json() as any;
    allMembers.push(...data.data);
    if (page >= data.meta.total_pages) break;
    page++;
  }
  console.log(`  Found ${allMembers.length} members`);

  // Build email → member ID lookup (lowercase)
  const emailToId: Record<string, string> = {};
  for (const m of allMembers) {
    emailToId[m.email.toLowerCase()] = m.id;
  }

  // Read CSV
  const csv = readFileSync(CSV_PATH, 'utf-8');
  const lines = csv.split('\n').filter(l => l.trim());
  const rows = lines.slice(1).map((line, idx) => {
    const cols = parseCSVLine(line);
    return {
      lineNum: idx + 2,
      mannschaft: (cols[0] || '').trim(),
      lastName: (cols[1] || '').trim(),
      firstName: (cols[2] || '').trim(),
      email: (cols[7] || '').trim(),
    };
  });

  // Rebuild the same email dedup logic from the import script
  const validRows = rows.filter(r => r.firstName && r.lastName);
  const emailCounts: Record<string, number> = {};
  for (const row of validRows) {
    const baseEmail = row.email || `import-${row.lineNum}@platzhalter.local`;
    emailCounts[baseEmail] = (emailCounts[baseEmail] || 0) + 1;
  }
  const emailUsed: Record<string, number> = {};
  function getUniqueEmail(row: typeof validRows[0]): string {
    const baseEmail = row.email || `import-${row.lineNum}@platzhalter.local`;
    emailUsed[baseEmail] = (emailUsed[baseEmail] || 0) + 1;
    if (emailCounts[baseEmail] <= 1) return baseEmail;
    if (emailUsed[baseEmail] === 1) return baseEmail;
    const atIdx = baseEmail.indexOf('@');
    return `${baseEmail.slice(0, atIdx)}+${emailUsed[baseEmail]}${baseEmail.slice(atIdx)}`;
  }

  // Assign groups
  let assigned = 0;
  let skipped = 0;
  let notFound = 0;
  let noGroup = 0;
  let errors = 0;

  for (const row of validRows) {
    const uniqueEmail = getUniqueEmail(row);
    const mannschaft = row.mannschaft;

    // Resolve group ID
    const groupId = MANNSCHAFT_TO_GROUP[mannschaft];
    if (!groupId) {
      if (mannschaft && mannschaft !== 'Mannschaft A') {
        console.log(`  ⏭️  [${row.lineNum}] ${row.firstName} ${row.lastName}: no group mapping for "${mannschaft}"`);
      }
      noGroup++;
      continue;
    }

    // Resolve member ID
    const memberId = emailToId[uniqueEmail.toLowerCase()];
    if (!memberId) {
      console.log(`  ⚠️  [${row.lineNum}] ${row.firstName} ${row.lastName}: member not found for ${uniqueEmail}`);
      notFound++;
      continue;
    }

    // Assign to group
    try {
      const res = await fetch(`${API}/v1/groups/${groupId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ user_id: memberId }),
      });
      if (res.ok) {
        assigned++;
        console.log(`  ✅ [${row.lineNum}] ${row.firstName} ${row.lastName} → ${mannschaft}`);
      } else {
        const errText = await res.text();
        if (errText.includes('UNIQUE') || errText.includes('already')) {
          skipped++;
          console.log(`  ⏭️  [${row.lineNum}] ${row.firstName} ${row.lastName} → ${mannschaft} (already assigned)`);
        } else {
          errors++;
          console.log(`  ❌ [${row.lineNum}] ${row.firstName} ${row.lastName}: ${res.status} ${errText.slice(0, 120)}`);
        }
      }
    } catch (err: any) {
      errors++;
      console.log(`  ❌ [${row.lineNum}] ${row.firstName} ${row.lastName}: ${err.message}`);
    }
  }

  console.log('\n════════════════════════════════════════');
  console.log(`✅ Zugewiesen: ${assigned}`);
  console.log(`⏭️  Bereits zugewiesen: ${skipped}`);
  console.log(`⚠️  Mitglied nicht gefunden: ${notFound}`);
  console.log(`📭 Keine Gruppe (leer/unbekannt): ${noGroup}`);
  console.log(`❌ Fehler: ${errors}`);
}

main().catch(console.error);

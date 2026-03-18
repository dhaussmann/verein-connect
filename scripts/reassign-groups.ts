/**
 * Reassign members from U7 to correct age groups based on birth year.
 * Also handles Damen staying as-is (not touched), and non-U7 CSV entries.
 *
 * Age group mapping (season 2025/26):
 *   Senioren:  born ≤ 2005
 *   U20:       born 2006, 2007, 2008
 *   U17:       born 2009, 2010
 *   U15:       born 2011, 2012
 *   U13:       born 2013, 2014
 *   U11:       born 2015, 2016
 *   U9:        born 2017, 2018
 *   U7:        born 2019+
 *
 * Usage: npx tsx scripts/reassign-groups.ts <admin-email> <admin-password>
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const API = 'https://verein-connect-api.cloudflareone-demo-account.workers.dev';
const CSV_PATH = resolve(__dirname, '..', 'Mitglieder_Export - Tabellenblatt1.csv');

// Group IDs
const GROUPS: Record<string, string> = {
  'Jugend U7':  '10df22b2-83b6-46e5-bf9d-6d19ffeb8aa3',
  'Jugend U9':  '', // will be created
  'Jugend U11': '9a3c2619-5d63-4d55-9654-7a764988348d',
  'Jugend U13': 'dd09e46a-c973-434a-8f41-ced788caf61b',
  'Jugend U15': '1da4581b-7a43-43c0-be4d-e74111b1fa40',
  'Jugend U17': '0a3dd3ce-6162-48f3-b45c-d3271869ef24',
  'Jugend U20': 'f2fe8a45-26f3-4b80-a551-60a204a82970',
  'Senioren':   '38603c46-4dd6-459a-956d-2f9685bb2d85',
  'Herren':     '2859d4de-e293-4dbe-a689-0698b306ae05',
};

function yearToGroup(year: number): string | null {
  if (year >= 2019) return 'Jugend U7';
  if (year >= 2017) return 'Jugend U9';
  if (year >= 2015) return 'Jugend U11';
  if (year >= 2013) return 'Jugend U13';
  if (year >= 2011) return 'Jugend U15';
  if (year >= 2009) return 'Jugend U17';
  if (year >= 2006) return 'Jugend U20';
  return 'Herren'; // ≤ 2005 → Herren (adult men)
}

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

function parseBirthYear(raw: string, yearCol: string): number | null {
  // Prefer the "Jahr" column if it has a 4-digit year
  if (yearCol && /^\d{4}$/.test(yearCol.trim())) {
    return parseInt(yearCol.trim(), 10);
  }
  // Parse from birthday column
  if (!raw || !raw.trim()) return null;
  const parts = raw.trim().split('/');
  if (parts.length !== 3) return null;
  let year = parseInt(parts[2], 10);
  if (isNaN(year)) return null;
  if (year < 100) {
    year = year <= 30 ? 2000 + year : 1900 + year;
  }
  return year;
}

async function main() {
  const email = process.argv[2];
  const password = process.argv[3];
  if (!email || !password) {
    console.error('Usage: npx tsx scripts/reassign-groups.ts <admin-email> <admin-password>');
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
  const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };

  // Create U9 group if needed
  console.log('📋 Creating Jugend U9 group...');
  const createRes = await fetch(`${API}/v1/groups`, {
    method: 'POST', headers,
    body: JSON.stringify({ name: 'Jugend U9', category: 'team' }),
  });
  const u9Data = await createRes.json() as any;
  if (u9Data.id) {
    GROUPS['Jugend U9'] = u9Data.id;
    console.log(`  ✅ Jugend U9 created: ${u9Data.id}`);
  } else {
    console.log(`  ⚠️  Could not create U9:`, JSON.stringify(u9Data));
    // Try to find it in existing groups
    const groupsRes = await fetch(`${API}/v1/groups`, { headers });
    const groupsList = await groupsRes.json() as any;
    const u9 = groupsList.data.find((g: any) => g.name === 'Jugend U9');
    if (u9) {
      GROUPS['Jugend U9'] = u9.id;
      console.log(`  ✅ Found existing Jugend U9: ${u9.id}`);
    } else {
      console.error('  ❌ Cannot find or create Jugend U9. Aborting.');
      process.exit(1);
    }
  }

  // Step 1: Remove ALL members from Jugend U7 group
  console.log('\n🗑️  Removing all members from Jugend U7...');
  const u7Id = GROUPS['Jugend U7'];
  const u7MembersRes = await fetch(`${API}/v1/groups/${u7Id}/members`, { headers });
  const u7Members = (await u7MembersRes.json() as any).data || [];
  console.log(`  Found ${u7Members.length} members in U7`);
  for (const m of u7Members) {
    await fetch(`${API}/v1/groups/${u7Id}/members/${m.userId}`, { method: 'DELETE', headers });
  }
  console.log(`  ✅ Removed ${u7Members.length} members from U7`);

  // Step 2: Fetch all members
  console.log('\n📋 Fetching all members...');
  let allMembers: any[] = [];
  let page = 1;
  while (true) {
    const res = await fetch(`${API}/v1/members?page=${page}&per_page=100`, { headers });
    const data = await res.json() as any;
    allMembers.push(...data.data);
    if (page >= data.meta.total_pages) break;
    page++;
  }
  console.log(`  Found ${allMembers.length} members`);

  // Build email → member lookup
  const emailToMember: Record<string, any> = {};
  for (const m of allMembers) {
    emailToMember[m.email.toLowerCase()] = m;
  }

  // Step 3: Read CSV and build reassignment list for U7 members
  const csv = readFileSync(CSV_PATH, 'utf-8');
  const lines = csv.split('\n').filter(l => l.trim());
  const rows = lines.slice(1).map((line, idx) => {
    const cols = parseCSVLine(line);
    return {
      lineNum: idx + 2,
      mannschaft: (cols[0] || '').trim(),
      lastName: (cols[1] || '').trim(),
      firstName: (cols[2] || '').trim(),
      birthday: cols[4] || '',
      yearCol: cols[5] || '',
      email: (cols[7] || '').trim(),
    };
  });

  const validRows = rows.filter(r => r.firstName && r.lastName);

  // Rebuild email dedup logic
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

  // Step 4: Reassign U7 members based on birth year
  console.log('\n🔄 Reassigning U7 members by birth year...');
  let assigned = 0;
  let noYear = 0;
  let notFound = 0;
  let errors = 0;
  const groupCounts: Record<string, number> = {};

  for (const row of validRows) {
    const uniqueEmail = getUniqueEmail(row);

    // Only process rows that were originally U7
    if (row.mannschaft !== 'U7') continue;

    const birthYear = parseBirthYear(row.birthday, row.yearCol);
    if (!birthYear) {
      console.log(`  ⚠️  [${row.lineNum}] ${row.firstName} ${row.lastName}: no birth year, skipping`);
      noYear++;
      continue;
    }

    const targetGroup = yearToGroup(birthYear);
    if (!targetGroup) continue;

    const groupId = GROUPS[targetGroup];
    if (!groupId) {
      console.log(`  ❌ [${row.lineNum}] No group ID for ${targetGroup}`);
      errors++;
      continue;
    }

    // Find member
    // Handle special case for Bäumges (imported as d.baeumges)
    let lookupEmail = uniqueEmail.toLowerCase();
    if (lookupEmail === 'd.bäumges@gmx.net') lookupEmail = 'd.baeumges@gmx.net';

    const member = emailToMember[lookupEmail];
    if (!member) {
      console.log(`  ⚠️  [${row.lineNum}] ${row.firstName} ${row.lastName}: member not found (${uniqueEmail})`);
      notFound++;
      continue;
    }

    // Assign to correct group
    try {
      const res = await fetch(`${API}/v1/groups/${groupId}/members`, {
        method: 'POST', headers,
        body: JSON.stringify({ user_id: member.id }),
      });
      if (res.ok) {
        assigned++;
        groupCounts[targetGroup] = (groupCounts[targetGroup] || 0) + 1;
        console.log(`  ✅ [${row.lineNum}] ${row.firstName} ${row.lastName} (${birthYear}) → ${targetGroup}`);
      } else {
        const errText = await res.text();
        if (errText.includes('UNIQUE')) {
          assigned++;
          groupCounts[targetGroup] = (groupCounts[targetGroup] || 0) + 1;
          console.log(`  ⏭️  [${row.lineNum}] ${row.firstName} ${row.lastName} → ${targetGroup} (already)`);
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
  console.log(`⚠️  Kein Geburtsjahr: ${noYear}`);
  console.log(`⚠️  Nicht gefunden: ${notFound}`);
  console.log(`❌ Fehler: ${errors}`);
  console.log('\nVerteilung:');
  for (const [group, count] of Object.entries(groupCounts).sort()) {
    console.log(`  ${group}: ${count}`);
  }
}

main().catch(console.error);

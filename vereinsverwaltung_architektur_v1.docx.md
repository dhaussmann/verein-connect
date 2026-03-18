

**VEREINSVERWALTUNG SAAS**

Architektur- & Datenmodell-Konzept

 

100% Serverless auf Cloudflare

Workers • D1 • R2 • Durable Objects • Pages

*Inspiriert durch Admidio • Neu konzipiert für die Cloud*  
Version 1.0 – März 2026

# **Inhaltsverzeichnis**

# **1\. System-Architektur**

## **1.1 Architektur-Übersicht**

**Grundprinzip:** Die gesamte Plattform läuft zu 100% auf der Cloudflare-Infrastruktur. Es gibt keinen zentralen Origin-Server. Jede Komponente wird am Edge ausgeführt, was weltweit niedrige Latenzen garantiert.

| Schicht | Technologie | Aufgabe |
| :---- | :---- | :---- |
| Frontend (UI) | SvelteKit auf Cloudflare Pages | SSR/SSG, Routing, UI-Rendering. Später via Capacitor als native App verpackt. |
| API-Gateway | Cloudflare Workers (Hono.js) | REST-API, JWT-Validierung, Rate Limiting, Request-Routing an Services. |
| Auth-Service | Worker \+ D1 \+ KV | Registrierung, Login, JWT-Erstellung (Ed25519), Session-/Refresh-Token-Verwaltung. |
| Business-Logic Workers | Cloudflare Workers | Domänenspezifische Logik: Mitglieder, Kurse, Termine, Rechnungen, Rollen. |
| Echtzeit-Service | Durable Objects \+ WebSockets | Chat, Live-Teilnahmestatistiken, Push-Benachrichtigungen. |
| Datenbank | Cloudflare D1 (SQLite) | Relationale Daten: User, Rollen, Events, Registrierungen, Rechnungen. |
| Datei-Speicher | Cloudflare R2 | Rechnungen (PDF), Mitgliedskarten, Materialbank, Profilbilder. |
| Cache / Sessions | Cloudflare KV | JWT-Blacklist, Session-Tokens, Feature-Flags, Config-Cache. |

## **1.2 Kommunikationsfluss**

Der typische Request-Flow verläuft wie folgt:

| Schritt | Beschreibung |
| :---- | :---- |
| 1\. Client → Pages | Der Browser/die App lädt das SvelteKit-Frontend von Cloudflare Pages. SSR-Seiten werden am Edge gerendert. |
| 2\. Pages → API Worker | Das Frontend sendet API-Requests an api.verein.app/\* – geroutet an den zentralen Hono.js-Worker. |
| 3\. JWT-Validierung | Der API-Worker prüft den Authorization-Header (Bearer JWT). Bei ungültigem Token: 401-Response. |
| 4\. Worker → D1 | Validierte Requests führen SQL-Queries gegen die D1-Datenbank aus (prepared statements). |
| 5\. Worker → R2 | Bei Datei-Operationen (Upload/Download) wird direkt auf R2-Buckets zugegriffen. |
| 6\. Worker → DO | Für Echtzeit-Features (Chat, Live-Stats) wird die Anfrage an ein Durable Object weitergeleitet, das den WebSocket-Zustand hält. |
| 7\. Response → Client | Die Antwort geht über das Cloudflare-Netzwerk zurück an den Client (\< 50ms weltweit). |

## **1.3 Authentifizierung & Autorisierung**

**JWT-basiertes Auth-System mit Ed25519-Signaturen:**

| Komponente | Details |
| :---- | :---- |
| Algorithmus | Ed25519 (EdDSA) – schneller und sicherer als RS256, ideal für Edge-Computing. |
| Access Token | Kurzlebig (15 min). Enthält: user\_id, org\_id, roles\[\], permissions\[\]. Wird im Authorization-Header gesendet. |
| Refresh Token | Langlebig (7 Tage). Gespeichert in KV mit TTL. Ermöglicht token-Rotation ohne erneuten Login. |
| Token-Rotation | Bei jedem Refresh wird ein neues Token-Paar erstellt. Altes Refresh-Token wird in KV invalidiert. |
| Multi-Org Support | JWT enthält org\_id. User können zwischen Organisationen wechseln (neues Token-Paar). |
| Rollen-Check | Middleware prüft permissions\[\] im JWT gegen Endpoint-Anforderungen. Feingranulares RBAC. |

**Auth-Flow im Detail:**

| 1\. POST /auth/login { email, password } 2\. Worker prüft Credentials gegen D1 (bcrypt-Hash) 3\. Bei Erfolg: JWT-Paar erstellen (Access \+ Refresh)    \- Access-Token: Ed25519-signiert, 15min TTL    \- Refresh-Token: UUID, in KV gespeichert mit user\_id \+ TTL 4\. Response: { access\_token, refresh\_token, expires\_in } 5\. Client speichert Tokens (httpOnly Cookie oder SecureStorage) 6\. Bei API-Calls: Authorization: Bearer \<access\_token\> 7\. Bei Ablauf: POST /auth/refresh { refresh\_token }    \- Altes Refresh-Token wird aus KV gelöscht    \- Neues Token-Paar wird erstellt (Rotation) |
| :---- |

## **1.4 Multi-Tenancy-Modell**

Jeder Verein (Organization) ist ein eigenständiger Tenant. Das System unterstützt zwei Strategien, je nach Skalierungsbedarf:

| Modell | Implementierung | Vorteil |
| :---- | :---- | :---- |
| Shared DB (MVP) | Alle Vereine in einer D1-Instanz, org\_id als Diskriminator in jeder Tabelle. | Einfach, schnelle Entwicklung, günstig. |
| DB-per-Tenant (Skalierung) | Pro Verein eine eigene D1-Datenbank. Routing via org\_id → D1-Binding. | Vollständige Datenisolation, keine noisy-neighbor-Probleme. |

Empfehlung: **Start mit Shared DB** (MVP). Migration auf DB-per-Tenant ist später möglich, da D1-Bindings dynamisch aufgelöst werden können.

# **2\. D1 Datenbank-Schema (Entwurf)**

Das Schema orientiert sich am Admidio-Datenmodell (EAV-Pattern für dynamische Felder, flexibles Rollen-System), ist aber komplett für Cloudflare D1 (SQLite) neu konzipiert und auf Multi-Tenancy ausgelegt.

## **2.1 Kern-Entitäten: Organizations & Users**

| \-- Organisationen (Vereine) – Top-Level Tenant CREATE TABLE organizations (   id           TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),   name         TEXT NOT NULL,   slug         TEXT NOT NULL UNIQUE,          \-- URL-freundlich: tsv-musterstadt   logo\_url     TEXT,                          \-- R2-Pfad zum Vereinslogo   settings     TEXT DEFAULT '{}',             \-- JSON: Sprache, Zeitzone, Module   plan         TEXT DEFAULT 'free',           \-- free | basic | pro | enterprise   created\_at   TEXT DEFAULT (datetime('now')),   updated\_at   TEXT DEFAULT (datetime('now')) ); |
| :---- |

| \-- Benutzer (Vereinsmitglieder & Admins) CREATE TABLE users (   id           TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),   org\_id       TEXT NOT NULL REFERENCES organizations(id),   email        TEXT NOT NULL,   password\_hash TEXT,                         \-- bcrypt/argon2, NULL bei Social Login   first\_name   TEXT NOT NULL,   last\_name    TEXT NOT NULL,   display\_name TEXT,   avatar\_url   TEXT,                          \-- R2-Pfad   status       TEXT DEFAULT 'active',         \-- active | inactive | pending | blocked   member\_number TEXT,                         \-- Vereinsinterne Mitgliedsnummer   qr\_code      TEXT,                          \-- UUID für QR-Code auf Mitgliedskarte   last\_login   TEXT,   created\_at   TEXT DEFAULT (datetime('now')),   updated\_at   TEXT DEFAULT (datetime('now')),   UNIQUE(org\_id, email) ); CREATE INDEX idx\_users\_org ON users(org\_id); CREATE INDEX idx\_users\_email ON users(org\_id, email); CREATE INDEX idx\_users\_status ON users(org\_id, status); CREATE INDEX idx\_users\_qr ON users(qr\_code); |
| :---- |

## **2.2 Dynamische Profilfelder (EAV-Pattern)**

Wie bei Admidio (adm\_user\_fields / adm\_user\_data) werden frei definierbare Mitgliederfelder über ein Entity-Attribute-Value-Pattern realisiert. Jeder Verein kann eigene Felder anlegen.

| \-- Felddefinitionen (was kann ein Verein erfassen?) CREATE TABLE profile\_field\_definitions (   id           TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),   org\_id       TEXT NOT NULL REFERENCES organizations(id),   category     TEXT DEFAULT 'general',        \-- general | contact | sport | medical | custom   field\_name   TEXT NOT NULL,                  \-- Interner Name: 'belt\_color'   field\_label  TEXT NOT NULL,                  \-- Anzeigename: 'Gürtelfarbe'   field\_type   TEXT NOT NULL,                  \-- text | number | date | select | checkbox | url   options      TEXT,                           \-- JSON-Array für select: \['Weiß','Gelb','Orange'\]   is\_required  INTEGER DEFAULT 0,   is\_searchable INTEGER DEFAULT 1,   is\_visible\_registration INTEGER DEFAULT 0,  \-- Auf Anmeldeformular sichtbar?   sort\_order   INTEGER DEFAULT 0,   gdpr\_retention\_days INTEGER,                \-- DSGVO: Auto-Löschung nach X Tagen   created\_at   TEXT DEFAULT (datetime('now')),   UNIQUE(org\_id, field\_name) ); |
| :---- |

| \-- Feldwerte pro User (EAV-Datentabelle) CREATE TABLE profile\_field\_values (   id           TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),   user\_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,   field\_id     TEXT NOT NULL REFERENCES profile\_field\_definitions(id) ON DELETE CASCADE,   value        TEXT,                           \-- Wert als Text gespeichert   created\_at   TEXT DEFAULT (datetime('now')),   updated\_at   TEXT DEFAULT (datetime('now')),   UNIQUE(user\_id, field\_id) ); CREATE INDEX idx\_pfv\_user ON profile\_field\_values(user\_id); CREATE INDEX idx\_pfv\_field ON profile\_field\_values(field\_id, value); |
| :---- |

**Warum EAV statt JSON-Spalte?**

| Kriterium | EAV-Pattern | JSON-Spalte |
| :---- | :---- | :---- |
| Suchbarkeit | Direkt per SQL-Index filterbar | Nur über json\_extract() – langsam bei vielen Zeilen |
| Typsicherheit | Validierung über field\_type \+ Application-Layer | Keine native Validierung in SQLite |
| DSGVO-Löschung | Einzelne Felder gezielt löschbar | Gesamtes JSON muss geparsed/rewritten werden |
| Reporting | Einfache JOINs für Berichte | Komplexe JSON-Aggregation nötig |
| Performance | Viele JOINs bei vielen Feldern | Ein einzelner Read, aber große Payloads |

**Empfehlung:** EAV für durchsuchbare/filterbare Felder \+ eine optionale JSON-Spalte (metadata) in der users-Tabelle für selten abgefragte Zusatzinfos. Hybrid-Ansatz.

## **2.3 Rollen & Berechtigungen**

| \-- Rollen (wie Admidio: adm\_roles) CREATE TABLE roles (   id           TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),   org\_id       TEXT NOT NULL REFERENCES organizations(id),   name         TEXT NOT NULL,                  \-- 'Trainer', 'Admin', 'Vorstand'   description  TEXT,   category     TEXT DEFAULT 'general',         \-- general | team | department | system   is\_system    INTEGER DEFAULT 0,              \-- System-Rollen nicht löschbar   max\_members  INTEGER,                        \-- Kapazitätsgrenze (z.B. Torhüter: 3\)   permissions  TEXT DEFAULT '\[\]',              \-- JSON-Array: \['members.read','events.write'\]   parent\_role\_id TEXT REFERENCES roles(id),    \-- Hierarchie: Abteilung \> Mannschaft   sort\_order   INTEGER DEFAULT 0,   created\_at   TEXT DEFAULT (datetime('now')),   UNIQUE(org\_id, name) ); |
| :---- |

| \-- Rollenzuweisungen (wie Admidio: adm\_members) CREATE TABLE user\_roles (   id           TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),   user\_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,   role\_id      TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,   is\_leader    INTEGER DEFAULT 0,              \-- Gruppenleiter/Trainer   start\_date   TEXT NOT NULL DEFAULT (date('now')),   end\_date     TEXT DEFAULT '9999-12-31',      \-- Offene Mitgliedschaft   status       TEXT DEFAULT 'active',           \-- active | pending | expired   created\_at   TEXT DEFAULT (datetime('now')),   UNIQUE(user\_id, role\_id, start\_date) ); CREATE INDEX idx\_ur\_user ON user\_roles(user\_id); CREATE INDEX idx\_ur\_role ON user\_roles(role\_id); CREATE INDEX idx\_ur\_active ON user\_roles(role\_id, status, end\_date); |
| :---- |

**System-Rollen (werden bei Org-Erstellung automatisch angelegt):**

| Rolle | Permissions | Beschreibung |
| :---- | :---- | :---- |
| org\_admin | \* (alle) | Vollzugriff auf alle Funktionen des Vereins |
| member\_admin | members.\*, roles.\* | Mitglieder- und Rollenverwaltung |
| event\_admin | events.\*, courses.\* | Kurs- und Terminverwaltung |
| finance\_admin | invoices.\*, payments.\* | Rechnungen, Buchhaltung, ePayment |
| trainer | events.read, attendance.write, members.read | Anwesenheit erfassen, Kurse einsehen |
| member | profile.own, events.register | Eigenes Profil, Anmeldung zu Events |

## **2.4 Familien & Beziehungen**

| \-- Familien-Gruppen (Zusammenfassung von Accounts) CREATE TABLE families (   id           TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),   org\_id       TEXT NOT NULL REFERENCES organizations(id),   name         TEXT NOT NULL,                  \-- 'Familie Müller'   primary\_contact\_id TEXT REFERENCES users(id), \-- Hauptansprechpartner   discount\_percent REAL DEFAULT 0,             \-- Familienrabatt   created\_at   TEXT DEFAULT (datetime('now')) ); \-- Familien-Mitgliedschaften CREATE TABLE family\_members (   id           TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),   family\_id    TEXT NOT NULL REFERENCES families(id) ON DELETE CASCADE,   user\_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,   relationship TEXT DEFAULT 'member',          \-- parent | child | spouse | member   is\_billing\_contact INTEGER DEFAULT 0,   UNIQUE(family\_id, user\_id) ); |
| :---- |

## **2.5 Events & Kurse**

| \-- Kategorien für Events/Kurse CREATE TABLE event\_categories (   id           TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),   org\_id       TEXT NOT NULL REFERENCES organizations(id),   name         TEXT NOT NULL,                  \-- 'Training', 'Wettkampf', 'Lager'   color        TEXT DEFAULT '\#2E86C1',         \-- Kalenderfarbe   icon         TEXT,                           \-- Material Icon Name   sort\_order   INTEGER DEFAULT 0,   UNIQUE(org\_id, name) ); |
| :---- |

| \-- Events / Kurse (wie Admidio: adm\_dates) CREATE TABLE events (   id           TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),   org\_id       TEXT NOT NULL REFERENCES organizations(id),   category\_id  TEXT REFERENCES event\_categories(id),   title        TEXT NOT NULL,   description  TEXT,   event\_type   TEXT NOT NULL,                  \-- single | recurring | course   location     TEXT,   start\_date   TEXT NOT NULL,   end\_date     TEXT,   recurrence\_rule TEXT,                        \-- iCal RRULE: 'FREQ=WEEKLY;BYDAY=MO,WE'   max\_participants INTEGER,                    \-- NULL \= unbegrenzt   registration\_deadline TEXT,   cancellation\_deadline TEXT,   fee\_amount   REAL DEFAULT 0,                 \-- Teilnahmegebühr   fee\_currency TEXT DEFAULT 'EUR',   auto\_invoice INTEGER DEFAULT 0,              \-- Automatische Rechnung bei Anmeldung   is\_public    INTEGER DEFAULT 0,              \-- Öffentlich sichtbar (Homepage)?   status       TEXT DEFAULT 'active',           \-- draft | active | cancelled | completed   created\_by   TEXT REFERENCES users(id),   created\_at   TEXT DEFAULT (datetime('now')),   updated\_at   TEXT DEFAULT (datetime('now')) ); CREATE INDEX idx\_events\_org ON events(org\_id, start\_date); CREATE INDEX idx\_events\_type ON events(org\_id, event\_type, status); |
| :---- |

| \-- Einzeltermine eines wiederkehrenden Events CREATE TABLE event\_occurrences (   id           TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),   event\_id     TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,   start\_date   TEXT NOT NULL,   end\_date     TEXT,   is\_cancelled INTEGER DEFAULT 0,   override\_location TEXT,                      \-- Abweichender Ort   notes        TEXT ); CREATE INDEX idx\_eo\_event ON event\_occurrences(event\_id, start\_date); |
| :---- |

| \-- Zielgruppen-Einschränkungen pro Event (welche Rollen dürfen sich anmelden?) CREATE TABLE event\_target\_roles (   event\_id     TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,   role\_id      TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,   max\_from\_role INTEGER,                       \-- Kapazität pro Rolle (z.B. max 3 Torhüter)   PRIMARY KEY (event\_id, role\_id) ); |
| :---- |

| \-- Event-Anmeldungen (Registrierungen \+ Warteliste) CREATE TABLE event\_registrations (   id           TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),   event\_id     TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,   occurrence\_id TEXT REFERENCES event\_occurrences(id),  \-- NULL \= gesamte Serie   user\_id      TEXT NOT NULL REFERENCES users(id),   status       TEXT DEFAULT 'registered',      \-- registered | waitlist | cancelled | attended   waitlist\_position INTEGER,                   \-- Position auf der Warteliste   cancellation\_reason TEXT,   registered\_at TEXT DEFAULT (datetime('now')),   registered\_by TEXT REFERENCES users(id),     \-- Wer hat angemeldet (Eltern für Kind)   invoice\_id   TEXT REFERENCES invoices(id),   \-- Verknüpfung zur auto-generierten Rechnung   UNIQUE(event\_id, user\_id, occurrence\_id) ); CREATE INDEX idx\_er\_event ON event\_registrations(event\_id, status); CREATE INDEX idx\_er\_user ON event\_registrations(user\_id); |
| :---- |

| \-- Kursleiter-Zuweisungen (DSGVO-konform sichtbar) CREATE TABLE event\_leaders (   event\_id     TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,   user\_id      TEXT NOT NULL REFERENCES users(id),   role\_label   TEXT DEFAULT 'Trainer',          \-- 'Trainer', 'Co-Trainer', 'Betreuer'   show\_on\_registration INTEGER DEFAULT 1,       \-- Auf Anmeldeseite anzeigen?   PRIMARY KEY (event\_id, user\_id) ); |
| :---- |

## **2.6 Anwesenheitskontrolle**

| \-- Anwesenheitseinträge CREATE TABLE attendance (   id           TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),   occurrence\_id TEXT NOT NULL REFERENCES event\_occurrences(id) ON DELETE CASCADE,   user\_id      TEXT NOT NULL REFERENCES users(id),   status       TEXT NOT NULL,                   \-- present | absent | excused | late   checked\_in\_at TEXT,                           \-- Zeitstempel des Check-ins   checked\_in\_by TEXT REFERENCES users(id),      \-- Trainer oder Self-Checkin via QR   check\_in\_method TEXT DEFAULT 'manual',        \-- manual | qr\_scan | auto   notes        TEXT,   UNIQUE(occurrence\_id, user\_id) ); CREATE INDEX idx\_att\_occ ON attendance(occurrence\_id); CREATE INDEX idx\_att\_user ON attendance(user\_id, status); |
| :---- |

## **2.7 Kommunikation**

| \-- Nachrichten (E-Mail, Push, Chat, SMS) CREATE TABLE messages (   id           TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),   org\_id       TEXT NOT NULL REFERENCES organizations(id),   sender\_id    TEXT REFERENCES users(id),   channel      TEXT NOT NULL,                   \-- email | push | chat | sms | homepage   subject      TEXT,   body         TEXT NOT NULL,                   \-- HTML oder Plaintext   template\_id  TEXT REFERENCES message\_templates(id),   is\_published INTEGER DEFAULT 0,               \-- Auf Homepage veröffentlicht?   publish\_date TEXT,   status       TEXT DEFAULT 'draft',             \-- draft | sent | scheduled | failed   scheduled\_at TEXT,   sent\_at      TEXT,   created\_at   TEXT DEFAULT (datetime('now')) ); \-- Empfänger (Zielgruppen: Rollen, Einzelpersonen, alle) CREATE TABLE message\_recipients (   id           TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),   message\_id   TEXT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,   recipient\_type TEXT NOT NULL,                  \-- role | user | all   recipient\_id TEXT,                             \-- role\_id oder user\_id (NULL bei 'all')   delivery\_status TEXT DEFAULT 'pending',        \-- pending | delivered | read | bounced   delivered\_at TEXT ); \-- Textvorlagen mit personalisierbaren Tags CREATE TABLE message\_templates (   id           TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),   org\_id       TEXT NOT NULL REFERENCES organizations(id),   name         TEXT NOT NULL,   channel      TEXT NOT NULL,   subject      TEXT,   body         TEXT NOT NULL,                    \-- Mit Tags: {{first\_name}}, {{event\_title}}   signature    TEXT,   created\_at   TEXT DEFAULT (datetime('now')) ); |
| :---- |

## **2.8 Finanzen & Rechnungen**

| \-- Rechnungen CREATE TABLE invoices (   id           TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),   org\_id       TEXT NOT NULL REFERENCES organizations(id),   user\_id      TEXT NOT NULL REFERENCES users(id),   invoice\_number TEXT NOT NULL,                  \-- Fortlaufende Nummer: 'RE-2026-00042'   type         TEXT DEFAULT 'invoice',           \-- invoice | credit\_note | reminder   status       TEXT DEFAULT 'draft',             \-- draft | sent | paid | overdue | cancelled   subtotal     REAL NOT NULL,   tax\_rate     REAL DEFAULT 0,   tax\_amount   REAL DEFAULT 0,   total        REAL NOT NULL,   currency     TEXT DEFAULT 'EUR',   due\_date     TEXT,   paid\_at      TEXT,   payment\_method TEXT,                           \-- stripe | sepa | cash | bank\_transfer   stripe\_payment\_id TEXT,   pdf\_url      TEXT,                             \-- R2-Pfad zur generierten PDF   notes        TEXT,   created\_at   TEXT DEFAULT (datetime('now')),   UNIQUE(org\_id, invoice\_number) ); \-- Rechnungspositionen CREATE TABLE invoice\_items (   id           TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),   invoice\_id   TEXT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,   description  TEXT NOT NULL,   quantity     REAL DEFAULT 1,   unit\_price   REAL NOT NULL,   total        REAL NOT NULL,   event\_id     TEXT REFERENCES events(id),       \-- Verknüpfung zum auslösenden Event   sort\_order   INTEGER DEFAULT 0 ); |
| :---- |

| \-- Buchhaltung (Vereinskasse) CREATE TABLE accounting\_entries (   id           TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),   org\_id       TEXT NOT NULL REFERENCES organizations(id),   invoice\_id   TEXT REFERENCES invoices(id),   entry\_date   TEXT NOT NULL,   type         TEXT NOT NULL,                    \-- income | expense   category     TEXT,                             \-- Mitgliedsbeiträge, Material, Hallenmiete...   description  TEXT NOT NULL,   amount       REAL NOT NULL,   payment\_method TEXT,   receipt\_url  TEXT,                             \-- R2-Pfad zum Beleg   created\_by   TEXT REFERENCES users(id),   created\_at   TEXT DEFAULT (datetime('now')) ); |
| :---- |

## **2.9 Webshop & Materialbank**

| \-- Webshop-Produkte CREATE TABLE shop\_products (   id           TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),   org\_id       TEXT NOT NULL REFERENCES organizations(id),   category     TEXT,   name         TEXT NOT NULL,   description  TEXT,   price        REAL NOT NULL,   currency     TEXT DEFAULT 'EUR',   stock        INTEGER,                          \-- NULL \= unbegrenzt   image\_url    TEXT,                             \-- R2-Pfad   is\_active    INTEGER DEFAULT 1,   members\_only INTEGER DEFAULT 0,   created\_at   TEXT DEFAULT (datetime('now')) ); \-- Bestellungen CREATE TABLE shop\_orders (   id           TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),   org\_id       TEXT NOT NULL REFERENCES organizations(id),   user\_id      TEXT NOT NULL REFERENCES users(id),   status       TEXT DEFAULT 'pending',            \-- pending | paid | shipped | completed | cancelled   total        REAL NOT NULL,   invoice\_id   TEXT REFERENCES invoices(id),   created\_at   TEXT DEFAULT (datetime('now')) ); \-- Materialbank (Dateien / Dokumente) CREATE TABLE files (   id           TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),   org\_id       TEXT NOT NULL REFERENCES organizations(id),   folder\_path  TEXT DEFAULT '/',   file\_name    TEXT NOT NULL,   mime\_type    TEXT,   size\_bytes   INTEGER,   r2\_key       TEXT NOT NULL,                    \-- R2-Objekt-Key   uploaded\_by  TEXT REFERENCES users(id),   access\_roles TEXT DEFAULT '\[\]',                \-- JSON: Welche Rollen dürfen zugreifen   created\_at   TEXT DEFAULT (datetime('now')) ); |
| :---- |

## **2.10 Gespeicherte Filter & Kollektionen**

| \-- Intelligente, sich automatisch aktualisierende Mitgliederlisten CREATE TABLE saved\_filters (   id           TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),   org\_id       TEXT NOT NULL REFERENCES organizations(id),   created\_by   TEXT REFERENCES users(id),   name         TEXT NOT NULL,                    \-- 'Aktive U18-Judoka'   entity\_type  TEXT NOT NULL,                    \-- users | events | invoices   filter\_rules TEXT NOT NULL,                    \-- JSON: \[{field, op, value}\]   columns      TEXT,                             \-- JSON: Welche Spalten anzeigen   is\_favorite  INTEGER DEFAULT 0,   is\_shared    INTEGER DEFAULT 0,                \-- Für alle Admins sichtbar?   created\_at   TEXT DEFAULT (datetime('now')) ); |
| :---- |

# **3\. Entwicklungs-Roadmap**

Die Entwicklung folgt einem iterativen Ansatz in 5 Phasen. Jede Phase liefert ein funktionsfähiges Inkrement.

## **Phase 1: Foundation & Auth (Wochen 1–4)**

**Ziel:** Lauffähige Grundinfrastruktur mit Login und Basis-UI.

| Aufgabe | Details | Technologie |
| :---- | :---- | :---- |
| Projekt-Setup | Monorepo (Turborepo): apps/web (SvelteKit), apps/api (Hono Worker) | Turborepo, TypeScript |
| D1-Schema v1 | Organizations, Users, Roles, User\_Roles – Migrationen mit drizzle-orm | D1, Drizzle ORM |
| Auth-System | Login, Registrierung, JWT (Ed25519), Refresh-Token, Passwort-Reset | Workers, KV |
| API-Grundgerüst | Hono.js Router, JWT-Middleware, CORS, Error-Handling | Hono.js Worker |
| Frontend-Shell | SvelteKit App mit Auth-Flow, Dashboard-Layout, responsives Design | SvelteKit, Pages |
| CI/CD Pipeline | GitHub Actions: Lint, Test, Deploy zu Cloudflare | GitHub Actions |

**Ergebnis:** User kann sich registrieren, einloggen und ein leeres Dashboard sehen.

## **Phase 2: Mitgliederverwaltung (Wochen 5–10)**

**Ziel:** Vollständige Mitgliederverwaltung mit dynamischen Feldern und Rollen.

| Aufgabe | Details | Technologie |
| :---- | :---- | :---- |
| Dynamische Profilfelder | EAV-System: Felddefinitionen CRUD, Feldwerte pro User | D1, API Worker |
| Mitglieder-CRUD | Profil anlegen/bearbeiten, Profilbild-Upload (R2), Statusverwaltung | Worker, R2 |
| Rollen-System | Rollen CRUD, User-Rollen-Zuweisung, Hierarchien, Berechtigungsmatrix | D1, Middleware |
| Such- & Filterfunktionen | Kombinierbare Filter, als Favorit speicherbar (saved\_filters) | D1, SvelteKit |
| Familienfunktion | Familien-Gruppen, Elternzugang, Familienrabatte | D1, API |
| Import/Export | CSV/Excel Import, DOSB-XML Export | Worker (Papa Parse) |
| QR-Mitgliedskarten | QR-Code-Generierung, PDF-Karten-Layout, digitale Karte in App | Worker, R2 |
| Online-Anmeldung | Registrierungsformular für neue Mitglieder (inkl. DSGVO) | SvelteKit, Worker |

**Ergebnis:** Funktionsfähige Mitgliederverwaltung – vergleichbar mit Admidio-Kernfunktionen.

## **Phase 3: Events, Kurse & Anwesenheit (Wochen 11–16)**

**Ziel:** Kurs- und Terminverwaltung mit Anmeldung, Wartelisten und Anwesenheitskontrolle.

| Aufgabe | Details | Technologie |
| :---- | :---- | :---- |
| Event-System | Events/Kurse CRUD, Kategorien, Einzeltermine, Wiederkehrende Termine (RRULE) | D1, API |
| Anmeldungsmanagement | Online-Anmeldung, Kapazitätsgrenzen, rollenbasierte Limits | D1, Worker |
| Wartelisten-Logik | Auto-Nachrücken bei Absagen, Benachrichtigung, Positionsverwaltung | Worker, Queue |
| Anwesenheitskontrolle | Check-In via App (Abhaken \+ QR-Scan), Aktivitätsberichte | SvelteKit, Worker |
| Echtzeit-Statistiken | Live-Teilnahmeübersicht via Durable Objects \+ WebSocket | Durable Objects |
| Kursleiter-Zuweisung | Trainer zuweisen, DSGVO-konform auf Anmeldeseite sichtbar | D1, API |
| Auto-Rechnung | Automatische Rechnungserstellung bei Event-Anmeldung | Worker, D1 |
| Kalender-Integration | Terminkalender-Widget für Vereinshomepage (embeddable) | SvelteKit, Worker |

**Ergebnis:** Komplette Kurs-/Terminverwaltung mit Anwesenheitskontrolle und Live-Dashboard.

## **Phase 4: Kommunikation & Finanzen (Wochen 17–22)**

**Ziel:** Zielgruppenspezifische Kommunikation und Basis-Buchhaltung.

| Aufgabe | Details | Technologie |
| :---- | :---- | :---- |
| Chat-System | Echtzeit-Chat via Durable Objects, Push-Benachrichtigungen | DO, WebSocket |
| E-Mail-Versand | Zielgruppenspezifische E-Mails, Vorlagen mit Tags, Signaturen | Worker, Email API |
| Benachrichtigungen | In-App Notifications (Login-Banner, kurzfristige Meldungen) | D1, SvelteKit |
| Homepage-Publishing | Nachrichten direkt auf Vereinshomepage veröffentlichen | Worker, API |
| Rechnungswesen | Rechnungs-CRUD, PDF-Generierung, Mahnsystem, Nummernkreise | Worker, R2 |
| ePayment (Stripe) | Stripe-Integration: Mitgliedsbeiträge, Kursgebühren, Webshop | Stripe API |
| Buchhaltungs-Modul | Einnahmen/Ausgaben, Kategorien, Excel-Export für Kassenwart | D1, Worker |

**Ergebnis:** Verein kann kommunizieren, Rechnungen stellen und Zahlungen entgegennehmen.

## **Phase 5: Zusatzmodule & Mobile App (Wochen 23–30)**

**Ziel:** Erweiterte Module, mobile App und Produktionsreife.

| Aufgabe | Details | Technologie |
| :---- | :---- | :---- |
| Mobile App | SvelteKit-Frontend via Capacitor als iOS/Android-App verpacken | Capacitor, SvelteKit |
| PWA-Optimierung | Offline-Fähigkeit, Service Worker, Push-Notifications | Workbox, Web Push |
| Webshop | Produktkatalog, Warenkorb, Bestellverwaltung, Stripe-Checkout | D1, Stripe, R2 |
| CheckIn-Modus | Automatisierter Einlass via QR-Scan (Tablet-Kiosk-Mode) | SvelteKit, Worker |
| Materialbank | Dateiarchiv mit Ordnern, Zugriffsrechte pro Rolle | R2, D1 |
| Mitgliedsberichte | Alterspyramide, Geschlechterverteilung, Einzugsgebiet, Charts | D3.js, Worker |
| REST-API Docs | Vollständige API-Dokumentation (OpenAPI/Swagger) | Scalar, OpenAPI |
| DSGVO-Compliance | Datenexport, Löschfristen, Audit-Log, Consent-Management | D1, Worker |
| Load Testing & Security | Performance-Tests, Penetration-Tests, Rate-Limiting-Feintuning | k6, Workers |

**Ergebnis:** Produktionsreife SaaS-Plattform mit Mobile App und allen Zusatzmodulen.

## **Phasenübersicht (Gantt-ähnlich)**

| Phase | Zeitraum | Kern-Deliverable | Status |
| :---- | :---- | :---- | :---- |
| 1 – Foundation | Woche 1–4 | Auth \+ API \+ Shell | Geplant |
| 2 – Mitglieder | Woche 5–10 | Mitgliederverwaltung (MVP) | Geplant |
| 3 – Events | Woche 11–16 | Kurse \+ Anwesenheit \+ Echtzeit | Geplant |
| 4 – Komm. & Finanzen | Woche 17–22 | Chat \+ E-Mail \+ Rechnungen \+ Stripe | Geplant |
| 5 – Extras & Mobile | Woche 23–30 | App \+ Webshop \+ DSGVO \+ Go-Live | Geplant |

# **4\. Technische Entscheidungen & Patterns**

## **4.1 Framework-Empfehlung: SvelteKit**

SvelteKit wird als Frontend-Framework empfohlen, weil es native SSR/SSG auf Cloudflare Pages unterstützt, minimales JavaScript an den Client sendet (kein virtuelles DOM), und über den Cloudflare-Adapter eine erstklassige Edge-Integration bietet.

## **4.2 API-Design: Hono.js auf Workers**

Hono.js ist ein ultraleichtes Web-Framework (14kb), speziell für Cloudflare Workers optimiert. Es bietet typisierte Routen, eingebaute Middleware (CORS, JWT, Rate-Limiting) und ist deutlich performanter als Express-ähnliche Frameworks am Edge.

## **4.3 ORM: Drizzle \+ D1**

Drizzle ORM wird für die D1-Anbindung empfohlen. Es generiert typsichere SQL-Queries, unterstützt D1 nativ, und ermöglicht Schema-Migrationen. Im Gegensatz zu Prisma läuft Drizzle ohne Code-Generierung direkt im Worker.

## **4.4 Durable Objects: Einsatzbereiche**

| Feature | Durable Object | Warum DO statt Worker? |
| :---- | :---- | :---- |
| Chat-Räume | ChatRoomDO | Persistenter WebSocket-Zustand, Nachrichtenhistorie im DO-Storage |
| Live-Statistiken | EventStatsDO | Echtzeit-Zähler für Teilnehmer, keine Race Conditions bei gleichzeitigen Check-ins |
| Rate Limiter | RateLimiterDO | Pro-User oder Pro-Org Rate Limiting mit atomaren Zählern |
| Wartelisten-Lock | WaitlistDO | Garantiert atomares Nachrücken ohne Double-Booking |

## **4.5 Sicherheitsarchitektur**

| Maßnahme | Implementierung |
| :---- | :---- |
| Authentifizierung | JWT mit Ed25519 (EdDSA), kurze Access-Token (15min), Refresh-Token-Rotation |
| Autorisierung | RBAC via permissions\[\] im JWT, Middleware-Check pro Endpoint |
| DSGVO | Einwilligungsverwaltung, automatische Datenlöschung (gdpr\_retention\_days), Audit-Log |
| Input-Validierung | Zod-Schemas für alle API-Inputs, Prepared Statements gegen SQL-Injection |
| Rate Limiting | Cloudflare WAF \+ Custom Durable Object Rate Limiter pro Org/User |
| Verschlüsselung | TLS (Cloudflare), Passwort-Hashing (bcrypt/argon2), sensible Daten verschlüsselt in D1 |
| CSP & Headers | Strict Content-Security-Policy, HSTS, X-Frame-Options via Workers |

# **5\. Mapping: Admidio → Neue Plattform**

Die folgende Tabelle zeigt, wie die Admidio-Konzepte in die neue Cloud-Architektur übertragen werden:

| Admidio-Konzept | Admidio-Tabelle | Neue Plattform | Verbesserung |
| :---- | :---- | :---- | :---- |
| User | adm\_users | users | Multi-Org, QR-Code, Status-Workflow |
| Profildaten (EAV) | adm\_user\_data \+ adm\_user\_fields | profile\_field\_definitions \+ profile\_field\_values | DSGVO-Retention, Kategorien, bessere Suchindizes |
| Rollen | adm\_roles | roles | JSON-Permissions, Hierarchien, Kapazitätsgrenzen |
| Mitgliedschaften | adm\_members | user\_roles | Start/End-Date, Leader-Flag, Status-Tracking |
| Events/Termine | adm\_dates | events \+ event\_occurrences | RRULE für Wiederholungen, Auto-Rechnung, öffentliche Events |
| Anmeldungen | adm\_date\_role | event\_registrations | Warteliste, Auto-Nachrücken, Stornierungsgründe |
| Kategorien | adm\_categories | event\_categories \+ role categories | Pro Entity-Typ, Farben, Icons |
| Nachrichten | adm\_messages | messages \+ message\_recipients | Multi-Channel, Templates, Homepage-Publishing |
| Dateien | adm\_files \+ adm\_folders | files (R2-backed) | Unbegrenzter Speicher, CDN-Delivery, Rollen-Zugriffsrechte |
| Beziehungen | adm\_user\_relations | families \+ family\_members | Familienrabatte, Billing-Contact, Elternzugang |
| **Buchhaltung** | Nicht vorhanden | invoices \+ accounting\_entries | **Komplett neues Modul** |
| **Webshop** | Nicht vorhanden | shop\_products \+ shop\_orders | **Komplett neues Modul** |

# **6\. Nächste Schritte**

Nach Freigabe dieses Konzepts beginnen wir mit Phase 1:

| Schritt | Aufgabe | Output |
| :---- | :---- | :---- |
| 1 | Monorepo aufsetzen (Turborepo \+ SvelteKit \+ Hono) | Lauffähiges Projekt mit Deploy-Pipeline |
| 2 | D1-Schema v1 implementieren (Drizzle Migrationen) | Datenbank mit Kern-Tabellen |
| 3 | Auth-System bauen (Register \+ Login \+ JWT) | Funktionierender Auth-Flow |
| 4 | API-Grundgerüst mit Middleware | Geschützte Endpoints mit Role-Check |
| 5 | Frontend-Shell mit Login-UI | Responsive Dashboard mit Auth-Integration |

**Bereit zum Start?** Gib mir das Go für Phase 1, und ich liefere dir den Code für das Monorepo-Setup und das Auth-System.
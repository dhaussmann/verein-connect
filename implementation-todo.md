# Implementation TODO

## Hoch

- Mitglieder: `Nachricht senden` ist in der Listenansicht ohne Aktion verdrahtet.
  Fundstellen: [app/modules/members/web/MembersListRoute.tsx](app/modules/members/web/MembersListRoute.tsx)
  Relevante Zeilen: ca. 231, 284
  Problem: Menüeintrag und Sammelaktion rendern, lösen aber weder Navigation noch Submit aus.

- Mitglieder: `Nachricht` auf der Detailseite ist ohne Funktion.
  Fundstelle: [app/modules/members/web/MemberDetailPage.tsx](app/modules/members/web/MemberDetailPage.tsx)
  Relevante Zeile: ca. 105
  Problem: Button hat keinen Handler und keine Route-Verknüpfung.

- Mitglieder: Profilbearbeitung speichert nicht.
  Fundstellen: [app/modules/members/web/MemberDetailPage.tsx](app/modules/members/web/MemberDetailPage.tsx), [app/routes/members/$id.tsx](app/routes/members/$id.tsx)
  Relevante Zeilen: ca. 157-164, 19-81
  Problem: `Speichern` beendet nur den Edit-Modus; Route-Action verarbeitet keine Profil-Update-Aktion.

- Mitglieder: `Rolle zuweisen` ist nur UI ohne Persistenz.
  Fundstellen: [app/modules/members/web/MemberDetailPage.tsx](app/modules/members/web/MemberDetailPage.tsx), [app/routes/members/$id.tsx](app/routes/members/$id.tsx)
  Relevante Zeilen: ca. 507-520, 19-81
  Problem: Modal schließt nur; es gibt kein `intent` und keinen Use-Case für Rollenzuweisung.

- Kommunikation: Empfängerangaben werden nicht fachlich verarbeitet.
  Fundstellen: [app/routes/communication/email.tsx](app/routes/communication/email.tsx), [app/modules/communication/use-cases/communication.use-cases.ts](app/modules/communication/use-cases/communication.use-cases.ts)
  Relevante Zeilen: ca. 25-31, 48-54
  Problem: Formular liest `recipients`, speichert aber immer pauschal `recipientType: "all"`.

## Mittel

- Kommunikation: `Öffnen` in der Nachrichtenliste ist ohne Aktion.
  Fundstelle: [app/routes/communication/index.tsx](app/routes/communication/index.tsx)
  Relevante Zeile: ca. 46
  Problem: Menüpunkt ist sichtbar, aber ohne Navigation oder Detailansicht.

- Finanzen: `Neue Rechnung` ist ohne Funktion.
  Fundstelle: [app/routes/finance/index.tsx](app/routes/finance/index.tsx)
  Relevante Zeile: ca. 80
  Problem: Button hat keinen Handler und keine Zielroute.

- Finanzen: `PDF herunterladen` und `Mahnung senden` sind ohne Funktion.
  Fundstelle: [app/routes/finance/index.tsx](app/routes/finance/index.tsx)
  Relevante Zeile: ca. 112
  Problem: Menüeinträge sind reine Platzhalter.

- Finanzen: Rechnungs-Detailansicht ist nur Text-Platzhalter.
  Fundstelle: [app/routes/finance/index.tsx](app/routes/finance/index.tsx)
  Relevante Zeilen: ca. 120-121
  Problem: Modal enthält keine echte fachliche Darstellung oder Aktionen.

- Mitglieder: Sammelaktionen unten sind überwiegend ohne Funktion.
  Fundstelle: [app/modules/members/web/MembersListRoute.tsx](app/modules/members/web/MembersListRoute.tsx)
  Relevante Zeilen: ca. 281-285
  Problem: `Status ändern`, `Gruppe zuweisen`, `Rechnung senden`, `Nachricht senden`, `Exportieren` sind nicht verdrahtet.

- Mitglieder: Export-Menü (`CSV`, `Excel`, `DOSB-XML`) ist ohne Funktion.
  Fundstelle: [app/modules/members/web/MembersListRoute.tsx](app/modules/members/web/MembersListRoute.tsx)
  Relevante Zeilen: ca. 155-162
  Problem: Sichtbare Exportoptionen ohne Implementierung.

- Buchhaltung: `Excel Export` ist ohne Funktion.
  Fundstelle: [app/routes/finance/accounting.tsx](app/routes/finance/accounting.tsx)
  Relevante Zeile: ca. 51
  Problem: Button ohne Aktion.

## Niedrig

- Mitglieder: `QR-Karte` ist ohne Funktion.
  Fundstelle: [app/modules/members/web/MemberDetailPage.tsx](app/modules/members/web/MemberDetailPage.tsx)
  Relevante Zeile: ca. 106
  Problem: Button ohne Handler oder Folgeansicht.

- Mitglieder: `Familienmitglied verknüpfen` ist ohne Funktion.
  Fundstelle: [app/modules/members/web/MemberDetailPage.tsx](app/modules/members/web/MemberDetailPage.tsx)
  Relevante Zeile: ca. 470
  Problem: Button ohne Datenmodell-/UI-Anbindung.

- Neues Mitglied: Foto-Upload ist nur visuelle Dropzone.
  Fundstelle: [app/modules/members/web/MemberCreateRoute.tsx](app/modules/members/web/MemberCreateRoute.tsx)
  Relevante Zeilen: ca. 45-51
  Problem: Kein `input type="file"` und keine Serververarbeitung.

- Neues Mitglied: Beitrittsdatum wird nicht übermittelt.
  Fundstellen: [app/modules/members/web/MemberCreateRoute.tsx](app/modules/members/web/MemberCreateRoute.tsx), [app/routes/members/new.tsx](app/routes/members/new.tsx)
  Relevante Zeilen: ca. 79-84, 19-31
  Problem: Feld hat kein `name` und wird im Action-Schema nicht verarbeitet.

- Registrierung: Links zu `Datenschutzerklärung` und `Nutzungsbedingungen` zeigen auf `#`.
  Fundstelle: [app/routes/auth/register.tsx](app/routes/auth/register.tsx)
  Relevante Zeile: ca. 223
  Problem: Tote Links statt echter Rechtsdokumente.

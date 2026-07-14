# Klinikklar

Klinikklar är en AI-driven SaaS-MVP för etablering och compliance inom privat tandvård.
Fokus i första versionen är att hjälpa en tandläkare etablera en ny klinik och förbereda underlag inför IVO-processen.

## Teknik

- Next.js (App Router) + TypeScript + Tailwind CSS
- Supabase/PostgreSQL
- Serverbaserad AI-generering via API-route
- Dokumentexport till DOCX/PDF

## MVP-funktioner

- Klinikprofil med grunduppgifter
- Interaktiv frågeguide med följdfrågor
- Kontrollpanel med klart/saknas-status
- Dokumentgenerator för:
	- Verksamhetsbeskrivning
	- Ledningssystem
	- Riskanalys
	- Avvikelsehantering
	- Egenkontroll
- Granskningsläge där användaren verifierar AI-genererat innehåll
- Export till Word/PDF

## Kom Igång

1. Installera beroenden:

```bash
npm install
```

2. Kopiera miljövariabler:

```bash
cp .env.example .env.local
```

3. Lägg in Supabase-nycklar i `.env.local`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

4. Starta utvecklingsserver:

```bash
npm run dev
```

5. Öppna `http://localhost:3000`

## Databas (Supabase)

Datamodellen finns i `supabase/schema.sql` och innehåller:

- `organizations`
- `clinics`
- `persons`
- `ownership_roles`
- `applications`
- `questionnaire_responses`
- `requirements`
- `evidence`
- `document_templates`
- `generated_documents`
- `document_versions`

Kör SQL-skriptet i Supabase SQL Editor för att skapa tabellerna.

## Skript

- `npm run dev` startar lokalt
- `npm run build` bygger produktion
- `npm run lint` kör ESLint
- `npm run typecheck` kör TypeScript-kontroll

## Begränsningar i MVP

- Ingen automatisk inlämning till IVO
- Ingen BankID-signering
- Ingen full juridisk rådgivning
- Ingen hantering av patientjournaler eller patientdata
- Inga myndighetsintegrationer

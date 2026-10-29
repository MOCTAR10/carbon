/**
 * CarbonTrack — Documentation Word Generator
 * Run: node scripts/generate-doc.mjs
 * Output: CarbonTrack-Documentation.docx (in project root)
 */

import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, AlignmentType, WidthType, BorderStyle,
  PageBreak, TabStopType, TabStopPosition,
} from 'docx'
import { writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// ─── Color palette ────────────────────────────────────────────────────────────
const GREEN  = '166534'
const DKBLUE = '1e3a5f'
const GRAY   = '6b7280'
const LTGRAY = 'f3f4f6'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function h1(text) {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 400, after: 160 },
    border: { bottom: { color: GREEN, size: 8, style: BorderStyle.SINGLE } },
  })
}

function h2(text) {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 300, after: 120 },
  })
}

function h3(text) {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 200, after: 80 },
  })
}

function p(text, opts = {}) {
  return new Paragraph({
    children: [new TextRun({ text, size: 22, color: opts.color ?? '374151', ...opts })],
    spacing: { after: 120 },
    indent: opts.indent ? { left: 400 } : undefined,
  })
}

function bold(text, opts = {}) {
  return new Paragraph({
    children: [new TextRun({ text, bold: true, size: 22, color: opts.color ?? '111827', ...opts })],
    spacing: { after: 80 },
  })
}

function bullet(text, level = 0) {
  return new Paragraph({
    children: [new TextRun({ text, size: 21, color: '374151' })],
    bullet: { level },
    spacing: { after: 60 },
  })
}

function note(text) {
  return new Paragraph({
    children: [new TextRun({ text: `ℹ  ${text}`, size: 20, color: '1e40af', italics: true })],
    spacing: { after: 120, before: 80 },
    indent: { left: 300 },
    border: { left: { color: '3b82f6', size: 12, style: BorderStyle.SINGLE } },
  })
}

function warning(text) {
  return new Paragraph({
    children: [new TextRun({ text: `⚠  ${text}`, size: 20, color: '92400e', italics: true })],
    spacing: { after: 120, before: 80 },
    indent: { left: 300 },
    border: { left: { color: 'f59e0b', size: 12, style: BorderStyle.SINGLE } },
  })
}

function spacer() {
  return new Paragraph({ text: '', spacing: { after: 120 } })
}

function pageBreak() {
  return new Paragraph({ children: [new PageBreak()] })
}

function makeTable(headers, rows, colWidths) {
  const totalWidth = 9000
  const widths = colWidths ?? headers.map(() => Math.floor(totalWidth / headers.length))

  const headerRow = new TableRow({
    tableHeader: true,
    children: headers.map((h, i) =>
      new TableCell({
        width: { size: widths[i], type: WidthType.DXA },
        shading: { fill: '166534' },
        children: [new Paragraph({
          children: [new TextRun({ text: h, bold: true, color: 'FFFFFF', size: 20 })],
          alignment: AlignmentType.CENTER,
        })],
      })
    ),
  })

  const dataRows = rows.map((row, ri) =>
    new TableRow({
      children: row.map((cell, ci) =>
        new TableCell({
          width: { size: widths[ci], type: WidthType.DXA },
          shading: { fill: ri % 2 === 0 ? 'FFFFFF' : 'f9fafb' },
          children: [new Paragraph({
            children: [new TextRun({ text: String(cell), size: 20, color: '374151' })],
          })],
        })
      ),
    })
  )

  return new Table({
    width: { size: totalWidth, type: WidthType.DXA },
    rows: [headerRow, ...dataRows],
    margins: { top: 60, bottom: 60, left: 80, right: 80 },
  })
}

// ─── Cover Page ───────────────────────────────────────────────────────────────

function makeCover() {
  return [
    spacer(), spacer(), spacer(),
    new Paragraph({
      children: [new TextRun({ text: 'CarbonTrack', bold: true, size: 72, color: GREEN })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
    }),
    new Paragraph({
      children: [new TextRun({ text: 'Plateforme de Gestion Carbone — Gabon', size: 36, color: GRAY })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    }),
    new Paragraph({
      children: [new TextRun({ text: 'Documentation Technique & Fonctionnelle Complète', size: 28, bold: true, color: DKBLUE })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    }),
    new Paragraph({
      children: [new TextRun({ text: 'Version 1.0 — Avril 2026', size: 24, color: GRAY, italics: true })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 600 },
    }),
    new Paragraph({
      children: [new TextRun({ text: 'Stack : Next.js 14 · PostgreSQL 17 · TypeScript · TailwindCSS · JWT', size: 22, color: GRAY })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
    }),
    new Paragraph({
      children: [new TextRun({ text: 'Déployé sur : Windows 11 · Node.js 20', size: 22, color: GRAY })],
      alignment: AlignmentType.CENTER,
    }),
    pageBreak(),
  ]
}

// ─── Document sections ────────────────────────────────────────────────────────

function makeResume() {
  return [
    h1('1. Résumé Exécutif'),
    p('CarbonTrack est une plateforme web multi-rôles destinée à la gestion des émissions de gaz à effet de serre (GES) au Gabon. Elle remplit deux fonctions principales :'),
    bullet('Accompagner les entreprises dans leur certification OGEC/CNC (obligatoire en vertu de l\'Ordonnance N°019/PR/2021)'),
    bullet('Faciliter les projets carbone des ONG partenaires (REDD+, ARR, Cookstoves, Mangrove) en vue d\'une certification internationale Verra ou Gold Standard'),
    spacer(),
    note('CarbonTrack est un hub facilitateur. Il ne délivre pas de certificats officiels ni de crédits carbone. Ces actes relèvent exclusivement des autorités compétentes (CNC/OGEC pour la certification nationale, Verra/Gold Standard pour les crédits internationaux).'),
    spacer(),
    h2('Modules livrés'),
    makeTable(
      ['Module', 'Statut', 'Session'],
      [
        ['Bilan GES Scope 1/2/3', 'Complet', 'Existant'],
        ['Abonnements & paiements', 'Complet', 'Existant'],
        ['Certification OGEC — Workflow 8 statuts', 'Complet', 'Session 1–2'],
        ['Checklist d\'audit JSONB expert (6 sections)', 'Complet', 'Session 2'],
        ['Rapport Expert PDF (5 pages)', 'Complet', 'Session 1'],
        ['Dashboard entreprise — suivi certification', 'Complet', 'Session 3'],
        ['Récapitulatif de Certification (PDF)', 'Complet', 'Session 3'],
        ['Projets carbone ONG — CRUD + Baseline', 'Complet', 'Session 4'],
        ['Moteur MRV — VM0048/VM0047/VM0050/VM0033', 'Complet', 'Session 4'],
        ['Vue admin projets carbone', 'Complet', 'Session 5'],
        ['PDD, Rapport Surveillance, Dossier OGEC (PDF)', 'Complet', 'Session 6'],
        ['Workflow VVB — Email + CARs/CLs + Opinion', 'Complet', 'Session 7'],
        ['Suivi Crédits Carbone (facilitateur)', 'Complet', 'Session 8'],
        ['Assistant Méthodologies RAG (Groq + FTS)', 'Complet', 'Session 9'],
      ],
      [3600, 2400, 3000]
    ),
    spacer(),
    pageBreak(),
  ]
}

function makeArchitecture() {
  return [
    h1('2. Architecture Technique'),
    h2('2.1 Stack'),
    makeTable(
      ['Couche', 'Technologie', 'Usage'],
      [
        ['Frontend', 'Next.js 14 (App Router)', 'Pages React Server Components + Client'],
        ['UI', 'TailwindCSS + Lucide React', 'Composants, icônes'],
        ['Backend', 'Next.js Route Handlers', 'API REST dans src/app/api/'],
        ['Auth', 'JWT (jose) + cookies httpOnly', 'Sessions sécurisées, rôles'],
        ['Base de données', 'PostgreSQL 17', 'Données principales + FTS tsvector'],
        ['PDF', '@react-pdf/renderer v4', 'Génération PDF côté serveur'],
        ['Email', 'Nodemailer (SMTP)', 'Notifications VVB (manuel)'],
        ['IA / RAG', 'Groq API (llama-3.3-70b)', 'Assistant méthodologies (temporaire)'],
        ['Déploiement', 'Windows 11 / Local', 'Prod : Linux + PM2 prévu'],
      ],
      [2200, 2800, 4000]
    ),
    spacer(),
    h2('2.2 Rôles & Accès'),
    makeTable(
      ['Rôle', 'Route base', 'Accès'],
      [
        ['admin', '/admin', 'Vue complète, actions workflow, registre crédits'],
        ['expert', '/expert', 'Checklist audit, opinion, rapport PDF'],
        ['partner (ONG)', '/partner', 'Projets carbone, MRV, assistant méthodologies'],
        ['company (entreprise)', '/dashboard', 'Bilan GES, suivi certification, téléchargements'],
      ],
      [2000, 2200, 4800]
    ),
    spacer(),
    h2('2.3 Structure des dossiers clés'),
    bullet('src/app/api/           — Routes API (admin/, expert/, partner/, rag/, certifications/)'),
    bullet('src/app/admin/         — Pages admin panel'),
    bullet('src/app/partner/       — Pages portail ONG'),
    bullet('src/app/dashboard/     — Pages portail entreprise'),
    bullet('src/app/expert/        — Pages portail expert'),
    bullet('src/lib/documents/     — Templates PDF (@react-pdf/renderer)'),
    bullet('src/lib/mrv/           — Moteur de calcul MRV'),
    bullet('src/lib/email/         — Nodemailer (mailer.ts, vvbEmail.ts)'),
    bullet('src/lib/groq.ts        — Client Groq API'),
    bullet('scripts/               — Migrations SQL + scripts utilitaires'),
    spacer(),
    pageBreak(),
  ]
}

function makePhase1() {
  return [
    h1('3. Phase 1 — Certification OGEC/CNC Nationale'),
    note('Le certificat officiel est délivré par l\'OGEC / Conseil National Climat (CNC) — gouvernement gabonais. CarbonTrack facilite le processus et génère un Récapitulatif de Certification (document facilitateur interne, non officiel).'),
    spacer(),
    h2('3.1 Flux de certification — 8 statuts'),
    makeTable(
      ['Statut', 'Déclencheur', 'Acteur'],
      [
        ['pending', 'Entreprise soumet une demande', 'Entreprise'],
        ['assigned', 'Admin assigne un expert', 'Admin'],
        ['audit_scheduled', 'Admin programme l\'audit terrain', 'Admin'],
        ['audit_done', 'Expert finalise la checklist JSONB', 'Expert'],
        ['dossier_compiled', 'Admin compile le dossier', 'Admin'],
        ['submitted_to_ogec', 'Admin soumet à l\'OGEC (hors plateforme)', 'Admin (manuel)'],
        ['avis_issued', 'Admin enregistre l\'Avis CNC + upload PDF officiel', 'Admin (manuel)'],
        ['certified / rejected', 'Admin finalise', 'Admin'],
      ],
      [2400, 3600, 3000]
    ),
    spacer(),
    h2('3.2 Checklist d\'audit expert — 6 sections JSONB'),
    bullet('Section 1 — Éligibilité & Périmètre OGEC (seuil 10 000 tCO₂e, Scope 1+2)'),
    bullet('Section 2 — Qualité des données (facteurs d\'émission, lacunes)'),
    bullet('Section 3 — Calculs & Méthodologie (conformité ISO 14064)'),
    bullet('Section 4 — Visite de site (date, sites couverts, constatations)'),
    bullet('Section 5 — Conformité OGEC (Articles 24–26 de l\'Ordonnance)'),
    bullet('Section 6 — Opinion finale (favorable / sous conditions / défavorable)'),
    spacer(),
    h2('3.3 Documents générés par CarbonTrack'),
    makeTable(
      ['Document', 'Fichier', 'Destinataire'],
      [
        ['Rapport d\'Audit Expert (5 pages)', 'ExpertReportPDF.tsx', 'Admin + Entreprise'],
        ['Récapitulatif de Certification', 'CertificatFinalPDF.tsx', 'Entreprise (document facilitateur)'],
        ['Dossier Soumission OGEC (3 pages)', 'OGECDossierPDF.tsx', 'Admin (pour soumission manuelle)'],
      ],
      [3000, 3000, 3000]
    ),
    warning('L\'Avis de Conformité officiel est émis par le CNC et uploadé manuellement par l\'admin. CarbonTrack ne génère pas ce document.'),
    spacer(),
    pageBreak(),
  ]
}

function makePhase2() {
  return [
    h1('4. Phase 2 — Moteur de Projets Carbone (ONG)'),
    h2('4.1 Types de projets supportés'),
    makeTable(
      ['Type', 'Code', 'Méthodologie Verra'],
      [
        ['Déforestation évitée (REDD+)', 'redd_plus', 'VM0048 v1.0'],
        ['Boisement / Reboisement (ARR)', 'arr', 'VM0047'],
        ['Foyers améliorés', 'cookstoves', 'VM0050'],
        ['Mangrove / Carbone bleu', 'mangrove', 'VM0033'],
        ['Énergie solaire', 'solar', 'AMS-I.A / Gold Standard'],
      ],
      [2800, 2200, 4000]
    ),
    spacer(),
    h2('4.2 Formules MRV (src/lib/mrv/calculate.ts)'),
    bold('REDD+ (VM0048) :'),
    p('baseline = déforestation_ha/an × densité_carbone_tCO₂/ha × superficie_ha', { indent: true }),
    bold('ARR (VM0047) :'),
    p('séquestration = superficie_ha × incrément_annuel_tCO₂/ha/an', { indent: true }),
    bold('Cookstoves (VM0050) :'),
    p('baseline = ménages × combustible_économisé_kg/an × facteur_émission_tCO₂/kg', { indent: true }),
    bold('Formule universelle :'),
    p('réductions_nettes = baseline − émissions_projet − fuites', { indent: true }),
    p('crédits_éligibles = réductions_nettes − buffer_pool', { indent: true }),
    spacer(),
    h2('4.3 Flux MRV'),
    bullet('1. Partner crée un projet (type, méthodologie, superficie, localisation)'),
    bullet('2. Partner définit le baseline (paramètres selon la méthodologie)'),
    bullet('3. Partner saisit les données de monitoring par période'),
    bullet('4. Calcul MRV automatique → crédits_éligibles'),
    bullet('5. Admin génère le PDD + Rapport de Surveillance (PDF)'),
    bullet('6. Admin assigne un VVB pour validation/vérification'),
    spacer(),
    pageBreak(),
  ]
}

function makePhase3() {
  return [
    h1('5. Phase 3 — Génération de Documents PDF'),
    p('Bibliothèque : @react-pdf/renderer v4. Tous les PDFs sont générés côté serveur (Node.js) et streamés au client.'),
    spacer(),
    makeTable(
      ['Document', 'Pages', 'Template', 'Route API'],
      [
        ['Rapport d\'Audit Expert', '5', 'ExpertReportPDF.tsx', 'POST /api/admin/certifications/[id]/generate-pdf'],
        ['Récapitulatif de Certification', '1', 'CertificatFinalPDF.tsx', 'POST /api/certifications/[id]/generate-certificate'],
        ['Project Design Document (PDD)', '4', 'PDDPDF.tsx', 'POST /api/partner/projects/[id]/generate-pdd'],
        ['Rapport de Surveillance MRV', '2', 'MonitoringReportPDF.tsx', 'POST /api/partner/monitoring-periods/[id]/generate-report'],
        ['Dossier Soumission OGEC', '3', 'OGECDossierPDF.tsx', 'POST /api/admin/certifications/[id]/generate-ogec-dossier'],
      ],
      [2400, 600, 2800, 3200]
    ),
    spacer(),
    pageBreak(),
  ]
}

function makePhase4() {
  return [
    h1('6. Phase 4 — Workflow VVB (Vérificateurs)'),
    note('Le VVB est un organisme tiers accrédité (Bureau Veritas, SGS, DNV, TÜV SÜD…). Toutes les interactions sont manuelles — l\'admin déclenche chaque action.'),
    spacer(),
    h2('6.1 Processus'),
    bullet('1. Admin sélectionne un VVB dans le registre (7 VVBs pré-enregistrés) ou saisit manuellement'),
    bullet('2. Admin remplit le nom, email et contact du VVB puis clique "Assigner"'),
    bullet('3. Email envoyé automatiquement avec le PDD + Rapport de Surveillance en pièces jointes'),
    bullet('4. Admin suit les CARs (Corrective Action Requests) et CLs (Clarification Letters)'),
    bullet('5. Admin enregistre l\'opinion du VVB (FAVORABLE / SOUS CONDITIONS / DÉFAVORABLE)'),
    spacer(),
    h2('6.2 Email VVB'),
    warning('L\'email est déclenché uniquement par l\'admin (action manuelle). Aucun envoi automatique.'),
    p('Si SMTP_USER / SMTP_PASS ne sont pas configurés dans .env.local, l\'email est journalisé en console (graceful degradation) sans crasher l\'application.'),
    spacer(),
    h2('6.3 Tables base de données'),
    bullet('vvb_verifications — une ligne par assignation VVB (status, cars JSONB, cls JSONB, opinion)'),
    bullet('vvb_registry — 7 VVBs accrédités pré-chargés'),
    spacer(),
    pageBreak(),
  ]
}

function makePhase5() {
  return [
    h1('7. Phase 5 — Suivi des Crédits Carbone'),
    warning('CarbonTrack N\'émet PAS de crédits carbone. Seuls Verra, Gold Standard ou l\'OGEC peuvent émettre des crédits. CarbonTrack enregistre ce que ces registres officiels ont fait.'),
    spacer(),
    h2('7.1 Rôle de CarbonTrack — Facilitateur'),
    makeTable(
      ['Action', 'Qui la fait', 'CarbonTrack'],
      [
        ['Émettre des crédits', 'Verra / Gold Standard / OGEC', 'Enregistre l\'événement'],
        ['Assigner un numéro de série', 'Verra (ex: VCS-4271-2024-001)', 'Stocke le numéro reçu'],
        ['Gérer le buffer pool AFOLU', 'Verra', 'Affiche l\'information'],
        ['Retirer des crédits', 'Via le registre Verra', 'Enregistre la confirmation'],
      ],
      [2800, 2800, 3400]
    ),
    spacer(),
    h2('7.2 Flux réel'),
    bullet('1. MRV calculé → crédits_éligibles = X tCO₂e (CarbonTrack calcule, ne crée pas de crédits)'),
    bullet('2. CarbonTrack prépare le dossier (PDD + Rapport) → soumis à Verra manuellement'),
    bullet('3. Verra valide et émet les crédits → envoie confirmation avec numéros de série'),
    bullet('4. Admin enregistre dans CarbonTrack : quantité + numéro de série Verra reçu'),
    bullet('5. Retraite via Verra → Admin enregistre la confirmation (bénéficiaire + raison)'),
    spacer(),
    h2('7.3 Référence interne'),
    p('Un identifiant interne REF-{projectId}-{vintage}-{seq} est généré à l\'enregistrement. Ce n\'est PAS un numéro de série Verra. Le numéro officiel Verra est saisi manuellement dans le champ "N° de série Verra / GS".'),
    spacer(),
    h2('7.4 Tables base de données'),
    bullet('carbon_credits — enregistrements des crédits émis par les registres officiels'),
    bullet('credit_transactions — audit trail immuable (emission, retirement, cancellation)'),
    bullet('registry_accounts — (créé, non utilisé activement — pour phase marketplace future)'),
    bullet('registry_summary VIEW — agrégats par projet pour le tableau de bord admin'),
    spacer(),
    pageBreak(),
  ]
}

function makePhase6() {
  return [
    h1('8. Phase 6 — Assistant Méthodologies (RAG)'),
    h2('8.1 Architecture'),
    makeTable(
      ['Composant', 'Technologie', 'Rôle'],
      [
        ['LLM', 'Groq — llama-3.3-70b-versatile', 'Génération des réponses (temporaire)'],
        ['Recherche', 'PostgreSQL FTS (tsvector + GIN)', 'Retrieval des chunks pertinents'],
        ['Extraction PDF', 'pdf-parse', 'Ingestion des documents Verra'],
        ['Streaming', 'SSE (Server-Sent Events)', 'Réponse mot par mot vers le client'],
      ],
      [2000, 3000, 4000]
    ),
    spacer(),
    h2('8.2 Documents ingérés'),
    bullet('VM0048 v1.0 — Reducing Emissions from Deforestation and Forest Degradation'),
    bullet('VM0048 — Clarification July 2024'),
    bullet('Verra Registry Terms of Use — October 2024'),
    bullet('Verra Registry User Guide'),
    spacer(),
    h2('8.3 Flux RAG'),
    bullet('1. Partner pose une question en français'),
    bullet('2. PostgreSQL FTS : plainto_tsquery(\'english\', question) → top 6 chunks'),
    bullet('3. Fallback ILIKE si FTS ne retourne rien'),
    bullet('4. Contexte assemblé → prompt Groq avec instructions en français'),
    bullet('5. Réponse streamée avec citations sources'),
    spacer(),
    note('Migration vers Claude (Anthropic) + Voyage AI (embeddings pgvector) prévue. Le client groq.ts sera remplacé par un client Anthropic — le reste du code est identique.'),
    spacer(),
    h2('8.4 Activation (une seule fois)'),
    bullet('1. Lancer la migration SQL : psql -d carbontrack -f scripts/migrate-rag.sql'),
    bullet('2. Ingérer les PDFs : GET http://localhost:3000/api/admin/rag/ingest (en tant qu\'admin)'),
    bullet('3. L\'assistant est accessible depuis /partner/methodology-assistant'),
    spacer(),
    pageBreak(),
  ]
}

function makeDecisions() {
  return [
    h1('9. Décisions Architecturales Clés'),
    h2('9.1 Manuel vs Automatique'),
    makeTable(
      ['Processus', 'Nature', 'Justification'],
      [
        ['Assignation VVB', 'Manuel (admin)', 'Contact humain requis, pas de VVB automatisé'],
        ['Envoi email VVB', 'Manuel (déclenché par admin)', 'Contrôle qualité du dossier avant envoi'],
        ['Avis de Conformité CNC', 'Upload manuel', 'Document officiel gouvernemental — non générable'],
        ['Émission crédits Verra', 'Enregistrement manuel', 'Verra est un registre externe indépendant'],
        ['Retraite crédits', 'Enregistrement manuel', 'Confirmée par Verra, pas par CarbonTrack'],
      ],
      [2400, 2200, 4400]
    ),
    spacer(),
    h2('9.2 Immutabilité du registre'),
    p('Toutes les transactions de crédits sont append-only — aucune suppression. Les statuts évoluent uniquement vers l\'avant. L\'historique est permanent.'),
    spacer(),
    h2('9.3 Récapitulatif vs Certificat officiel'),
    p('Le PDF généré par CarbonTrack (CertificatFinalPDF.tsx) est intitulé "Récapitulatif de Certification" et clairement marqué "DOCUMENT FACILITATEUR — CARBONTRACK". Il ne se substitue pas au certificat officiel OGEC/CNC.'),
    spacer(),
    h2('9.4 Numéros de référence internes'),
    p('Les projets carbone reçoivent des identifiants internes (REF-XXXX-YYYY-NNNNN). Ces identifiants ne sont pas des numéros Verra. Le numéro Verra officiel est saisi manuellement une fois attribué.'),
    spacer(),
    pageBreak(),
  ]
}

function makeBDD() {
  return [
    h1('10. Base de Données — Tables Principales'),
    makeTable(
      ['Table', 'Description', 'Phase'],
      [
        ['users', 'Comptes (admin, expert, partner, company)', 'Core'],
        ['companies', 'Entreprises clientes', 'Core'],
        ['partners', 'ONG partenaires', 'Core'],
        ['assessments', 'Bilans GES des entreprises', 'Core'],
        ['certification_requests', 'Workflow OGEC 8 statuts + champs OGEC', 'Phase 1'],
        ['carbon_projects', 'Projets carbone ONG + champs VVB', 'Phase 2'],
        ['baseline_scenarios', 'Paramètres et résultats baseline', 'Phase 2'],
        ['monitoring_periods', 'Périodes de suivi MRV', 'Phase 2'],
        ['monitoring_records', 'Données d\'activité brutes par période', 'Phase 2'],
        ['mrv_summaries', 'Résultats MRV calculés (crédits éligibles)', 'Phase 2'],
        ['vvb_verifications', 'Assignations VVB + CARs + CLs + opinion', 'Phase 4'],
        ['vvb_registry', '7 VVBs accrédités pré-chargés', 'Phase 4'],
        ['carbon_credits', 'Crédits enregistrés par Verra/GS/OGEC', 'Phase 5'],
        ['credit_transactions', 'Audit trail immuable des mouvements', 'Phase 5'],
        ['rag_documents', 'Documents PDF ingérés (VM0048, Verra…)', 'Phase 6'],
        ['rag_chunks', 'Chunks de texte avec tsvector GIN', 'Phase 6'],
      ],
      [2600, 4200, 2200]
    ),
    spacer(),
    pageBreak(),
  ]
}

function makeAPI() {
  return [
    h1('11. API Endpoints Principaux'),
    h2('Certification OGEC'),
    makeTable(
      ['Méthode', 'Route', 'Description'],
      [
        ['GET', '/api/certifications', 'Liste des certifications (entreprise)'],
        ['PATCH', '/api/admin/certifications/[id]', 'Actions workflow (8 statuts)'],
        ['POST', '/api/admin/certifications/[id]/generate-pdf', 'Rapport Expert PDF'],
        ['POST', '/api/certifications/[id]/generate-certificate', 'Récapitulatif PDF (entreprise)'],
        ['POST', '/api/admin/certifications/[id]/generate-ogec-dossier', 'Dossier OGEC PDF'],
      ],
      [900, 3600, 4500]
    ),
    spacer(),
    h2('Projets Carbone'),
    makeTable(
      ['Méthode', 'Route', 'Description'],
      [
        ['GET/POST', '/api/partner/projects', 'Liste et création projets'],
        ['GET/PATCH', '/api/partner/projects/[id]', 'Détail et mise à jour'],
        ['POST', '/api/partner/projects/[id]/baseline', 'Calcul baseline'],
        ['POST', '/api/partner/monitoring-periods/[id]/calculate', 'Calcul MRV'],
        ['POST', '/api/partner/projects/[id]/generate-pdd', 'PDD PDF'],
        ['POST', '/api/partner/monitoring-periods/[id]/generate-report', 'Rapport MRV PDF'],
      ],
      [900, 3600, 4500]
    ),
    spacer(),
    h2('VVB & Crédits'),
    makeTable(
      ['Méthode', 'Route', 'Description'],
      [
        ['POST', '/api/admin/projects/[id]/assign-vvb', 'Assigner VVB + email documents'],
        ['PATCH', '/api/admin/projects/[id]/vvb-status', 'CARs, CLs, opinion VVB'],
        ['GET/POST', '/api/admin/credits', 'Suivi crédits + enregistrement émission'],
        ['GET/PATCH', '/api/admin/credits/[id]', 'Détail + actions (retire, cancel, dispute, link_verra)'],
      ],
      [900, 3600, 4500]
    ),
    spacer(),
    h2('RAG'),
    makeTable(
      ['Méthode', 'Route', 'Description'],
      [
        ['GET', '/api/admin/rag/ingest', 'Ingestion PDFs Verra (une seule fois)'],
        ['POST', '/api/rag/query', 'Question → FTS → Groq stream → SSE'],
      ],
      [900, 3600, 4500]
    ),
    spacer(),
    pageBreak(),
  ]
}

function makeNextSteps() {
  return [
    h1('12. Prochaines Étapes'),
    h2('Court terme — Activation'),
    bullet('Exécuter toutes les migrations SQL (migrate-certification-ogec.sql, migrate-carbon-projects.sql, migrate-vvb.sql, migrate-credits.sql, migrate-rag.sql)'),
    bullet('Configurer SMTP dans .env.local quand un contact VVB est établi'),
    bullet('Déclencher l\'ingestion RAG une fois : GET /api/admin/rag/ingest'),
    bullet('Régénérer la clé Groq API (la clé a été exposée dans une conversation)'),
    spacer(),
    h2('Moyen terme — Améliorations'),
    bullet('Remplacer Groq par Claude (Anthropic) + Voyage AI embeddings + pgvector pour le RAG'),
    bullet('Ajouter les méthodologies VM0047, VM0050, VM0033 aux documents RAG'),
    bullet('Activer les modules "Marché Carbone" et "Partenaires ONG" dans la navigation principale'),
    bullet('Déploiement Linux (Ubuntu/Debian) + PM2 + Nginx reverse proxy + SSL'),
    spacer(),
    h2('Long terme — Évolutions'),
    bullet('Rôle OGEC reviewer : si l\'OGEC adopte la plateforme, permettre validation directe'),
    bullet('Marketplace carbone : mise en relation acheteurs / vendeurs de crédits'),
    bullet('Intégration API Verra : synchronisation automatique des statuts de projets enregistrés'),
    bullet('Application mobile (React Native) pour les relevés terrain des ONG'),
    spacer(),
  ]
}

// ─── Assemble document ────────────────────────────────────────────────────────

const children = [
  ...makeCover(),
  ...makeResume(),
  ...makeArchitecture(),
  ...makePhase1(),
  ...makePhase2(),
  ...makePhase3(),
  ...makePhase4(),
  ...makePhase5(),
  ...makePhase6(),
  ...makeDecisions(),
  ...makeBDD(),
  ...makeAPI(),
  ...makeNextSteps(),
]

const doc = new Document({
  creator:  'CarbonTrack',
  title:    'CarbonTrack — Documentation Technique & Fonctionnelle',
  description: 'Documentation complète de la plateforme CarbonTrack — Gabon',
  styles: {
    default: {
      document: {
        run: { font: 'Calibri', size: 22, color: '374151' },
      },
      heading1: {
        run: { font: 'Calibri', size: 36, bold: true, color: GREEN },
      },
      heading2: {
        run: { font: 'Calibri', size: 28, bold: true, color: DKBLUE },
      },
      heading3: {
        run: { font: 'Calibri', size: 24, bold: true, color: '374151' },
      },
    },
  },
  sections: [{
    properties: {
      page: {
        margin: { top: 1000, bottom: 1000, left: 1200, right: 1200 },
      },
    },
    children,
  }],
})

const buffer = await Packer.toBuffer(doc)
const outPath = path.join(__dirname, '..', 'CarbonTrack-Documentation.docx')
writeFileSync(outPath, buffer)

console.log(`✅  Document généré : ${outPath}`)

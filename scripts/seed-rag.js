/**
 * Seed RAG knowledge base
 *
 * Populates rag_documents and rag_chunks with GHG/ISO/Gabon regulatory content
 * so the Assistant IA Carbone can answer questions from its own knowledge base.
 *
 * Run: node scripts/seed-rag.js
 */

const { Pool } = require('pg')
const fs = require('fs')
const path = require('path')

// Load .env.local
const envPath = path.join(__dirname, '..', '.env.local')
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const m = line.match(/^\s*([^=]+?)\s*=\s*(.*?)\s*$/)
    if (m) process.env[m[1]] = process.env[m[1]] || m[2]
  })
}

const pool = new Pool({
  host: process.env.PGHOST || '127.0.0.1',
  port: parseInt(process.env.PGPORT || '5432'),
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || 'postgres',
  database: process.env.PGDATABASE || 'carbontrack',
})

// ── Knowledge base entries ──────────────────────────────────────────────────
// Each doc has a title, optional methodology_code, and an array of ~400-word chunks.

const DOCUMENTS = [
  // ── GHG Protocol Corporate Standard ──────────────────────────────────────
  {
    filename: 'ghg-protocol-corporate-standard.txt',
    methodology_code: null,
    title: 'GHG Protocol Corporate Accounting and Reporting Standard',
    chunks: [
      `Le GHG Protocol Corporate Standard est le standard de comptabilité carbone le plus utilisé au monde. Développé par le World Resources Institute (WRI) et le World Business Council for Sustainable Development (WBCSD), il fournit un cadre complet pour quantifier et déclarer les émissions de gaz à effet de serre (GES) des entreprises.`,
      `Le standard définit trois scopes d'émissions. Scope 1 : émissions directes provenant de sources détenues ou contrôlées par l'entreprise (chaudières, véhicules de flotte, procédés industriels, fuites de gaz réfrigérants). Scope 2 : émissions indirectes liées à la production d'électricité, de vapeur, de chauffage ou de refroidissement achetés et consommés. Scope 3 : autres émissions indirectes (chaîne d'approvisionnement, déplacements professionnels, déchets, utilisation des produits vendus).`,
      `Pour le Scope 2, deux méthodes sont possibles : market-based (utilise les facteurs d'émission des contrats d'achat d'électricité spécifiques) et location-based (utilise le facteur moyen du réseau électrique local). Les entreprises doivent déclarer les deux. Le GHG Protocol exige également la transparence sur les méthodes de calcul, les facteurs d'émission utilisés, et les sources de données.`,
      `La consolidation des émissions peut se faire selon trois approches : contrôle financier (l'entreprise consolide les sites où elle a le contrôle financier), contrôle opérationnel (l'entreprise consolide les sites qu'elle opère directement), ou participation (l'entreprise consolide proportionnellement à sa participation). L'approche choisie doit être documentée et appliquée de manière cohérente.`,
    ],
  },

  // ── ISO 14064-1 ──────────────────────────────────────────────────────────
  {
    filename: 'iso-14064-1.txt',
    methodology_code: null,
    title: 'ISO 14064-1 — Spécification et lignes directrices pour les inventaires GES',
    chunks: [
      `L'ISO 14064-1 est une norme internationale qui spécifie les principes et exigences pour la conception, le développement, la gestion et la déclaration des inventaires de GES au niveau des organisations. Elle est compatible avec le GHG Protocol mais apporte des exigences supplémentaires en matière de vérification et de certification par tierce partie.`,
      `Principes clés de l'ISO 14064-1 : pertinence (inclure les sources significatives), exhaustivité (couvrir tous les scopes), cohérence (méthodes reproductibles), exactitude (minimiser les incertitudes), transparence (documenter toutes les hypothèses). La norme exige également l'établissement d'une année de référence (année de base) pour le suivi des réductions d'émissions.`,
      `L'ISO 14064-1 définit six catégories d'émissions : Catégorie 1 (émissions directes, équivalent au Scope 1), Catégorie 2 (émissions indirectes liées à l'énergie importée, équivalent au Scope 2), Catégories 3-5 (émissions indirectes diverses), et Catégorie 6 (autres émissions indirectes). Les catégories 3 à 6 correspondent globalement au Scope 3 du GHG Protocol mais avec plus de granularité.`,
      `La norme ISO 14064-1 est utilisée comme référence pour la certification GreenLeaves de CarbonTrack. Les entreprises doivent démontrer la conformité de leur inventaire à ces principes pour obtenir la certification. La vérification est effectuée par un organisme accrédité (expert VVB) qui examine les données sources, les méthodes de calcul et les conclusions.`,
    ],
  },

  // ── Base Carbone ADEME ───────────────────────────────────────────────────
  {
    filename: 'base-carbone-ademe.txt',
    methodology_code: null,
    title: 'Base Carbone ADEME — Facteurs d\'émissions',
    chunks: [
      `La Base Carbone est la base de données publique de facteurs d'émissions gérée par l'ADEME (Agence de la transition écologique, France). Elle est la référence pour les bilans GES en France et dans les pays francophones, dont le Gabon. Elle couvre plus de 2000 facteurs d'émissions dans tous les secteurs : énergie, transport, agriculture, déchets, procédés industriels, etc.`,
      `Facteurs clés pour le Gabon : électricité (réseau SEEG : environ 0,6 kg CO2e/kWh en 2023, principalement thermique gaz/diesel), carburants (gazole : 3,07 kg CO2e/L, essence : 2,28 kg CO2e/L, GPL : 1,51 kg CO2e/L), transport aérien (0,252 kg CO2e/passager.km pour vol domestique), fret maritime (0,015 kg CO2e/tonne.km).`,
      `La Base Carbone inclut également des facteurs pour : les gaz réfrigérants (R-404A : 3943 kg CO2e/kg, R-410A : 2088 kg CO2e/kg, R-32 : 675 kg CO2e/kg), les matériaux de construction (ciment : 0,74 kg CO2e/kg, acier : 1,98 kg CO2e/kg, aluminium : 6,67 kg CO2e/kg), les déchets (enfouissement : 0,66 kg CO2e/kg, incinération : 0,49 kg CO2e/kg), et l'agriculture (engrais azotés : 7,13 kg CO2e/kg).`,
      `Pour utiliser la Base Carbone dans CarbonTrack, l'utilisateur importe ses données d'activité (kWh, litres, tonnes.km, etc.) et sélectionne le facteur approprié. Le système multiplie automatiquement les données d'activité par le facteur d'émission pour calculer les émissions en kg CO2e. Les facteurs sont mis à jour annuellement par l'ADEME.`,
    ],
  },

  // ── Ordonnance N°019/PR/2021 (Gabon) ─────────────────────────────────────
  {
    filename: 'ordonnance-019-pr-2021.txt',
    methodology_code: null,
    title: 'Ordonnance N°019/PR/2021 — Réglementation carbone gabonaise',
    chunks: [
      `L'Ordonnance N°019/PR/2021 du 1er septembre 2021 est le texte fondateur de la réglementation carbone au Gabon. Elle rend obligatoire la réalisation d'un bilan d'émissions de GES pour toutes les entreprises installées au Gabon. Elle s'inscrit dans la stratégie nationale de développement sobre en carbone et dans les engagements du Gabon au titre de l'Accord de Paris.`,
      `L'ordonnance s'applique à toutes les personnes morales de droit privé exerçant une activité économique au Gabon, ainsi qu'aux établissements publics et collectivités territoriales. Les entreprises de plus de 100 salariés ou réalisant un chiffre d'affaires supérieur à 2 milliards FCFA doivent réaliser un bilan GES tous les 3 ans. Les PME de moins de 100 salariés sont encouragées à le faire sur base volontaire.`,
      `Le bilan GES doit couvrir les émissions directes (Scope 1) et indirectes liées à l'énergie (Scope 2) sur l'ensemble des sites de l'entreprise au Gabon. Les émissions du Scope 3 sont recommandées mais pas obligatoires. Le bilan doit être réalisé selon les méthodologies reconnues (GHG Protocol, ISO 14064-1) et soumis à la Commission Nationale du Carbone (CNC) dans un délai de 6 mois suivant la clôture de l'exercice comptable.`,
      `Sanctions : le défaut de réalisation du bilan GES dans les délais expose l'entreprise à une amende de 5 à 50 millions FCFA. La CNC peut également rendre publique la liste des entreprises non conformes. L'ordonnance prévoit aussi des incitations fiscales pour les entreprises qui dépassent les exigences minimales et s'engagent dans des programmes de réduction volontaire.`,
    ],
  },

  // ── VM0048 (REDD+) ────────────────────────────────────────────────────────
  {
    filename: 'vm0048-redd.txt',
    methodology_code: 'VM0048',
    title: 'VM0048 — Reducing Emissions from Deforestation and Forest Degradation (REDD+)',
    chunks: [
      `La méthodologie VM0048 développée par Verra permet de quantifier les réductions d'émissions provenant de la déforestation et de la dégradation des forêts (REDD+). Elle s'applique aux projets forestiers dans les pays en développement et calcule les crédits carbone à partir de la différence entre la déforestation observée et un scénario de référence (baseline).`,
      `Le calcul VM0048 utilise des données de télédétection (satellite Landsat, Sentinel) pour établir la couverture forestière historique et projeter un scénario de référence. La formule de base : crédits = (émissions_baseline - émissions_projet) - buffer_pool. Le buffer pool (pool de réserve) est de 20% et sert de filet de sécurité contre les inversions potentielles (feux de forêt, déforestation illégale).`,
      `Pour un projet REDD+ type au Gabon, les paramètres incluent : la superficie du projet (ex: 50 000 ha), le taux de déforestation historique (ex: 0,5% par an), le stock de carbone forestier (ex: 250 tCO2e/ha), et la période de crédit (ex: 30 ans renouvelables). Le calcul génère des réductions nettes qui sont converties en Verified Carbon Units (VCUs) après vérification par un VVB accrédité.`,
      `VM0048 exige également une analyse de la déforestation évitée (leakage) qui peut survenir si les activités de déforestation se déplacent en dehors de la zone du projet. Le leakage est calculé comme un pourcentage des réductions brutes et déduit avant l'attribution des crédits. Un suivi annuel par imagerie satellite et des inventaires terrain est requis pour la durée du projet.`,
    ],
  },

  // ── VM0047 (ARR) ──────────────────────────────────────────────────────────
  {
    filename: 'vm0047-arr.txt',
    methodology_code: 'VM0047',
    title: 'VM0047 — Afforestation, Reforestation and Revegetation (ARR)',
    chunks: [
      `La méthodologie VM0047 de Verra couvre les projets de boisement, reboisement et revégétalisation (ARR). Elle quantifie les émissions de GES évitées et l'augmentation de la séquestration de carbone grâce à la plantation d'arbres sur des terres qui n'étaient pas forestières historiquement ou qui ont été dégradées.`,
      `Dans VM0047, le calcul des crédits repose sur la croissance des arbres plantés mesurée en tonnes de CO2 séquestrées par hectare et par an. Les taux de séquestration varient selon les espèces : okoumé (12-15 tCO2e/ha/an), ozigo (10-12 tCO2e/ha/an), andoung (8-10 tCO2e/ha/an). Les espèces à croissance rapide (acacia, eucalyptus) peuvent atteindre 20-25 tCO2e/ha/an.`,
      `Le scénario de baseline pour VM0047 est généralement l'utilisation des terres sans le projet (pâturage, agriculture sur brûlis, savane). Le projet doit démontrer que la zone n'était pas forestière avant le début des activités (prouvé par imagerie satellite sur 10 ans minimum). La période de crédit standard est de 20 à 40 ans, renouvelable selon les performances.`,
      `VM0047 inclut des exigences de suivi : inventaires forestiers annuels sur des placettes permanentes, mesure de la hauteur et du diamètre des arbres, calcul de la biomasse à l'aide d'équations allométriques validées localement. Un buffer pool de 20% s'applique. Les co-bénéfices (biodiversité, emplois locaux, hydrologie) doivent être documentés pour la certification.`,
    ],
  },

  // ── VM0050 (Cookstoves) ──────────────────────────────────────────────────
  {
    filename: 'vm0050-cookstoves.txt',
    methodology_code: 'VM0050',
    title: 'VM0050 — Improved Cookstove Energy Efficiency',
    chunks: [
      `La méthodologie VM0050 de Verra quantifie les réductions d'émissions provenant de l'installation de foyers de cuisson améliorés (cookstoves). Elle s'applique dans les pays en développement où la cuisson au bois ou au charbon de bois est courante. Les foyers améliorés réduisent la consommation de combustible de 30 à 60%, diminuant ainsi les émissions de CO2 et les polluants atmosphériques.`,
      `Le calcul VM0050 compare la consommation de combustible avant et après l'installation des foyers améliorés. La formule : réductions = (nombre_de_foyers × consommation_annuelle_baseline × facteur_d'émission) - (nombre_de_foyers × consommation_annuelle_projet × facteur_d'émission). Le suivi se fait via des enquêtes auprès des ménages et des tests de cuisson standardisés (Water Boiling Test).`,
      `Pour un projet typique au Gabon distribuant 10 000 foyers améliorés : consommation baseline de 3 tonnes de bois/ménage/an (soit 4,5 tCO2e/ménage/an), consommation projet réduite à 1,5 tonne/ménage/an (soit 2,25 tCO2e/ménage/an). Réductions annuelles totales : 10 000 × (4,5 - 2,25) = 22 500 tCO2e. Le buffer pool VM0050 est de 15 à 20% selon les risques identifiés.`,
      `VM0050 exige un suivi des foyers sur le terrain : taux de pénétration (utilisation réelle), durabilité des équipements, saturation du marché. Un échantillonnage statistique représentatif est requis (95% de confiance, 10% de précision). La période de crédit standard est de 7 à 10 ans, avec renouvellement possible après démonstration de l'additionnalité continue.`,
    ],
  },

  // ── VM0033 (Mangroves) ───────────────────────────────────────────────────
  {
    filename: 'vm0033-mangroves.txt',
    methodology_code: 'VM0033',
    title: 'VM0033 — Mangrove Afforestation and Restoration',
    chunks: [
      `La méthodologie VM0033 de Verra est dédiée aux projets de boisement, reboisement et restauration des mangroves. Les mangroves sont des écosystèmes à très forte capacité de séquestration de carbone (carbone bleu), stockant 3 à 5 fois plus de carbone par hectare que les forêts tropicales terrestres, principalement dans les sols.`,
      `Le calcul VM0033 inclut la biomasse aérienne (troncs, branches, feuilles) et souterraine (racines) ainsi que le carbone organique du sol. Les taux de séquestration des mangroves : 5-10 tCO2e/ha/an (biomasse) + 3-5 tCO2e/ha/an (sédimentation carbone). Les espèces de mangrove au Gabon : palétuvier rouge (Rhizophora racemosa), palétuvier noir (Avicennia germinans), et Laguncularia racemosa.`,
      `Les mangroves gabonaises couvrent environ 2 500 km², principalement dans l'estuaire du Komo, le delta de l'Ogooué et le cap Lopez. Les projets VM0033 au Gabon doivent tenir compte des menaces spécifiques : pollution pétrolière, urbanisation côtière, exploitation forestière illégale, et acidification des eaux. Les co-bénéfices sont significatifs : protection côtière, nurseries pour la pêche, habitat pour les oiseaux migrateurs.`,
      `La période de suivi VM0033 est de 20 à 30 ans minimum. Le buffer pool est de 20-25% (risques cyclones, maladies, pression anthropique). Les inventaires doivent mesurer la hauteur, le diamètre et la densité des arbres sur des transects permanents, avec échantillonnage des sols pour le carbone souterrain. La télédétection (drone, satellite haute résolution) est utilisée pour le suivi spatial.`,
    ],
  },

  // ── Certification GreenLeaves ─────────────────────────────────────────────
  {
    filename: 'certification-greenleaves.txt',
    methodology_code: null,
    title: 'Certification GreenLeaves — CarbonTrack',
    chunks: [
      `La certification GreenLeaves est le label carbone proposé par CarbonTrack pour les entreprises gabonaises. Elle atteste que le bilan GES de l'entreprise a été réalisé conformément aux normes ISO 14064-1 et au GHG Protocol, et qu'il a été vérifié par un expert VVB (Validation & Verification Body) accrédité.`,
      `Le processus de certification comprend : 1) Réalisation du bilan GES complet (Scopes 1, 2, 3) via la plateforme CarbonTrack, 2) Examen par un expert VVB qui vérifie les données sources, les méthodes de calcul, et la conformité aux normes, 3) Vérification terrain (audit) si nécessaire, 4) Délivrance du certificat par la CNC (Commission Nationale du Carbone).`,
      `Trois niveaux de certification GreenLeaves existent : Bronze (bilan Scope 1+2 vérifié, sans réduction), Argent (bilan Scope 1+2+3 vérifié avec plan de réduction approuvé), Or (bilan complet vérifié + réduction effective des émissions d'au moins 20% par rapport à l'année de référence). Chaque niveau donne droit à des incitations fiscales progressives selon l'Ordonnance N°019/PR/2021.`,
      `Le certificat GreenLeaves est valable 3 ans. Une vérification intermédiaire (surveillance) est requise à 18 mois pour les niveaux Argent et Or. Les entreprises certifiées sont inscrites au registre public de la CNC et peuvent utiliser le logo GreenLeaves dans leur communication. Le non-respect des conditions de certification peut entraîner la suspension ou le retrait du certificat.`,
    ],
  },

  // ── CarbonTrack Platform ──────────────────────────────────────────────────
  {
    filename: 'carbontrack-platform.txt',
    methodology_code: null,
    title: 'Plateforme CarbonTrack — Guide d\'utilisation',
    chunks: [
      `CarbonTrack est une plateforme SaaS de gestion du bilan carbone destinée aux entreprises gabonaises. Développée en collaboration avec la CNC (Commission Nationale du Carbone), elle permet de réaliser son bilan GES conformément aux exigences de l'Ordonnance N°019/PR/2021, du GHG Protocol et de l'ISO 14064-1.`,
      `Fonctionnalités principales : import de données d'activité (fichier Excel, API, saisie manuelle), calcul automatique des émissions avec les facteurs de la Base Carbone ADEME, génération de rapports PDF conformes aux standards, suivi des réductions dans le temps, gestion des sites et des scopes, et demande de certification GreenLeaves.`,
      `La plateforme propose trois portails : un tableau de bord entreprise (accès aux bilans et rapports), un portail expert (pour les VVB qui vérifient les bilans), et un portail administration (CNC pour la gestion des certifications et du registre national). Les utilisateurs entreprise peuvent inviter des collaborateurs, assigner des rôles, et suivre la progression de leur bilan en temps réel.`,
      `CarbonTrack intègre également un assistant IA basé sur Groq (LLaMA 3.3 70B) qui répond aux questions sur les méthodologies, les facteurs d'émissions, la réglementation gabonaise, et le processus de certification. L'assistant utilise une base de connaissances (RAG) alimentée par les documents normatifs et réglementaires pour fournir des réponses précises et sourcées en français.`,
    ],
  },

  // ── Procédure de vérification VVB ─────────────────────────────────────────
  {
    filename: 'vvb-verification.txt',
    methodology_code: null,
    title: 'VVB — Procédure de vérification et de validation',
    chunks: [
      `La vérification par un VVB (Validation & Verification Body) est une étape obligatoire pour la certification GreenLeaves. Le VVB est un organisme accrédité indépendant qui examine l'inventaire GES de l'entreprise pour s'assurer de sa conformité aux normes ISO 14064-1 et 14064-3.`,
      `La procédure de vérification comprend : 1) Examen documentaire (analyse des données sources, méthodes de calcul, facteurs d'émission utilisés), 2) Visite terrain optionnelle (vérification des compteurs, inspections des installations), 3) Rapport de vérification avec conclusions et recommandations, 4) Délivrance d'une déclaration de vérification qui atteste que l'inventaire est sans erreur significative.`,
      `Le seuil de matérialité (significance threshold) est fixé à 5% des émissions totales. Les erreurs ou omissions représentant moins de 5% peuvent être tolérées. Au-delà, le vérificateur exige des corrections avant de pouvoir émettre une opinion positive. Le rapport de vérification doit être soumis à la CNC avec la déclaration GES de l'entreprise.`,
      `CarbonTrack facilite la vérification en permettant aux experts VVB d'accéder directement aux données de l'entreprise via le portail expert, de laisser des commentaires et annotations sur les postes d'émission, et de générer le rapport de vérification depuis la plateforme. Le suivi des actions correctives est intégré au workflow de certification.`,
    ],
  },

  // ── Buffer pool AFOLU ────────────────────────────────────────────────────
  {
    filename: 'buffer-pool-afolu.txt',
    methodology_code: null,
    title: 'Buffer Pool AFOLU — Gestion des risques d\'inversion',
    chunks: [
      `Le buffer pool (pool de réserve) AFOLU (Agriculture, Forestry and Other Land Use) est un mécanisme de gestion des risques conçu par Verra pour couvrir les inversions potentielles des crédits carbone. Une inversion se produit lorsque du carbone séquestré est relâché dans l'atmosphère (feu de forêt, déforestation, maladie).`,
      `Le mécanisme fonctionne comme un pool mutualisé : chaque projet AFOLU contribue un pourcentage de ses crédits (typiquement 15-25%) au buffer pool. Les crédits du buffer pool sont détenus collectivement et ne peuvent pas être vendus comme crédits carbone. En cas d'inversion dans un projet, des crédits du buffer pool sont annulés proportionnellement aux pertes, protégeant l'intégrité des VCUs vendus.`,
      `Les taux de contribution au buffer pool sont déterminés par une évaluation des risques : risque de feu (bas/moyen/élevé selon la zone climatique), risque de maladie/pestes, risque de gouvernance (stabilité politique, tenure foncière), et risque de changement d'affectation des terres. Pour le Gabon, le taux de base est de 20% pour VM0048 et 15-20% pour VM0047 et VM0050.`,
      `Le buffer pool AFOLU est géré par Verra et fait l'objet d'un suivi annuel. Les crédits du pool sont inscrits dans un registre et ne peuvent pas être utilisés pour des obligations de compensation. En cas d'épuisement du pool, Verra peut exiger des contributions supplémentaires des projets actifs. La transparence du buffer pool est assurée par la publication trimestrielle des soldes et des inversions.`,
    ],
  },

  // ─── Prix du carbone et marché ─────────────────────────────────────────────
  {
    filename: 'carbon-market.txt',
    methodology_code: null,
    title: 'Marché carbone et prix du carbone',
    chunks: [
      `Le prix du carbone sur le marché volontaire (VCM — Voluntary Carbon Market) varie selon le type de projet et la qualité des crédits. En 2024-2025, les prix constatés sont : crédits REDD+ (VM0048) : 5-15 USD/tCO2e, crédits ARR (VM0047) : 10-20 USD/tCO2e, crédits cookstoves (VM0050) : 8-12 USD/tCO2e, crédits mangroves (VM0033) : 15-25 USD/tCO2e (prime carbone bleu).`,
      `Le Gabon développe un marché carbone national dans le cadre de sa stratégie bas-carbone. Les entreprises gabonaises peuvent acheter des crédits carbone locaux (projets forestiers, énergétiques) pour compenser leurs émissions résiduelles après réduction. La CNC tiendra un registre national des crédits carbone pour assurer la traçabilité et éviter la double comptabilité.`,
      `La taxe carbone gabonaise est en cours d'étude par le Ministère de l'Économie et des Finances. Un taux de 5 000 à 10 000 FCFA/tCO2e est envisagé pour les émissions excédentaires au-delà des quotas sectoriels. Les entreprises certifiées GreenLeaves bénéficieraient d'un abattement fiscal de 30 à 50% sur cette taxe.`,
      `CarbonTrack intègre un module de marché (Marketplace) permettant aux entreprises d'acheter et de vendre des crédits carbone certifiés. Les transactions sont enregistrées dans le registre national et reportées dans le bilan carbone de l'entreprise. La plateforme calcule automatiquement le coût de la compensation pour chaque tonne de CO2e résiduelle.`,
    ],
  },
]

async function main() {
  const client = await pool.connect()
  try {
    // Clear existing data
    await client.query('DELETE FROM rag_chunks')
    await client.query('DELETE FROM rag_documents')
    console.log('Cleared existing RAG data')

    let totalChunks = 0

    for (const doc of DOCUMENTS) {
      // Insert document
      const { rows: [document] } = await client.query(
        `INSERT INTO rag_documents (filename, methodology_code, title, total_pages, total_chunks)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [doc.filename, doc.methodology_code, doc.title, doc.chunks.length, doc.chunks.length]
      )

      const docId = document.id

      // Insert chunks
      for (let i = 0; i < doc.chunks.length; i++) {
        const content = doc.chunks[i]
        // Clean content for tsvector (remove special chars)
        await client.query(
          `INSERT INTO rag_chunks (document_id, chunk_index, content, search_vector, methodology_code)
           VALUES ($1, $2, $3, to_tsvector('english', $4), $5)`,
          [docId, i + 1, content, content, doc.methodology_code]
        )
      }

      console.log(`  OK ${doc.filename} (${doc.chunks.length} chunks)`)
      totalChunks += doc.chunks.length
    }

    console.log(`\nSeeded ${DOCUMENTS.length} documents, ${totalChunks} chunks total`)
  } finally {
    client.release()
    await pool.end()
  }
}

main().catch(err => { console.error(err); process.exit(1) })

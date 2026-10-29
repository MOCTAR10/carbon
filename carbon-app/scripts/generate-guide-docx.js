const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, AlignmentType, BorderStyle, ShadingType, VerticalAlign, PageBreak,
} = require('docx')
const fs = require('fs')

const G = '16a34a', GD = '166534', GL = 'dcfce7', GB = 'f0fdf4'
const GR = '6b7280', GRD = '1f2937', GRL = 'f3f4f6', W = 'ffffff'
const noBorder = { style: BorderStyle.NONE, size: 0 }
const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder }
const thinBorder = { style: BorderStyle.SINGLE, size: 1, color: 'e5e7eb' }
const thinBorders = { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder }

const h1 = (t) => new Paragraph({ spacing: { before: 100, after: 60 }, border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: G } }, children: [new TextRun({ text: t, bold: true, size: 36, color: GD, font: 'Calibri' })] })
const h2 = (t) => new Paragraph({ spacing: { before: 240, after: 80 }, border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: GL } }, children: [new TextRun({ text: t, bold: true, size: 26, color: GRD, font: 'Calibri' })] })
const h3 = (t) => new Paragraph({ spacing: { before: 180, after: 60 }, children: [new TextRun({ text: t, bold: true, size: 22, color: GD, font: 'Calibri' })] })
const p = (t, o = {}) => new Paragraph({ spacing: { before: 40, after: 60 }, alignment: o.center ? AlignmentType.CENTER : AlignmentType.LEFT, children: [new TextRun({ text: t, size: 19, color: o.color || '4b5563', font: 'Calibri', bold: !!o.bold, italics: !!o.italics })] })
const rp = (runs) => new Paragraph({ spacing: { before: 40, after: 60 }, children: runs.map(r => new TextRun({ size: 19, color: '4b5563', font: 'Calibri', ...r })) })
const bl = (t) => new Paragraph({ spacing: { before: 20, after: 20 }, bullet: { level: 0 }, children: [new TextRun({ text: t, size: 19, color: '4b5563', font: 'Calibri' })] })
const blB = (bold, t) => new Paragraph({ spacing: { before: 20, after: 20 }, bullet: { level: 0 }, children: [new TextRun({ text: bold + ' ', bold: true, size: 19, color: GD, font: 'Calibri' }), new TextRun({ text: t, size: 19, color: '4b5563', font: 'Calibri' })] })
const sp = (n = 100) => new Paragraph({ spacing: { before: n }, children: [] })
const pb = () => new Paragraph({ children: [new PageBreak()] })

function screenshot(caption) {
  return [sp(120), new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [new TableRow({ height: { value: 3200, rule: 'atLeast' }, children: [new TableCell({ verticalAlign: VerticalAlign.CENTER, borders: { top: { style: BorderStyle.DASHED, size: 2, color: '9ca3af' }, bottom: { style: BorderStyle.DASHED, size: 2, color: '9ca3af' }, left: { style: BorderStyle.DASHED, size: 2, color: '9ca3af' }, right: { style: BorderStyle.DASHED, size: 2, color: '9ca3af' } }, shading: { type: ShadingType.CLEAR, fill: GRL }, children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 300, after: 60 }, children: [new TextRun({ text: caption, size: 18, color: '9ca3af', italics: true, font: 'Calibri' })] }), new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 300 }, children: [new TextRun({ text: '(Inserer la capture d\'ecran ici)', size: 16, color: '9ca3af', font: 'Calibri' })] })] })] })] }), sp(80)]
}

function infoBox(title, text) {
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [new TableRow({ children: [new TableCell({ borders: { top: { style: BorderStyle.SINGLE, size: 1, color: GL }, bottom: { style: BorderStyle.SINGLE, size: 1, color: GL }, left: { style: BorderStyle.SINGLE, size: 6, color: G }, right: { style: BorderStyle.SINGLE, size: 1, color: GL } }, shading: { type: ShadingType.CLEAR, fill: GB }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: title, bold: true, size: 19, color: GD, font: 'Calibri' })] }), new Paragraph({ children: [new TextRun({ text, size: 18, color: '15803d', font: 'Calibri' })] })] })] })] })
}

function grid(items) {
  const rows = []
  for (let i = 0; i < items.length; i += 2) {
    const cells = [0, 1].map(j => {
      const it = items[i + j]
      if (!it) return new TableCell({ width: { size: 50, type: WidthType.PERCENTAGE }, borders: noBorders, children: [new Paragraph('')] })
      return new TableCell({ width: { size: 50, type: WidthType.PERCENTAGE }, borders: thinBorders, shading: { type: ShadingType.CLEAR, fill: GRL }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ spacing: { after: 30 }, children: [new TextRun({ text: it[0], bold: true, size: 19, color: GRD, font: 'Calibri' })] }), new Paragraph({ children: [new TextRun({ text: it[1], size: 17, color: GR, font: 'Calibri' })] })] })
    })
    rows.push(new TableRow({ children: cells }))
  }
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows })
}

function tbl(headers, data) {
  const hRow = new TableRow({ children: headers.map(h => new TableCell({ shading: { type: ShadingType.CLEAR, fill: G }, margins: { top: 40, bottom: 40, left: 80, right: 80 }, children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, size: 17, color: W, font: 'Calibri' })] })] })) })
  const dRows = data.map((row, ri) => new TableRow({ children: row.map(c => new TableCell({ shading: { type: ShadingType.CLEAR, fill: ri % 2 === 0 ? W : GRL }, margins: { top: 30, bottom: 30, left: 80, right: 80 }, children: [new Paragraph({ children: [new TextRun({ text: c, size: 17, color: GRD, font: 'Calibri' })] })] })) }))
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [hRow, ...dRows] })
}

function step(n, title, desc) {
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [new TableRow({ children: [new TableCell({ width: { size: 8, type: WidthType.PERCENTAGE }, verticalAlign: VerticalAlign.TOP, borders: noBorders, shading: { type: ShadingType.CLEAR, fill: GL }, children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 40, after: 40 }, children: [new TextRun({ text: String(n), bold: true, size: 22, color: GD, font: 'Calibri' })] })] }), new TableCell({ width: { size: 92, type: WidthType.PERCENTAGE }, borders: noBorders, margins: { left: 120 }, children: [new Paragraph({ spacing: { before: 20, after: 20 }, children: [new TextRun({ text: title, bold: true, size: 19, color: GRD, font: 'Calibri' })] }), new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: desc, size: 17, color: GR, font: 'Calibri' })] })] })] })] })
}

function sec(num, title) {
  return [new Paragraph({ spacing: { before: 80 }, children: [new TextRun({ text: `SECTION ${num}`, bold: true, size: 16, color: G, font: 'Calibri' })] }), h1(title)]
}

// ========== BUILD ==========
const c = [] // children

// --- TOC ---
c.push(...sec('', 'Table des Matieres'), sp())
;[['1','Vue d\'Ensemble de l\'Application'],['2','Inscription & Connexion'],['3','Abonnement & Paiement'],['4','Tableau de Bord'],['5','Gestion des Sites & Entites'],['6','Bilans Carbone — Creation & Gestion'],['7','Saisie des Donnees d\'Emission'],['8','Rapports & Graphiques Interactifs'],['9','Generation de Rapports PDF'],['10','Systeme de Certification'],['11','Documents & Pieces Justificatives'],['12','Navigation & Interface']].forEach(([n,t]) => c.push(rp([{ text: `${n}.  `, bold: true, color: G, size: 20 }, { text: t, size: 20, color: GRD }])))
c.push(sp(200), infoBox('A propos de ce document', 'Ce guide presente l\'ensemble des fonctionnalites de CarbonTrack, la plateforme de bilan carbone concue pour les entreprises au Gabon, en Afrique et dans le monde. Chaque section inclut un espace prevu pour inserer des captures d\'ecran.'))

// --- S1 ---
c.push(pb(), ...sec('1', 'Vue d\'Ensemble de l\'Application'))
c.push(rp([{ text: 'CarbonTrack', bold: true, size: 20, color: GD }, { text: ' est une plateforme SaaS qui permet aux entreprises de ', size: 20 }, { text: 'mesurer, analyser, certifier et rapporter', bold: true, size: 20 }, { text: ' leurs emissions de gaz a effet de serre, conformement aux normes internationales ISO 14064-1, ISO 14069 et GHG Protocol.', size: 20 }]))
c.push(h2('Architecture Fonctionnelle'), p('L\'application est organisee autour de 6 modules principaux :'))
c.push(grid([['Tableau de Bord','Vue globale des emissions, sites recents, bilans en cours.'],['Sites & Entites','Gestion des sites physiques : bureaux, usines, entrepots.'],['Bilans Carbone','Creation et saisie des bilans avec plus de 200 facteurs d\'emission.'],['Rapports & Graphiques','Visualisation interactive, 4 onglets, export PDF avec QR code.'],['Certification','Demande de certification officielle, suivi, assignation d\'expert.'],['Abonnement','Gestion de l\'abonnement, paiement Airtel Money et Visa.']]))
c.push(h2('Page d\'Accueil'), p('La page d\'accueil presente la plateforme aux visiteurs avec les principales fonctionnalites, la tarification et un appel a l\'action.'))
c.push(...screenshot('Capture d\'ecran : Page d\'accueil de CarbonTrack'))

// --- S2 ---
c.push(pb(), ...sec('2', 'Inscription & Connexion'))
c.push(h2('2.1 — Inscription'), p('L\'inscription permet a une nouvelle entreprise de creer son compte. Les informations demandees sont :'))
c.push(tbl(['Champ','Description','Obligatoire'],[['Nom de l\'entreprise','Raison sociale de la societe','Oui'],['RCCM','Registre du Commerce et du Credit Mobilier','Non'],['Secteur d\'activite','Industrie, services, energie, mines, etc.','Oui'],['Nom complet','Nom et prenom de l\'utilisateur','Oui'],['Email','Adresse email professionnelle','Oui'],['Telephone','Numero de telephone','Oui'],['Mot de passe','Minimum 6 caracteres, hache avec bcrypt','Oui']]))
c.push(...screenshot('Capture d\'ecran : Formulaire d\'inscription'))
c.push(h2('2.2 — Connexion'), p('La connexion se fait par email et mot de passe. L\'authentification utilise des tokens JWT stockes dans des cookies HTTP-Only securises.'))
c.push(grid([['Securite','Mots de passe haches avec bcrypt. Cookies HTTP-Only. Verification de propriete sur chaque requete.'],['Session','La session reste active tant que le cookie JWT est valide. Deconnexion possible a tout moment.']]))
c.push(...screenshot('Capture d\'ecran : Page de connexion'))

// --- S3 ---
c.push(pb(), ...sec('3', 'Abonnement & Paiement'))
c.push(p('Apres l\'inscription, l\'utilisateur doit souscrire a un abonnement pour acceder au tableau de bord et a toutes les fonctionnalites.'))
c.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [new TableRow({ children: [new TableCell({ shading: { type: ShadingType.CLEAR, fill: G }, margins: { top: 200, bottom: 200, left: 200, right: 200 }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Abonnement Entreprise', size: 18, color: GL, font: 'Calibri' })] }), new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 60 }, children: [new TextRun({ text: '2.500.000 FCFA / mois', bold: true, size: 40, color: W, font: 'Calibri' })] }), new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 40 }, children: [new TextRun({ text: 'sans engagement', size: 17, color: GL, font: 'Calibri' })] })] })] })] }))
c.push(h2('3.1 — Ce qui est inclus'))
c.push(bl('Nombre illimite de sites et de bilans carbone'), bl('Plus de 200 facteurs d\'emission valides (ADEME, DEFRA, GHG Protocol)'), bl('Rapports interactifs avec graphiques (4 onglets d\'analyse)'), bl('Export PDF professionnel avec QR code de verification'), bl('Systeme de certification par expert accredite'), bl('Upload de documents justificatifs'), bl('Saisie mensuelle et annuelle des emissions'), bl('Conformite ISO 14064-1, ISO 14069, GHG Protocol'))
c.push(h2('3.2 — Methodes de Paiement'))
c.push(grid([['Airtel Money','Paiement mobile instantane. Saisissez votre numero et confirmez. [Disponible]'],['Visa / Mastercard','Paiement par carte bancaire internationale. [Bientot disponible]']]))
c.push(...screenshot('Capture d\'ecran : Page d\'abonnement et formulaire de paiement'))

// --- S4 ---
c.push(pb(), ...sec('4', 'Tableau de Bord'))
c.push(p('Le tableau de bord est la page principale apres connexion. Il offre une vue synthetique de l\'activite carbone de l\'entreprise.'))
c.push(h2('4.1 — Indicateurs Principaux'), p('Quatre cartes de synthese sont affichees en haut du tableau de bord :'))
c.push(grid([['Total des Emissions','Somme de toutes les emissions, exprimee en kgCO2eq, tCO2eq ou ktCO2eq.'],['Nombre de Sites','Nombre total de sites physiques enregistres.'],['Bilans Actifs','Nombre total de bilans carbone en cours ou completes.'],['Derniere Mise a Jour','Date et heure de la derniere modification.']]))
c.push(...screenshot('Capture d\'ecran : Tableau de bord — Vue complete avec les 4 indicateurs'))
c.push(h2('4.2 — Sites Recents & Bilans Recents'))
c.push(blB('Sites recents :', 'Les derniers sites crees avec leur type et adresse.'))
c.push(blB('Bilans recents :', 'Les derniers bilans avec le nom, l\'annee, le site et les emissions totales.'))
c.push(...screenshot('Capture d\'ecran : Sections sites recents et bilans recents'))

// --- S5 ---
c.push(pb(), ...sec('5', 'Gestion des Sites & Entites'))
c.push(p('Cette section permet de gerer l\'ensemble des sites physiques de l\'entreprise. Chaque bilan est rattache a un site specifique.'))
c.push(h2('5.1 — Creation d\'un Site'))
c.push(tbl(['Champ','Description','Exemple'],[['Nom du site','Nom identifiant le site','Siege Social Libreville'],['Type de site','Categorie du site','Bureau, Usine, Entrepot, Magasin'],['Adresse','Localisation physique','Boulevard Triomphal, Libreville'],['Surface (m\u00B2)','Surface totale du site','2500 m\u00B2'],['Description','Notes complementaires','Siege administratif principal']]))
c.push(h2('5.2 — Types de Sites'))
c.push(grid([['Bureau','Locaux administratifs et espaces de travail'],['Usine','Sites de production et de fabrication'],['Entrepot','Zones de stockage et de logistique'],['Magasin / Point de vente','Espaces de commerce et de distribution']]))
c.push(...screenshot('Capture d\'ecran : Page Sites — Liste des sites + formulaire de creation'))

// --- S6 ---
c.push(pb(), ...sec('6', 'Bilans Carbone — Creation & Gestion'))
c.push(p('Les bilans carbone sont le coeur de l\'application. Chaque bilan represente l\'inventaire des emissions d\'un site pour une annee donnee.'))
c.push(h2('6.1 — Creation d\'un Bilan'))
c.push(step(1, 'Selectionner un site', 'Choisissez le site pour lequel vous souhaitez creer un bilan carbone.'))
c.push(step(2, 'Nommer le bilan', 'Donnez un nom descriptif (ex: "Bilan 2025 - Siege Libreville").'))
c.push(step(3, 'Choisir l\'annee de reference', 'Selectionnez l\'annee du bilan (2023, 2024, 2025, etc.).'))
c.push(...screenshot('Capture d\'ecran : Liste des bilans + formulaire de creation'))
c.push(h2('6.2 — Statuts d\'un Bilan'))
c.push(tbl(['Statut','Description','Couleur'],[['Brouillon','Bilan en cours de saisie, non finalise','Jaune'],['En cours de certification','Demande de certification soumise','Bleu'],['Certifie','Bilan valide par un expert accredite','Vert'],['Rejete','Certification refusee, corrections demandees','Rouge']]))

// --- S7 ---
c.push(pb(), ...sec('7', 'Saisie des Donnees d\'Emission'))
c.push(p('La page de saisie est l\'ecran principal de travail. Elle permet d\'ajouter, modifier et organiser toutes les lignes d\'emission d\'un bilan.'))
c.push(h2('7.1 — Interface de Saisie'), p('L\'interface est organisee en onglets par categorie d\'emission, avec un systeme de saisie mensuelle ou annuelle.'))
c.push(...screenshot('Capture d\'ecran : Page de saisie — Vue complete avec onglets et tableau'))
c.push(h2('7.2 — Categories d\'Emissions'), p('Les emissions sont organisees en 7 categories couvrant les 3 scopes du GHG Protocol :'))
c.push(tbl(['Categorie','Scope','Exemples de Facteurs'],[['Energie','Scope 1','Diesel, essence, GPL, bois, charbon, gaz naturel, fioul'],['Electricite & Reseaux','Scope 2','Electricite par pays, vapeur, gaz refrigerants'],['Intrants & Materiaux','Scope 3','Acier, aluminium, cuivre, plastiques, papier, verre, ciment'],['Fret','Scope 3','Fret routier, ferroviaire, maritime, aerien'],['Transport de Personnes','Scope 3','Voiture, bus, train, avion (court/moyen/long courrier)'],['Dechets','Scope 3','Decharge, incineration, recyclage, compostage, eaux usees'],['Immobilisations','Scope 3','Batiments, vehicules, equipements informatiques, mobilier']]))
c.push(sp(), infoBox('Plus de 200 facteurs d\'emission', 'Base de donnees validee : ADEME (France), DEFRA (UK), GHG Protocol (WRI/WBCSD), IEA. Chaque facteur inclut les composantes amont et combustion.'))

// --- S7 suite ---
c.push(pb(), ...sec('7 (suite)', 'Saisie des Donnees — Details'))
c.push(h2('7.3 — Processus de Saisie'))
c.push(step(1, 'Selectionner une categorie', 'Cliquez sur l\'onglet de la categorie souhaitee (Energie, Electricite, Intrants, Fret, Transport, Dechets, Immobilisations).'))
c.push(step(2, 'Choisir le facteur d\'emission', 'Utilisez la liste filtrable pour trouver le facteur d\'emission adapte.'))
c.push(step(3, 'Saisir la quantite', 'Entrez la quantite consommee avec l\'unite appropriee (kWh, litres, tonnes, km, etc.).'))
c.push(step(4, 'Saisie mensuelle ou annuelle', 'Saisissez les donnees mois par mois (Janvier a Decembre) ou en total annuel.'))
c.push(step(5, 'Calcul automatique', 'Les emissions en kgCO2eq sont calculees automatiquement : quantite x facteur d\'emission.'))
c.push(step(6, 'Sauvegarder', 'Cliquez sur "Sauvegarder" pour enregistrer. La synthese est mise a jour en temps reel.'))
c.push(...screenshot('Capture d\'ecran : Saisie mensuelle des donnees d\'emission'))
c.push(h2('7.4 — Synthese en Temps Reel'), p('Un panneau de synthese affichable affiche en permanence :'))
c.push(bl('Total des emissions du bilan (kgCO2eq)'), bl('Repartition par scope avec pourcentages et barres de couleur'), bl('Scope 1 (rouge), Scope 2 (orange), Scope 3 (bleu)'), bl('Nombre de postes d\'emission saisis'))
c.push(...screenshot('Capture d\'ecran : Panneau de synthese (Scope 1, 2, 3)'))

// --- S8 ---
c.push(pb(), ...sec('8', 'Rapports & Graphiques Interactifs'))
c.push(rp([{ text: 'Le module de rapports est l\'un des points forts de CarbonTrack. Il offre une visualisation riche a travers ', size: 20 }, { text: '4 onglets d\'analyse', bold: true, size: 20 }, { text: ' complementaires.', size: 20 }]))
c.push(h2('8.1 — Cartes de Synthese'), p('En haut de la page, 4 cartes affichent les emissions totales et par scope :'))
c.push(grid([['Total Emissions','Somme totale avec formatage intelligent (kg, t, kt).'],['Scope 1 — Direct','Combustion de carburants, fuites de gaz, vehicules propres.'],['Scope 2 — Energie','Achat d\'electricite, de vapeur ou de chaleur.'],['Scope 3 — Indirect','Achats, fret, transport, dechets, immobilisations.']]))
c.push(h2('8.2 — Onglet « Vue d\'Ensemble »'), p('Cet onglet propose plusieurs graphiques :'))
c.push(h3('Repartition par Scope (Donut Chart)'), p('Graphique en donut montrant la proportion de chaque scope avec legende detaillee, barres de progression et pourcentages.'))
c.push(...screenshot('Capture d\'ecran : Graphique donut — Repartition par Scope'))
c.push(h3('Emissions par Categorie (Bar Chart)'), p('Barres horizontales colorees montrant la contribution de chaque categorie au bilan total.'))
c.push(h3('Top Sources d\'Emissions'), p('Classement des 15 principales sources d\'emission avec code couleur par scope, quantite, unite et valeur en kgCO2eq.'))
c.push(...screenshot('Capture d\'ecran : Emissions par categorie + Top sources'))

// --- S8 suite ---
c.push(pb(), ...sec('8 (suite)', 'Rapports — Onglets Avances'))
c.push(h2('8.3 — Onglet « Suivi Mensuel »'), p('Ce module analyse l\'evolution des emissions mois par mois :'))
c.push(blB('Barres empilees :', 'Emissions mensuelles par scope (Scope 1 rouge, Scope 2 orange, Scope 3 bleu)'))
c.push(blB('Courbe cumulative :', 'Graphique en aire montrant l\'evolution cumulee sur l\'annee'))
c.push(blB('Tableau mensuel :', 'Detail chiffre mois par mois avec totaux par scope et pourcentages'))
c.push(...screenshot('Capture d\'ecran : Onglet Suivi Mensuel — Barres empilees + courbe cumulative'))
c.push(h2('8.4 — Onglet « GHG Protocol »'), p('Analyse detaillee selon les categories du GHG Protocol :'))
c.push(tbl(['Categorie GHG','Scope','Description'],[['1- Emissions directes','Scope 1','Combustion fixe et mobile, fuites de gaz'],['2- Electricite','Scope 2','Electricite, vapeur, chaleur achetee'],['3-1 Achats','Scope 3','Biens et services achetes'],['3-2 Immobilisations','Scope 3','Biens d\'equipement'],['3-3 Energie amont','Scope 3','Extraction et transport de combustibles'],['3-4 Fret amont','Scope 3','Transport de marchandises'],['3-5 Dechets','Scope 3','Traitement des dechets generes'],['3-6 Deplacements','Scope 3','Deplacements professionnels et domicile-travail']]))
c.push(h2('8.5 — Onglet « ISO 14064 / ISO 14069 »'), p('Classification des emissions selon les postes definis par les normes ISO :'))
c.push(bl('Tableau detaille par poste ISO avec scope, nombre de postes et part relative'), bl('Graphique en barres montrant la repartition par poste ISO'), bl('Conformite garantie avec les exigences normatives'))
c.push(...screenshot('Capture d\'ecran : Onglet GHG Protocol ou ISO 14064'))

// --- S9 ---
c.push(pb(), ...sec('9', 'Generation de Rapports PDF'))
c.push(p('CarbonTrack permet de generer des rapports PDF professionnels et complets, prets a etre presentes a des investisseurs, auditeurs ou partenaires.'))
c.push(h2('9.1 — Types de Rapports'))
c.push(grid([['Rapport Annuel Complet','Synthese annuelle avec toutes les donnees par categorie, scope, GHG Protocol et ISO. Ideal pour les audits.'],['Rapport Mensuel Detaille','Inclut en plus le suivi mensuel avec tableau mois par mois. Ideal pour le reporting interne.']]))
c.push(h2('9.2 — Contenu du Rapport PDF'))
c.push(step(1, 'Page de Couverture', 'Design professionnel avec degrade vert, logo CarbonTrack, badges ISO/GHG, QR code centre.'))
c.push(step(2, 'Synthese des Emissions', 'Cartes Scope 1/2/3, total des emissions, graphiques donut et barres, suivi mensuel.'))
c.push(step(3, 'Tableaux Detailles', 'Repartition par categorie, GHG Protocol, ISO 14064, top sources d\'emission.'))
c.push(step(4, 'Donnees Completes de Calcul', 'Chaque poste d\'emission : source, categorie, scope, quantite, unite, facteur, resultat.'))
c.push(step(5, 'Methodologie & References', 'Normes utilisees, sources des facteurs d\'emission.'))
c.push(...screenshot('Capture d\'ecran : Fenetre de telechargement PDF + apercu du rapport'))
c.push(h2('9.3 — QR Code de Verification'), p('Chaque rapport PDF contient un QR code unique qui redirige vers le rapport en ligne, permettant de verifier l\'authenticite du document.'))

// --- S10 ---
c.push(pb(), ...sec('10', 'Systeme de Certification'))
c.push(p('La certification garantit la credibilite et la fiabilite des bilans carbone aupres des auditeurs et des investisseurs.'))
c.push(h2('10.1 — Processus de Certification'))
c.push(step(1, 'Demande de Certification', 'Depuis la page du bilan, cliquez sur "Certifier ce bilan". Ajoutez un message optionnel. Statut : En attente'))
c.push(step(2, 'Assignation d\'un Expert', 'L\'equipe CarbonTrack assigne un expert accredite. Notification envoyee. Statut : Assigne'))
c.push(step(3, 'Audit & Inspection', 'L\'expert examine les donnees, demande des justificatifs si necessaire. Statut : En cours d\'examen'))
c.push(step(4, 'Decision Finale', 'L\'expert certifie le bilan ou le rejette avec motif. Statut : Certifie ou Rejete'))
c.push(h2('10.2 — Page des Certifications'), p('La page "Bilans Certifies" affiche l\'ensemble des demandes groupees par statut :'))
c.push(grid([['En attente','Demandes soumises, en attente d\'assignation d\'un expert.'],['Assignees / En cours','Un expert est assigne et examine les donnees du bilan.'],['Certifiees','Bilans certifies avec numero de certificat et date.'],['Rejetees','Bilans rejetes avec motif de rejet et recommandations.']]))
c.push(...screenshot('Capture d\'ecran : Page Bilans Certifies — Liste des demandes'))

// --- S11 ---
c.push(pb(), ...sec('11', 'Documents & Pieces Justificatives'))
c.push(p('CarbonTrack permet de joindre des pieces justificatives a chaque bilan pour faciliter l\'audit et la certification.'))
c.push(h2('11.1 — Types de Documents Acceptes'))
c.push(tbl(['Type','Exemples','Utilite'],[['Factures','Factures d\'electricite, de carburant, d\'achats','Justifier les quantites saisies'],['Releves','Releves de compteurs, bordereaux de livraison','Prouver les consommations reelles'],['Rapports','Rapports d\'audit externe, etudes d\'impact','Appuyer la certification'],['Contrats','Contrats fournisseurs, baux immobiliers','Documenter le perimetre du bilan']]))
c.push(h2('11.2 — Fonctionnalites'))
c.push(bl('Upload de fichiers directement depuis la page du bilan'), bl('Visualisation des documents dans le navigateur (PDF, images)'), bl('Telechargement individuel de chaque document'), bl('Suppression des documents obsoletes'), bl('Verification des droits d\'acces (seuls les utilisateurs de l\'entreprise ont acces)'))
c.push(...screenshot('Capture d\'ecran : Section Documents — Upload et liste des pieces jointes'))
c.push(sp(), infoBox('Protection des Donnees', 'Tous les documents sont stockes de maniere securisee. L\'acces est controle par verification du company_id sur chaque requete. Aucun utilisateur exterieur ne peut acceder aux documents d\'une autre entreprise.'))

// --- S12 ---
c.push(pb(), ...sec('12', 'Navigation & Interface'))
c.push(p('L\'interface de CarbonTrack est concue pour etre intuitive, rapide et agreable. Elle utilise un design moderne avec une barre laterale fixe et un contenu central.'))
c.push(h2('12.1 — Barre Laterale (Sidebar)'), p('Le menu de navigation principal est organise comme suit :'))
c.push(bl('Tableau de Bord — Vue globale des emissions'), bl('Sites & Entites — Gestion des sites physiques'), bl('Bilans Carbone — Creation et saisie des bilans'), bl('Rapports & Graphiques — Visualisation et export'), bl('Bilans Certifies — Demandes de certification'))
c.push(h2('12.2 — Design & Ergonomie'))
c.push(grid([['Charte Graphique','Palette de verts naturels coherente. Couleurs par scope : rouge (S1), orange (S2), bleu (S3).'],['Responsive','Interface adaptee aux ecrans de bureau, tablettes et mobiles. Sidebar repliable.'],['Performance','Chargement rapide grace a Next.js 14 avec rendu cote serveur et client.'],['Francais','Interface entierement en francais. Toutes les etiquettes et messages sont localises.']]))
c.push(...screenshot('Capture d\'ecran : Interface complete avec sidebar ouverte et contenu principal'))
c.push(h2('12.3 — Informations de l\'Utilisateur'), p('En bas de la sidebar, l\'utilisateur connecte voit son nom, son email, le nom de son entreprise et un bouton de deconnexion.'))

// --- CONTACT ---
c.push(pb(), ...sec('', 'Information & Support'))
c.push(sp(), infoBox('GreenLeaves — CarbonTrack', 'Plateforme de bilan carbone pour les entreprises au Gabon, en Afrique et dans le monde. Conforme ISO 14064-1, ISO 14069 et GHG Protocol.'))
c.push(sp(200), h3('Equipe de Direction'))
c.push(grid([['Sabine ANOTHO','sabine-anotho@greenleaves.ga | 077 52 37 17 / 065 46 16 25'],['Moctar SIDIBE','moctar-sidibe@greenleaves.ga | 077 72 44 99 / 062 95 13 17']]))
c.push(sp(400), p('\u00A9 2026 GreenLeaves / CarbonTrack — Tous droits reserves', { center: true, color: '9ca3af' }), p('Ce document est confidentiel et destine aux partenaires et clients de GreenLeaves.', { center: true, color: '9ca3af', italics: true }))

// ========== ASSEMBLE ==========
const doc = new Document({
  styles: { default: { document: { run: { font: 'Calibri', size: 19 } } }, paragraphStyles: [{ id: 'ListParagraph', name: 'List Paragraph', basedOn: 'Normal', next: 'Normal', run: { font: 'Calibri' } }] },
  numbering: { config: [{ reference: 'bullet-list', levels: [{ level: 0, format: 'bullet', text: '\u2022', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 360, hanging: 180 } } } }] }] },
  sections: [
    // Cover
    { properties: { page: { margin: { top: 720, bottom: 720, left: 720, right: 720 } } }, children: [
      sp(2400),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [new TextRun({ text: '\ud83c\udf3f', size: 72, font: 'Segoe UI Emoji' })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 }, children: [new TextRun({ text: 'CarbonTrack', bold: true, size: 64, color: GD, font: 'Calibri' })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [new TextRun({ text: 'GUIDE COMPLET DES FONCTIONNALITES', bold: true, size: 22, color: G, font: 'Calibri' })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 }, children: [new TextRun({ text: 'Presentation detaillee de toutes les fonctionnalites de la plateforme de bilan carbone', size: 22, color: GR, font: 'Calibri' })] }),
      sp(200),
      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'ISO 14064-1:2018  |  ISO 14069:2013  |  GHG Protocol', size: 18, color: G, font: 'Calibri' })] }),
      sp(1600),
      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'GreenLeaves  |  Version 1.0  |  Gabon, Afrique & Monde', size: 17, color: GR, font: 'Calibri' })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 60 }, children: [new TextRun({ text: 'Document confidentiel', size: 15, color: '9ca3af', italics: true, font: 'Calibri' })] }),
    ]},
    // Content
    { properties: { page: { margin: { top: 1200, bottom: 1000, left: 1200, right: 1200 } } }, children: c },
  ],
})

Packer.toBuffer(doc).then(buf => {
  const out = require('path').join(__dirname, '..', 'docs', 'CarbonTrack-Guide-Fonctionnalites.docx')
  fs.writeFileSync(out, buf)
  console.log('Word document generated:', out)
}).catch(err => { console.error('Error:', err) })

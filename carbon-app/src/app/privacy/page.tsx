import Link from 'next/link'
import { Leaf, ArrowLeft, Shield } from 'lucide-react'

export const metadata = {
  title: 'Politique de confidentialité — CarbonTrack',
  description: 'Politique de confidentialité complète conforme à la loi n°025/2023 du Gabon relative à la protection des données à caractère personnel et de la vie privée.',
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-lg font-bold text-gray-900 mb-3">{title}</h2>
      <div className="space-y-3 text-gray-700 leading-relaxed text-[15px]">{children}</div>
    </section>
  )
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-4">
      <h3 className="text-base font-semibold text-gray-900 mb-2">{title}</h3>
      <div className="space-y-3 text-gray-700 leading-relaxed text-[15px]">{children}</div>
    </div>
  )
}

function UL({ children }: { children: React.ReactNode }) {
  return <ul className="list-disc pl-6 space-y-2 marker:text-brand-500">{children}</ul>
}

function OL({ children }: { children: React.ReactNode }) {
  return <ol className="list-decimal pl-6 space-y-2 marker:text-brand-500">{children}</ol>
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-gray-700 hover:text-gray-900">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Retour à l&apos;accueil</span>
          </Link>
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
              <Leaf className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-gray-900">CarbonTrack</span>
          </Link>
        </div>
      </header>

      <article className="max-w-4xl mx-auto px-6 py-10">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-brand-100 rounded-2xl flex items-center justify-center">
            <Shield className="w-6 h-6 text-brand-700" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Politique de confidentialité</h1>
            <p className="text-sm text-gray-500 mt-1">
              Version 3.0 — Conforme à la loi n°025/2023 du 12 juillet 2023 (Gabon) relative à la protection des données à caractère personnel et de la vie privée
            </p>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
          <Section title="1. Préambule et objet">
            <p>
              La présente Politique de confidentialité (ci-après « Politique ») définit les règles applicables à la collecte, au traitement, à la transmission, au stockage, à l&apos;utilisation et à la protection des données à caractère personnel (ci-après « DCP ») mises en œuvre par la plateforme CarbonTrack, éditée par GreenLeaves SARL.
            </p>
            <p>
              Elle vise à garantir le respect des droits des personnes concernées et à assurer la conformité des traitements aux dispositions de la loi n°025/2023 du 12 juillet 2023, portant modification de la loi n°001/2011 du 25 septembre 2011, relative à la protection des données à caractère personnel et de la vie privée en République Gabonaise (ci-après « Loi APDPVP »).
            </p>
            <p>
              CarbonTrack applique les principes fondamentaux énoncés à l&apos;article 70 de la Loi APDPVP : licéité, loyauté, transparence, finalité déterminée, explicite et légitime, adéquation, pertinence et non-excès (minimisation), exactitude et mise à jour, limitation de la conservation, intégrité et confidentialité, ainsi que la responsabilisation (Accountability).
            </p>
          </Section>

          <Section title="2. Définitions">
            <UL>
              <li><strong>Données à caractère personnel (DCP)</strong> : toute information se rapportant à une personne physique identifiée ou identifiable (article 6 de la Loi APDPVP).</li>
              <li><strong>Traitement</strong> : toute opération ou ensemble d&apos;opérations portant sur des DCP, automatisées ou non (collecte, enregistrement, organisation, conservation, adaptation, modification, extraction, consultation, utilisation, communication, diffusion, effacement ou destruction).</li>
              <li><strong>Responsable du traitement</strong> : la personne physique ou morale qui détermine les finalités et les moyens du traitement (GreenLeaves SARL).</li>
              <li><strong>Sous-traitant</strong> : toute personne traitant des DCP pour le compte du responsable, sous sa direction.</li>
              <li><strong>Personne concernée</strong> : toute personne physique dont les DCP sont traitées.</li>
              <li><strong>Délégué à la Protection des Données (DPO)</strong> : la personne chargée d&apos;informer, conseiller, contrôler la conformité et d&apos;être le point de contact (articles 132-141 de la Loi APDPVP).</li>
              <li><strong>Violation de données à caractère personnel</strong> : toute violation de la sécurité entraînant la destruction, la perte, l&apos;altération, la divulgation non autorisée ou l&apos;accès non autorisé à des DCP.</li>
              <li><strong>Analyse d&apos;Impact relative à la Protection des Données (AIPD/DPIA)</strong> : étude visant à évaluer les risques et les mesures pour les atténuer (article 93 de la Loi APDPVP).</li>
            </UL>
          </Section>

          <Section title="3. Responsable du traitement et DPO">
            <p><strong>Responsable du traitement :</strong> GreenLeaves SARL, sise à Libreville, République Gabonaise.</p>
            <p><strong>Délégué à la Protection des Données :</strong></p>
            <UL>
              <li>Adresse électronique : <a href="mailto:dpo@carbontrack.greenleaves.ga" className="text-brand-600 underline font-semibold">dpo@carbontrack.greenleaves.ga</a></li>
              <li>Canal exclusif pour l&apos;exercice des droits et toute question relative à la présente Politique</li>
            </UL>
            <p>
              Conformément aux articles 132 à 141 de la Loi APDPVP, le DPO est indépendant, dispose des moyens nécessaires à l&apos;accomplissement de ses missions, bénéficie d&apos;un accès direct aux données et au plus haut niveau hiérarchique, et est soumis au secret professionnel.
            </p>
          </Section>

          <Section title="4. Champ d'application et exclusions">
            <p>
              La présente Politique couvre l&apos;ensemble des traitements de DCP mis en œuvre via CarbonTrack, qu&apos;ils soient automatisés ou non, au sein de fichiers structurés, dans les cas prévus à l&apos;article 4 de la Loi APDPVP.
            </p>
            <p>
              Sont exclus les traitements visés à l&apos;article 5 de la Loi APDPVP (traitements exclusivement personnels ou domestiques, sous réserve de non-communication systématique à des tiers ou de diffusion, ainsi que les copies temporaires techniques strictement nécessaires à la transmission ou à l&apos;accès à un réseau).
            </p>
          </Section>

          <Section title="5. Catégories de données collectées">
            <SubSection title="5.1. Données d'identification et d'authentification">
              <UL>
                <li>Nom, prénom</li>
                <li>Adresse électronique</li>
                <li>Numéro de téléphone</li>
                <li>Mot de passe stocké sous forme hachée et salée (bcrypt) — jamais en clair</li>
                <li>Rôle et habilitations</li>
              </UL>
            </SubSection>
            <SubSection title="5.2. Données relatives à l'entreprise">
              <UL>
                <li>Raison sociale</li>
                <li>Secteur d&apos;activité</li>
                <li>Adresse complète</li>
                <li>Sites d&apos;exploitation</li>
                <li>Logo (le cas échéant)</li>
              </UL>
            </SubSection>
            <SubSection title="5.3. Données métier — Bilans carbone">
              <UL>
                <li>Données d&apos;activité (consommations, intrants, déplacements, déchets, etc.)</li>
                <li>Pièces justificatives téléversées</li>
                <li>Informations relatives aux Scopes 1, 2 et 3</li>
                <li>Rapports générés et documents d&apos;audit</li>
                <li>Historique des interventions et statuts des dossiers</li>
              </UL>
            </SubSection>
            <SubSection title="5.4. Données techniques et de traçabilité">
              <UL>
                <li>Adresse IP</li>
                <li>Date et heure des connexions et actions critiques</li>
                <li>Type d&apos;appareil, système d&apos;exploitation et navigateur</li>
                <li>Identifiants de session</li>
                <li>Logs d&apos;accès aux données sensibles (restreints)</li>
              </UL>
            </SubSection>
            <p>
              <strong>Principe de minimisation (article 70 de la Loi APDPVP)</strong> : seules les DCP strictement nécessaires à la réalisation des finalités sont collectées. Aucune donnée sensible au sens de l&apos;article 75 de la Loi APDPVP n&apos;est collectée intentionnellement.
            </p>
          </Section>

          <Section title="6. Finalités du traitement">
            <OL>
              <li><strong>Gestion des comptes et des accès</strong> : authentification, autorisation, gestion des rôles, sécurisation des accès.</li>
              <li><strong>Élaboration et suivi des bilans carbone</strong> : saisie, calcul, consolidation, traçabilité, conformément aux référentiels applicables (GHG Protocol, ISO 14064-1, ISO 14069).</li>
              <li><strong>Validation, vérification et expertise (VVB)</strong> : affectation, instruction, validation technique, traçabilité des avis et décisions.</li>
              <li><strong>Gestion documentaire</strong> : conservation à valeur probatoire des pièces justificatives et rapports.</li>
              <li><strong>Gestion administrative, comptable et fiscale</strong> : respect des obligations légales en vigueur.</li>
              <li><strong>Sécurisation et traçabilité</strong> : détection d&apos;intrusions, prévention des fraudes, investigation en cas d&apos;incident.</li>
              <li><strong>Communication fonctionnelle</strong> : notifications relatives à l&apos;activité du compte ou à l&apos;avancement des dossiers.</li>
            </OL>
          </Section>

          <Section title="7. Bases légales du traitement">
            <p>Chaque traitement repose sur l&apos;une des bases légales prévues aux articles 71 à 73 de la Loi APDPVP :</p>
            <UL>
              <li><strong>Exécution d&apos;un contrat</strong> : pour les traitements nécessaires à l&apos;exécution des CGU et à la fourniture des services.</li>
              <li><strong>Consentement</strong> : lorsque requis, libre, spécifique, éclairé, explicite, univoque et révocable à tout moment. La preuve du consentement est conservée par CarbonTrack.</li>
              <li><strong>Obligation légale</strong> : pour satisfaire à des obligations comptables, fiscales ou réglementaires.</li>
              <li><strong>Intérêt légitime</strong> : pour assurer la sécurité, la traçabilité et le bon fonctionnement de la Plateforme, sous réserve qu&apos;il ne prévale pas sur les droits et libertés fondamentaux de la personne concernée.</li>
            </UL>
          </Section>

          <Section title="8. Destinataires des données">
            <p>Les DCP ne sont accessibles qu&apos;aux destinataires strictement habilités, dans la limite de leur besoin d&apos;en connaître :</p>
            <UL>
              <li><strong>Équipe habilitée de GreenLeaves SARL</strong> : uniquement sur base du principe du moindre privilège et à des fins justifiées.</li>
              <li><strong>Experts et auditeurs VVB</strong> : affectés à un dossier, liés par une obligation de confidentialité.</li>
              <li><strong>Sous-traitants techniques</strong> : hébergement, sauvegarde, messagerie, liés par un contrat de sous-traitance conforme à la Loi APDPVP.</li>
              <li><strong>Autorités compétentes</strong> : sur réquisition légale dûment motivée, conformément à la loi.</li>
            </UL>
            <p><strong>Aucune vente, location, échange ou cession à des fins commerciales ou publicitaires des DCP.</strong></p>
          </Section>

          <Section title="9. Transferts de données hors du Gabon">
            <p>
              À ce jour, aucun transfert systématique de DCP vers un pays tiers n&apos;est opéré. Si un tel transfert devait intervenir à l&apos;avenir, CarbonTrack s&apos;engagerait à n&apos;y procéder qu&apos;après avoir vérifié le niveau de protection adéquat du pays destinataire et mis en place les garanties appropriées prévues par le Chapitre V de la Loi APDPVP (notamment clauses contractuelles appropriées), et à en informer le DPO et, le cas échéant, l&apos;Autorité compétente.
            </p>
          </Section>

          <Section title="10. Durée de conservation">
            <p>Les DCP sont conservées pendant une durée n&apos;excédant pas celle nécessaire aux finalités pour lesquelles elles sont traitées (article 70 de la Loi APDPVP). Les durées ci-après sont appliquées :</p>
            <UL>
              <li><strong>Données de compte</strong> : durée de vie du compte + 3 ans après la dernière activité ou après désactivation.</li>
              <li><strong>Bilans carbone, certificats et rapports</strong> : 5 à 10 ans, selon les exigences contractuelles, comptables ou de traçabilité applicables.</li>
              <li><strong>Pièces justificatives d&apos;audit</strong> : durée liée au dossier + 5 ans minimum, sous réserve d&apos;obligations plus longues.</li>
              <li><strong>Données de facturation</strong> : 10 ans, conformément aux obligations comptables.</li>
              <li><strong>Logs techniques à des fins de sécurité</strong> : 12 à 24 mois maximum, puis anonymisés ou supprimés de manière sécurisée.</li>
              <li><strong>Preuve de consentement</strong> : durée nécessaire pour démontrer le respect de l&apos;obligation, sans excéder les durées ci-dessus.</li>
            </UL>
            <p>
              À l&apos;expiration de ces durées, les DCP font l&apos;objet d&apos;une suppression définitive ou d&apos;une anonymisation irréversible, conformément à l&apos;article 76 de la Loi APDPVP.
            </p>
          </Section>

          <Section title="11. Sécurité des données">
            <p>
              CarbonTrack met en œuvre des mesures techniques et organisationnelles appropriées au risque, proportionnées à la nature des DCP traitées, afin d&apos;assurer leur confidentialité, leur intégrité, leur disponibilité et leur résilience, conformément aux articles 70, 91, 142-147, 195-199 de la Loi APDPVP.
            </p>
            <SubSection title="11.1. Mesures techniques">
              <UL>
                <li>Chiffrement en transit : TLS 1.3 sur l&apos;ensemble des communications</li>
                <li>Chiffrement des mots de passe : hashage salé via bcrypt</li>
                <li>Contrôle d&apos;accès strict : gestion des rôles (RBAC) et principe du moindre privilège</li>
                <li>Journalisation : traçabilité des connexions et actions critiques, avec accès restreint</li>
                <li>Séparation des environnements : développement, pré-production, production</li>
                <li>Protection des uploads : restriction des types/extensions, isolation des répertoires</li>
                <li>Sauvegardes chiffrées et testées régulièrement</li>
                <li>Externalisation sécurisée des secrets (variables d&apos;environnement non versionnées)</li>
                <li>Durcissement des configurations</li>
              </UL>
            </SubSection>
            <SubSection title="11.2. Mesures organisationnelles">
              <UL>
                <li>Minimisation systématique des accès et des collectes</li>
                <li>Habilitation formelle et révocable</li>
                <li>Sensibilisation aux bonnes pratiques de protection des DCP</li>
                <li>Registre des Activités de Traitement (RAT) tenu à jour</li>
                <li>Procédure formelle de gestion des violations de DCP</li>
                <li>Clauses contractuelles renforcées avec les sous-traitants</li>
                <li>Respect des principes Privacy by Design et Privacy by Default</li>
              </UL>
            </SubSection>
          </Section>

          <Section title="12. Droits des personnes concernées">
            <p>
              Conformément aux articles 3, 43, 50-55, 60-69, 91-99 de la Loi APDPVP, toute personne concernée dispose des droits ci-après :
            </p>
            <SubSection title="12.1. Détails des droits">
              <UL>
                <li><strong>Droit d&apos;accès (article 43)</strong> : obtenir la confirmation de l&apos;existence d&apos;un traitement, ses finalités, catégories de données, destinataires, durée de conservation, droits, origine le cas échéant, et copie des données.</li>
                <li><strong>Droit de rectification (articles 50-52)</strong> : faire rectifier, compléter ou mettre à jour des DCP inexactes ou incomplètes.</li>
                <li><strong>Droit à l&apos;effacement (« droit à l&apos;oubli ») (articles 53-54)</strong> : obtenir l&apos;effacement dans les cas prévus (retrait consentement, traitement illicite, données inutiles/obsolètes, obligation légale, etc.), sous réserve des obligations de conservation légitimes.</li>
                <li><strong>Droit à la limitation du traitement (article 55)</strong> : demander la suspension temporaire de l&apos;utilisation lorsque contestation d&apos;exactitude, traitement illicite, nécessité pour réclamation, opposition en attente de vérification.</li>
                <li><strong>Droit d&apos;opposition (articles 60-65)</strong> : s&apos;opposer, pour des motifs légitimes, à un traitement fondé sur l&apos;intérêt légitime ou l&apos;intérêt public. Pour les traitements à des fins de prospection, l&apos;opposition peut s&apos;exercer sans motif.</li>
                <li><strong>Droit à la portabilité des données</strong> : recevoir ses DCP dans un format structuré, couramment utilisé et lisible par machine, et les transmettre à un autre responsable lorsque techniquement possible.</li>
                <li><strong>Droit de retirer son consentement (article 73)</strong> : à tout moment, sans affecter la licéité des traitements antérieurs.</li>
                <li><strong>Droit de ne pas faire l&apos;objet d&apos;une décision automatisée (articles 66-69)</strong> : ne pas faire l&apos;objet d&apos;une décision prise exclusivement sur un traitement automatisé produisant des effets juridiques significatifs. CarbonTrack n&apos;opère pas de telles décisions à ce jour.</li>
                <li><strong>Droit d&apos;introduire une réclamation auprès de l&apos;APDPVP</strong> : en cas de violation présumée de ses droits.</li>
              </UL>
            </SubSection>
            <SubSection title="12.2. Modalités d'exercice">
              <p>
                Pour exercer tout droit ci-dessus, la personne concernée adresse sa demande, en précisant clairement son identité et le droit exercé, à l&apos;adresse suivante :
              </p>
              <p className="font-semibold">
                <a href="mailto:dpo@carbontrack.greenleaves.ga" className="text-brand-600 underline">dpo@carbontrack.greenleaves.ga</a>
              </p>
              <UL>
                <li><strong>Vérification d&apos;identité</strong> : afin de prévenir toute divulgation non autorisée, des éléments justificatifs pourront être demandés.</li>
                <li><strong>Délai de réponse</strong> : dans un délai raisonnable et, au plus tard, dans les délais prévus par la Loi APDPVP. CarbonTrack s&apos;efforce de répondre dans les meilleurs délais, généralement sous 30 jours.</li>
                <li><strong>Gratuité</strong> : l&apos;exercice des droits est gratuit. Des frais raisonnables et proportionnés pourront toutefois être demandés en cas de demandes manifestement infondées, excessives ou répétitives (article 95 de la Loi APDPVP).</li>
                <li><strong>Réponse motivée</strong> : en cas de refus total ou partiel, la réponse indiquera les motifs et les voies de recours possibles.</li>
                <li><strong>Format</strong> : la réponse est adressée par voie électronique, sauf demande contraire justifiée.</li>
              </UL>
            </SubSection>
          </Section>

          <Section title="13. Cookies et technologies de suivi">
            <p>
              Conformément à l&apos;article 183 de la Loi APDPVP, CarbonTrack limite strictement l&apos;usage des traceurs. Seuls les <strong>cookies strictement nécessaires</strong> au fonctionnement de la Plateforme sont utilisés (authentification, maintien de session, sécurité).
            </p>
            <UL>
              <li><strong>Cookies nécessaires</strong> : indispensables au fonctionnement. Leur désactivation empêcherait l&apos;accès aux fonctionnalités essentielles.</li>
              <li><strong>Aucun cookie publicitaire</strong> : aucun cookie à des fins de publicité ciblée ou de profilage commercial n&apos;est déployé.</li>
              <li><strong>Aucun cookie de suivi tiers</strong> non justifié : aucun traceur tiers à des fins non nécessaires n&apos;est utilisé.</li>
              <li><strong>Consentement explicite</strong> : pour tout traceur non strictement nécessaire, un consentement libre, spécifique, éclairé et révocable sera recueilli, granulaire par finalité, avec possibilité de retrait à tout moment.</li>
            </UL>
          </Section>

          <Section title="14. Violations de données à caractère personnel">
            <p>
              Conformément aux articles 142 à 147 de la Loi APDPVP, CarbonTrack met en œuvre une procédure formelle de gestion des violations de DCP.
            </p>
            <SubSection title="14.1. Notification à l'Autorité">
              <p>
                Dès que CarbonTrack prend connaissance d&apos;une violation de DCP susceptible d&apos;engendrer un risque pour les droits et libertés des personnes concernées, elle notifie cette violation à l&apos;Autorité compétente <strong>sans délai excessif et, dans tous les cas, dans un délai maximum de 72 heures</strong> après en avoir pris connaissance, sauf si la violation ne présente pas un tel risque.
              </p>
              <p>
                La notification contient au minimum les éléments requis par l&apos;article 143 de la Loi APDPVP : nature de la violation, catégories de DCP concernées, nombre approximatif de personnes concernées et d&apos;enregistrements, conséquences probables, mesures prises ou proposées pour remédier à la violation et en atténuer les effets.
              </p>
            </SubSection>
            <SubSection title="14.2. Notification aux personnes concernées">
              <p>
                Lorsque la violation est susceptible d&apos;engendrer un <strong>risque élevé</strong> pour les droits et libertés, CarbonTrack informe les personnes concernées <strong>sans délai inutile</strong>, de manière claire, précise et compréhensible.
              </p>
              <p>
                Cette information précise la nature de la violation, les catégories de données concernées, les conséquences probables, les mesures prises et les recommandations pratiques pour atténuer les effets négatifs.
              </p>
              <p>
                Des exceptions à cette obligation de notification aux personnes concernées peuvent s&apos;appliquer, strictement dans les cas prévus à l&apos;article 147 de la Loi APDPVP (mesures rendant les données incompréhensibles, disproportion manifeste, ou information déjà réalisée).
              </p>
            </SubSection>
          </Section>

          <Section title="15. Analyse d'Impact (AIPD/DPIA), Registre des traitements et Privacy by Design">
            <SubSection title="15.1. Registre des Activités de Traitement (RAT)">
              <p>
                Conformément au principe d&apos;Accountability (article 6 de la Loi APDPVP), CarbonTrack tient à jour un Registre des Activités de Traitement décrivant, pour chaque traitement : finalités, catégories de personnes concernées et de DCP, destinataires, durées de conservation, mesures de sécurité, transferts éventuels, base légale et, le cas échéant, liens vers les AIPD réalisées. Ce registre est mis à disposition de l&apos;Autorité sur demande.
              </p>
            </SubSection>
            <SubSection title="15.2. Analyse d'Impact">
              <p>
                Lorsque l&apos;un des traitements est susceptible d&apos;engendrer un <strong>risque élevé</strong> pour les droits et libertés des personnes concernées, une Analyse d&apos;Impact relative à la Protection des Données est réalisée, conformément à l&apos;article 93 de la Loi APDPVP. Cette analyse identifie les risques, évalue leur probabilité et gravité, et définit des mesures d&apos;atténuation appropriées.
              </p>
            </SubSection>
            <SubSection title="15.3. Privacy by Design et Privacy by Default">
              <p>
                Conformément à l&apos;article 198 de la Loi APDPVP, CarbonTrack intègre la protection des DCP dès la conception (« Privacy by Design ») et par défaut (« Privacy by Default »). Cela se traduit notamment par : la minimisation des données, le principe du moindre privilège, l&apos;anonymisation ou la pseudonymisation lorsque pertinent, l&apos;accès restreint par défaut, et l&apos;adoption de mesures de sécurité dès les premières phases de développement.
              </p>
            </SubSection>
          </Section>

          <Section title="16. Protection des mineurs">
            <p>
              Conformément aux articles 189 à 194 de la Loi APDPVP, CarbonTrack est destinée à un usage professionnel (entreprises, experts, organismes). Aucune collecte intentionnelle de DCP relatives à des mineurs n&apos;est effectuée.
            </p>
            <p>
              Le profilage des enfants est strictement interdit. Si, malgré les précautions prises, des DCP d&apos;un mineur étaient collectées de manière fortuite, elles seront supprimées sans délai, en privilégiant systématiquement l&apos;intérêt supérieur de l&apos;enfant.
            </p>
          </Section>

          <Section title="17. Modification de la présente Politique de confidentialité">
            <p>
              CarbonTrack se réserve le droit de modifier la présente Politique de confidentialité à tout moment pour tenir compte des évolutions légales, réglementaires, techniques ou organisationnelles.
            </p>
            <UL>
              <li><strong>Notification</strong> : toute modification substantielle à la présente Politique de confidentialité sera notifiée à l'Utilisateur par courrier électronique et/ou par un avis visible sur la Plateforme, au moins trente (30) jours avant son entrée en vigueur.</li>
              <li><strong>Version en vigueur</strong> : la version en vigueur est accessible en permanence à l'adresse <Link href="/privacy" className="text-brand-600 underline">/privacy</Link>.</li>
              <li><strong>Acceptation</strong> : la poursuite de l'utilisation de la Plateforme après l'entrée en vigueur des modifications vaut acceptation sans réserve de celles-ci.</li>
            </UL>
          </Section>

          <Section title="18. Contact et recours">
            <p>
              Pour toute question relative à la présente Politique ou à la protection des DCP, vous pouvez contacter le DPO à l&apos;adresse ci-dessous :
            </p>
            <UL>
              <li><strong>CEO et Responsable Conformité (APDPVP)</strong> : Sabine Anotho — <a href="mailto:sabine-anotho@greenleaves.ga" className="text-brand-600 underline">sabine-anotho@greenleaves.ga</a> — Tél. : 077523717</li>
              <li><strong>Responsable Projet</strong> : Moctar Sidibé — <a href="mailto:moctar-sidibe@greenleaves.ga" className="text-brand-600 underline">moctar-sidibe@greenleaves.ga</a> — Tél. : 077724499</li>
            </UL>
            <p>
              Toute personne concernée dispose également du droit d&apos;introduire une réclamation auprès de l&apos;Autorité pour la Protection des Données à Caractère Personnel et de la Vie Privée (APDPVP) du Gabon, conformément à l&apos;article 200 de la Loi APDPVP.
            </p>
          </Section>
        </div>

        <p className="text-center text-xs text-gray-400 mt-8">
          CarbonTrack © GreenLeaves SARL — Politique de confidentialité conforme à la loi n°025/2023 (Gabon)
        </p>
      </article>
    </div>
  )
}

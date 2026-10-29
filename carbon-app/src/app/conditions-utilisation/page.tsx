import Link from 'next/link'
import { Leaf, ArrowLeft, FileText } from 'lucide-react'

export const metadata = {
  title: 'Conditions Générales d\'Utilisation — CarbonTrack',
  description: 'CGU complètes de CarbonTrack, conformes à la loi n°025/2023 du Gabon relative à la protection des données à caractère personnel.',
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

export default function ConditionsPage() {
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
            <FileText className="w-6 h-6 text-brand-700" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Conditions Générales d&apos;Utilisation</h1>
            <p className="text-sm text-gray-500 mt-1">
              Version 3.0 — Conforme à la loi n°025/2023 du 12 juillet 2023 (Gabon)
            </p>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
          <Section title="Article 1 — Définitions">
            <UL>
              <li><strong>Plateforme</strong> : l&apos;application web CarbonTrack accessible à l&apos;adresse définie par GreenLeaves SARL.</li>
              <li><strong>Éditeur</strong> : GreenLeaves SARL, société responsable de l&apos;édition et de l&apos;exploitation de la Plateforme.</li>
              <li><strong>Utilisateur</strong> : toute personne morale, représentée par une personne physique dûment habilitée, qui crée un compte et utilise la Plateforme.</li>
              <li><strong>Services</strong> : ensemble des fonctionnalités proposées (gestion de bilans carbone, suivi de dossiers, interface Expert/VVB, etc.).</li>
              <li><strong>DCP</strong> : données à caractère personnel telles que définies par la loi n°025/2023.</li>
              <li><strong>CGU</strong> : présentes Conditions Générales d&apos;Utilisation.</li>
              <li><strong>Politique de confidentialité</strong> : document décrivant le traitement des DCP.</li>
            </UL>
          </Section>

          <Section title="Article 2 — Objet">
            <p>
              Les présentes CGU ont pour objet de définir les conditions d&apos;accès, d&apos;inscription, d&apos;utilisation et de résiliation des Services proposés par CarbonTrack. Elles régissent les relations contractuelles entre l&apos;Éditeur et l&apos;Utilisateur.
            </p>
            <p>
              Les Services visent à faciliter la mesure, la déclaration, le suivi, la validation et la vérification des bilans carbone, conformément aux référentiels GHG Protocol, ISO 14064-1 et ISO 14069.
            </p>
          </Section>

          <Section title="Article 3 — Champ d'application">
            <p>
              Les présentes CGU s&apos;appliquent à toute utilisation de la Plateforme, y compris l&apos;accès libre aux pages d&apos;information, la création de compte, et l&apos;utilisation des fonctionnalités réservées.
            </p>
          </Section>

          <Section title="Article 4 — Acceptation des CGU">
            <OL>
              <li>L&apos;accès et l&apos;utilisation de la Plateforme impliquent l&apos;acceptation pleine, entière et sans réserve des présentes CGU.</li>
              <li>L&apos;Utilisateur atteste avoir pris connaissance de la <Link href="/privacy" className="text-brand-600 underline font-semibold">Politique de confidentialité</Link>, qui fait partie intégrante des présentes CGU.</li>
              <li>En cochant la case d&apos;acceptation lors de l&apos;inscription, l&apos;Utilisateur marque son consentement explicite à ces documents.</li>
            </OL>
          </Section>

          <Section title="Article 5 — Inscription et création de compte">
            <SubSection title="5.1. Conditions d'inscription">
              <UL>
                <li>L&apos;inscription est réservée aux personnes morales représentées par une personne physique majeure, dûment habilitée à engager la structure.</li>
                <li>Toutes les informations demandées lors de l&apos;inscription doivent être exactes, complètes, sincères et à jour.</li>
                <li>L&apos;Éditeur se réserve le droit de refuser une demande d&apos;inscription pour un motif légitime.</li>
              </UL>
            </SubSection>
            <SubSection title="5.2. Sécurisation du compte">
              <UL>
                <li>L&apos;identifiant et le mot de passe sont strictement personnels. L&apos;Utilisateur en assure la confidentialité.</li>
                <li>Tout usage du compte est réputé effectué par son titulaire.</li>
                <li>Tout accès non autorisé, suspicion d&apos;usurpation ou incident de sécurité doit être signalé sans délai à <a href="mailto:support@greenleaves.ga" className="text-brand-600 underline">support@greenleaves.ga</a>.</li>
                <li>L&apos;Éditeur ne saurait être tenu responsable des conséquences résultant d&apos;une négligence dans la protection des identifiants.</li>
              </UL>
            </SubSection>
          </Section>

          <Section title="Article 6 — Description des Services">
            <UL>
              <li><strong>Gestion des sites et structures</strong> : création, paramétrage et suivi des sites d&apos;exploitation.</li>
              <li><strong>Bilans carbone</strong> : saisie de données d&apos;activité, calcul des émissions, génération de rapports conformes aux référentiels.</li>
              <li><strong>Suivi des dossiers</strong> : traçabilité des étapes, statuts, validations.</li>
              <li><strong>Espace Expert/VVB</strong> : interface dédiée aux auditeurs pour l&apos;instruction des dossiers.</li>
              <li><strong>Gestion documentaire</strong> : téléversement, classement et consultation des pièces justificatives.</li>
              <li><strong>Notifications</strong> : informations fonctionnelles relatives à l&apos;avancement des dossiers.</li>
            </UL>
          </Section>

          <Section title="Article 7 — Obligations de l'Utilisateur">
            <OL>
              <li><strong>Respect de la législation</strong> : l&apos;Utilisateur s&apos;engage à utiliser la Plateforme conformément à la loi gabonaise, aux présentes CGU et à la Politique de confidentialité.</li>
              <li><strong>Exactitude des données</strong> : l&apos;Utilisateur garantit l&apos;exactitude, l&apos;exhaustivité et la légitimité des informations fournies.</li>
              <li><strong>Bon usage</strong> : l&apos;Utilisateur s&apos;engage à ne pas détourner les Services à des fins illicites, frauduleuses ou portant atteinte aux droits de tiers.</li>
              <li><strong>Sécurité</strong> : l&apos;Utilisateur s&apos;engage à ne pas tenter d&apos;obtenir un accès non autorisé, à perturber le fonctionnement ou à compromettre la sécurité de la Plateforme.</li>
              <li><strong>Confidentialité</strong> : l&apos;Utilisateur respecte le caractère confidentiel des éléments accessibles dans le cadre strict de l&apos;exécution des Services.</li>
              <li><strong>Propriété intellectuelle</strong> : l&apos;Utilisateur s&apos;engage à ne pas reproduire, extraire, diffuser ou exploiter le contenu de la Plateforme en violation des droits de l&apos;Éditeur.</li>
            </OL>
          </Section>

          <Section title="Article 8 — Obligations de l'Éditeur">
            <OL>
              <li><strong>Fourniture des Services</strong> : l&apos;Éditeur s&apos;efforce de mettre à disposition les Services de manière continue, dans les limites techniques raisonnables.</li>
              <li><strong>Sécurité</strong> : l&apos;Éditeur met en œuvre les mesures techniques et organisationnelles appropriées pour assurer la sécurité des traitements, conformément à la loi n°025/2023.</li>
              <li><strong>Protection des DCP</strong> : l&apos;Éditeur traite les DCP conformément à la Politique de confidentialité et aux principes de la loi n°025/2023.</li>
              <li><strong>Disponibilité</strong> : l&apos;Éditeur ne garantit pas une disponibilité ininterrompue. Des interruptions peuvent survenir pour maintenance, mises à jour ou cas de force majeure.</li>
              <li><strong>Assistance</strong> : l&apos;Éditeur met à disposition un canal de support à l&apos;adresse <a href="mailto:support@greenleaves.ga" className="text-brand-600 underline">support@greenleaves.ga</a>.</li>
            </OL>
          </Section>

          <Section title="Article 9 — Protection des données à caractère personnel">
            <p>
              Le traitement des DCP est régi par la <Link href="/privacy" className="text-brand-600 underline font-semibold">Politique de confidentialité</Link>. Celle-ci précise notamment :
            </p>
            <UL>
              <li>Les finalités et bases légales du traitement</li>
              <li>Les catégories de données collectées</li>
              <li>Les destinataires et durées de conservation</li>
              <li>Les mesures de sécurité mises en œuvre</li>
              <li>Les droits des personnes concernées et leurs modalités d&apos;exercice</li>
              <li>La procédure de gestion des violations de DCP</li>
            </UL>
            <p>
              Pour toute question relative aux DCP, l&apos;Utilisateur ou la personne concernée peut contacter le DPO à : <a href="mailto:dpo@carbontrack.greenleaves.ga" className="text-brand-600 underline font-semibold">dpo@carbontrack.greenleaves.ga</a>.
            </p>
          </Section>

          <Section title="Article 10 — Propriété intellectuelle">
            <OL>
              <li><strong>Droits de l'Éditeur</strong> : tous les éléments de la Plateforme (structure, textes, graphiques, logos, codes, bases de données, interfaces) sont protégés par le droit de la propriété intellectuelle et appartiennent à l&apos;Éditeur ou à ses ayants droit.</li>
              <li><strong>Licence d'usage</strong> : l&apos;Éditeur concède à l&apos;Utilisateur un droit d&apos;accès et d&apos;utilisation non exclusif, non transférable et révocable, strictement pour les besoins liés à l&apos;exécution des Services.</li>
              <li><strong>Restrictions</strong> : l&apos;Utilisateur s&apos;interdit de copier, modifier, adapter, traduire, sous-licencier, vendre, reproduire, diffuser ou exploiter commercialement tout élément de la Plateforme sans autorisation écrite préalable.</li>
              <li><strong>Données de l'Utilisateur</strong> : l&apos;Utilisateur conserve la propriété de ses données. L&apos;Éditeur traite ces données uniquement dans le cadre des Services et conformément à la Politique de confidentialité.</li>
            </OL>
          </Section>

          <Section title="Article 11 — Responsabilité">
            <SubSection title="11.1. Responsabilité de l'Utilisateur">
              <p>
                L&apos;Utilisateur est seul responsable de l&apos;usage qu&apos;il fait de la Plateforme, de la légitimité des données qu&apos;il saisit, et du respect de ses propres obligations légales, réglementaires ou contractuelles.
              </p>
            </SubSection>
            <SubSection title="11.2. Responsabilité de l'Éditeur">
              <p>
                L&apos;Éditeur met en œuvre tous les moyens raisonnables pour assurer le bon fonctionnement de la Plateforme. Toutefois, sa responsabilité ne saurait être engagée en cas de :
              </p>
              <UL>
                <li>force majeure ou cas fortuit</li>
                <li>défaillance ou indisponibilité liée à des tiers (hébergeur, réseau)</li>
                <li>utilisation non conforme aux CGU par l&apos;Utilisateur</li>
                <li>erreur ou omission imputable à l&apos;Utilisateur</li>
                <li>virus, piratage ou attaque informatique malgré les mesures de sécurité mises en œuvre</li>
                <li>dommages indirects, pertes de données, manque à gagner ou perte d&apos;opportunité</li>
              </UL>
            </SubSection>
            <SubSection title="11.3. Limitation de responsabilité">
              <p>
                Dans toute la mesure permise par la loi applicable, la responsabilité totale de l&apos;Éditeur, quelle qu&apos;en soit la cause, est limitée au montant effectivement payé par l&apos;Utilisateur au cours des 12 mois précédant le fait générateur, le cas échéant.
              </p>
            </SubSection>
          </Section>

          <Section title="Article 12 — Résiliation">
            <SubSection title="12.1. Résiliation à l'initiative de l'Utilisateur">
              <p>
                L&apos;Utilisateur peut demander la clôture de son compte à tout moment en adressant une demande au support ou au DPO. Les traitements des DCP post-résiliation s&apos;effectuent conformément à l&apos;article 10 de la Politique de confidentialité (durées de conservation limitées).
              </p>
            </SubSection>
            <SubSection title="12.2. Résiliation à l'initiative de l'Éditeur">
              <p>
                L&apos;Éditeur se réserve le droit de suspendre ou de résilier l&apos;accès à la Plateforme, avec ou sans préavis, en cas de manquement grave ou répété aux présentes CGU, notamment en cas de violation des obligations de sécurité, d&apos;usage frauduleux ou de non-respect de la législation.
              </p>
            </SubSection>
            <SubSection title="12.3. Effets de la résiliation">
              <p>
                À l&apos;issue de la résiliation, l&apos;accès aux Services est supprimé. Les DCP sont conservées ou supprimées conformément aux règles définies dans la Politique de confidentialité, en tenant compte des obligations légales de conservation.
              </p>
            </SubSection>
          </Section>

          <Section title="Article 13 — Modification des Conditions Générales d'Utilisation">
            <OL>
              <li>L'Éditeur se réserve le droit de modifier à tout moment les présentes Conditions Générales d'Utilisation pour s'adapter aux évolutions légales, réglementaires, techniques ou fonctionnelles.</li>
              <li>Toute modification substantielle aux présentes Conditions Générales d'Utilisation sera notifiée à l'Utilisateur par courrier électronique et/ou par un avis visible sur la Plateforme, au moins trente (30) jours avant son entrée en vigueur.</li>
              <li>La version en vigueur est accessible en permanence à l'adresse <Link href="/conditions-utilisation" className="text-brand-600 underline">/conditions-utilisation</Link>.</li>
              <li>La poursuite de l'utilisation de la Plateforme après l'entrée en vigueur des modifications vaut acceptation sans réserve de celles-ci.</li>
            </OL>
          </Section>

          <Section title="Article 14 — Droit applicable et règlement des litiges">
            <OL>
              <li>Les présentes CGU sont régies et interprétées conformément au droit gabonais, notamment à la loi n°025/2023 relative à la protection des données à caractère personnel et de la vie privée.</li>
              <li>En cas de différend relatif à l&apos;interprétation, à l&apos;exécution ou à la validité des présentes CGU, les parties s&apos;efforceront de trouver une solution amiable dans un délai raisonnable.</li>
              <li>À défaut d&apos;accord amiable, tout litige sera porté devant les juridictions compétentes de Libreville, République Gabonaise.</li>
              <li>Sans préjudice des voies de recours judiciaires, toute personne concernée peut exercer son droit de réclamation auprès de l&apos;APDPVP, conformément à l&apos;article 200 de la loi n°025/2023.</li>
            </OL>
          </Section>

          <Section title="Article 15 — Contact">
            <UL>
              <li><strong>CEO et Responsable Conformité (APDPVP)</strong> : Sabine Anotho — <a href="mailto:sabine-anotho@greenleaves.ga" className="text-brand-600 underline">sabine-anotho@greenleaves.ga</a> — Tél. : 077523717</li>
              <li><strong>Responsable Projet</strong> : Moctar Sidibé — <a href="mailto:moctar-sidibe@greenleaves.ga" className="text-brand-600 underline">moctar-sidibe@greenleaves.ga</a> — Tél. : 077724499</li>
              <li><strong>Éditeur</strong> : GreenLeaves SARL — Libreville, République Gabonaise</li>
            </UL>
          </Section>
        </div>

        <p className="text-center text-xs text-gray-400 mt-8">
          CarbonTrack © GreenLeaves SARL — CGU conformes à la loi n°025/2023 (Gabon)
        </p>
      </article>
    </div>
  )
}

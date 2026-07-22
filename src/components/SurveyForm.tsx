import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// ============================================================================
// MINESUP Alumni Survey — field collector
// All field defs, branching logic, screens (survey/review/queue), storage and
// submission live in this single file for easy handoff/editing.
// ============================================================================

const FORM_ACTION =
  "https://docs.google.com/forms/u/0/d/e/1FAIpQLSeIw4ElQIeg-ZHtiUlVuEPNf-BJcClUUSR_-3Fj3D8L9UIGcA/formResponse";

// ---- Reference option lists -------------------------------------------------

const YES_NO = ["Oui", "Non"] as const;

function academicYearRanges(): string[] {
  const out: string[] = ["Avant 2000"];
  for (let start = 2000; start <= 2025; start++) {
    out.push(`${start}-${start + 1}`);
  }
  return out;
}
const ACADEMIC_YEARS = academicYearRanges();

const NATIONALITIES = [
  "Camerounaise",
  "Allemande",
  "Burundaise",
  "Centrafricaine",
  "Congolaise (Brazza)",
  "Congolaise (Kinshasa)",
  "Equato-guinéenne",
  "Espagnole",
  "Française",
  "Gabonaise",
  "Ivoirienne",
  "Malienne",
  "Rwandaise",
  "Sao Tomé-et-Principe",
  "Sénégalaise",
  "Tchadienne",
];

const REGIONS_CM = [
  "Adamaoua",
  "Centre",
  "Est",
  "Extrême-Nord",
  "Littoral",
  "Nord",
  "Nord-Ouest",
  "Ouest",
  "Sud",
  "Sud-Ouest",
];

const ESTABLISHMENTS = [
  "Université de Bamenda",
  "Université de Buea",
  "Université de Douala",
  "Université de Dschang",
  "Université de Maroua",
  "Université de Ngaoundéré",
  "Université de Yaoundé I",
  "Université de Yaoundé II",
  "Autres Grandes Ecoles (ENAM, INJS, ENSTP, ENSPT, etc.)",
  "Instituts Privés d'Enseignement Supérieur (IPES)",
];

// map university label -> { entryId, options }
const FACULTIES: Record<string, { entryId: string; options: string[] }> = {
  "Université de Bamenda": {
    entryId: "entry.1261361191",
    options: [
      "Faculté des Sciences Economiques et de Gestion",
      "Faculté des Arts, Lettres et Sciences Humaines",
      "Faculté des Sciences Juridiques et Politiques",
      "Faculté des Sciences",
      "Faculté des Sciences de la Santé",
      "Faculté des Sciences de l'Education",
      "Ecole de Technologie",
      "Ecole Normale Supérieure",
      "Ecole Normale Supérieure d'Enseignement Technique de Bamenda",
      "Haute Ecole de Logistiques et de Transport",
      "Institut National Supérieur Polytechnique de Bambili",
      "Institut Supérieur du Commerce et du Management",
    ],
  },
  "Université de Buea": {
    entryId: "entry.1490381826",
    options: [
      "Faculté d'Agriculture et de Médecine Vétérinaire",
      "Faculté d'Ingénierie et de Technologie",
      "Faculté des Arts",
      "Faculté des Sciences",
      "Faculté des Sciences de l'Education",
      "Faculté des Sciences Médicales",
      "Faculté des Sciences Sociales et du Management",
      "Ecole Normale Supérieure d'Enseignement Technique de Kumba",
      "Ecole de Technologie",
      "Ecole Supérieure de Traduction et d'Interpretariat",
    ],
  },
  "Université de Douala": {
    entryId: "entry.1112866046",
    options: [
      "Faculté de Médecine et des Sciences Pharmaceutiques",
      "Faculté des Lettres et Sciences Humaines",
      "Facultés des Sciences",
      "Faculté des Sciences Economiques et de Gestion Appliquée",
      "Faculté des Sciences Juridiques et Politiques",
      "FGI / Ecole Nationale Supérieure Polytechnique de Douala",
      "Ecole Normale Supérieure d'Enseignement Technique de Douala",
      "Ecole Supérieure des Sciences Economiques et Commerciales",
      "Institut des Beaux-Arts de Nkongsamba",
      "Institut des Sciences Halieutiques",
      "Institut Universitaire de Technologie de Douala",
    ],
  },
  "Université de Dschang": {
    entryId: "entry.2044835207",
    options: [
      "Faculté d'Agronomie et des Sciences Agricoles",
      "Faculté de Médecine et des Sciences Pharmaceutiques",
      "Faculté des Lettres et Sciences Humaines",
      "Faculté des Sciences",
      "Faculté des Sciences Economiques et de Gestion",
      "Faculté des Sciences Juridiques et Politiques",
      "Institut Universitaire de Technologie Fotso Victor de Bandjoun",
      "Institut des Beaux-Arts de Foumban",
    ],
  },
  "Université de Maroua": {
    entryId: "entry.1914925590",
    options: [
      "Faculté des Arts Lettres et Sciences Humaines",
      "Faculté des Sciences",
      "Faculté des Sciences Economiques et de Gestion",
      "Faculté des Sciences Juridiques et Politiques",
      "IMIP / Faculté des Mines et des Industries Pétrolières",
      "ISS / Ecole Nationale Supérieure Polytechnique de Maroua",
      "Ecole Normale Supérieure de Maroua",
    ],
  },
  "Université de Ngaoundéré": {
    entryId: "entry.1933250757",
    options: [
      "Faculté des Arts, Lettres et Sciences Humaines",
      "Faculté des Sciences",
      "Faculté des Sciences Economiques et de Gestion",
      "Faculté des Sciences Juridiques et Politiques",
      "Faculté des Sciences de l'Education",
      "Ecole Nationale Supérieure des Sciences Agro-Industrielles",
      "Ecole de Géologie et d'Exploitation Minière de Meiganga",
      "Ecole des Sciences et de Médecine Vétérinaire",
      "Ecole de Génie Chimique et des Industries Minérales",
      "Institut Universitaire de Technologie de Ngaoundéré",
    ],
  },
  "Université de Yaoundé I": {
    entryId: "entry.982301776",
    options: [
      "Faculté de Médecine et de Sciences Biomédicales",
      "Faculté des Arts, Lettres et Sciences Humaines",
      "Faculté des Sciences",
      "Faculté des Sciences de l'Education",
      "Ecole Nationale Supérieure Polytechnique de Yaoundé",
      "Ecole Normale Supérieure de Yaoundé",
      "Institut Universitaire de Technologie du Bois de Mbalmayo",
    ],
  },
  "Université de Yaoundé II": {
    entryId: "entry.357119313",
    options: [
      "Faculté des Sciences Juridiques et Politiques",
      "Faculté des Sciences Économiques et de Gestion",
      "Ecole Supérieure des Sciences et Techniques de l'Information et de la Communication (ESSTIC)",
      "Institut de Formation et de Recherche Démographique",
      "Institut des Relations Internationales du Cameroun",
    ],
  },
};

const DIPLOMAS = [
  "DEUG",
  "Licence (ou équivalent : Licence Professionnelle, Bachelor, etc...)",
  "Maîtrise",
  "DEA / DESS",
  "Master (ou équivalent : Master Professionnel, Master Recherche, MBA, etc...)",
  "Doctorat / PhD",
  "BTS (Brevet de Technicien Supérieur)",
  "Diplôme des écoles normales supérieures (DIPES, DIPET, DIPCO, DIPEN, …)",
  "Diplôme d'Ingénieur",
  "DTS (Diplôme de Technicien Supérieur)",
  "Autre",
];

const STUDY_DOMAINS = [
  "Formations juridiques, économiques et de gestion",
  "Lettres, Langues et Arts",
  "Sciences humaines et sociales",
  "Sciences, Technologies et formations de la Santé",
];

const DISCIPLINES: Record<string, { entryId: string; options: string[] }> = {
  "Formations juridiques, économiques et de gestion": {
    entryId: "entry.109838365",
    options: [
      "Administration économique et sociale (AES)",
      "Sciences de Gestion",
      "Sciences Economiques",
      "Sciences Juridiques",
      "Sciences Politiques",
    ],
  },
  "Lettres, Langues et Arts": {
    entryId: "entry.1171759956",
    options: [
      "Arts",
      "Cultures et langues régionales",
      "Français, langue étrangère",
      "Langues et littératures anciennes",
      "Langues et littératures étrangères",
      "Langues et littératures françaises",
      "Langues étrangères appliquées",
      "Littérature générale et comparée",
      "Sciences du langage - linguistique",
    ],
  },
  "Sciences humaines et sociales": {
    entryId: "entry.1346229092",
    options: [
      "Aménagement",
      "Archéologie, ethnologie, préhistoire",
      "Histoire",
      "Géographie",
      "Philosophie, épistémologie",
      "Psychologie",
      "Sciences de l'information et la communication",
      "Sciences de l'éducation",
      "Sciences humaines et sociales",
      "Sciences religieuses",
      "Sociologie, démographie",
    ],
  },
  "Sciences, Technologies et formations de la Santé": {
    entryId: "entry.752452000",
    options: [
      "Chimie",
      "Electronique, génie électrique",
      "Formation générale aux métiers de l'ingénieur",
      "Génie civil",
      "Génie des procédés",
      "Informatique",
      "Mathématiques",
      "Mathématiques appliquées et sciences sociales (MASS)",
      "Médecine",
      "Mécanique, génie mécanique",
      "Pharmacie",
      "Physique",
      "Sciences de l'univers",
      "Sciences de la vie",
      "Sciences et technologies industrielles",
      "STAPS",
    ],
  },
};

const PROF_SITUATIONS = [
  "En emploi (salarié, indépendant, entrepreneur)",
  "À la recherche d'un emploi",
  "Poursuite d'études (dans l'enseignement supérieur)",
  "En formation professionnelle (non universitaire)",
  "En stage (non rémunéré ou très faiblement rémunéré)",
  "Freelance (contrat ou consultation temporaire en ligne)",
  "Inactif (au foyer, raisons personnelles, etc.)",
  "Petits jobs (mais à l'écoute du marché de l'emploi)",
];

const SECTORS = [
  "Administratif",
  "Aéronautique et transport aérien",
  "Agriculture",
  "Agroalimentaire",
  "Architecte - BTP - Urbanisme",
  "Armée de Terre",
  "Art",
  "Artisanat",
  "Assurance",
  "Audiovisuel - Cinéma",
  "Automobile",
  "Banque - Finance",
  "Chimie - Biologie",
  "Commerce - Vente - Distribution",
  "Communication",
  "Comptabilité - Gestion",
  "Création",
  "Culture",
  "Cybersécurité",
  "Droit - Justice",
  "Economie",
  "Édition et métiers du livre",
  "Energie",
  "Enseignement",
  "Environnement - Développement durable",
  "Esthétique - Beauté - Coiffure",
  "Événementiel",
  "Fonction publique / Management public",
  "Hôtellerie-Restauration",
  "Humanitaire",
  "Immobilier",
  "Industrie",
  "Informatique - Electronique - Numérique",
  "Intelligence Artificielle (IA)",
  "Internet - Web",
  "Jeu vidéo - Esport - Gaming",
  "Journalisme",
  "Luxe",
  "Métiers animaliers",
  "Métiers de bouche",
  "Métiers de la mer",
  "Métiers du vin",
  "Mode - Textile",
  "Multimédia",
  "Musique",
  "Paramédical",
  "Psychologie",
  "Publicité - Marketing",
  "Ressources Humaines",
  "Santé",
  "Secrétaire-Assistant(e)",
  "Sécurité - Armée - Défense",
  "Social",
  "Sport",
  "Tourisme",
  "Transport- Logistique",
  "Travailler avec les enfants",
  "Autres",
];

const ACTIVITY_CATEGORIES: Record<string, { entryId: string; options: string[] }> = {
  "Agriculteurs et ouvriers de l'agriculture, élevage, pêche, forêt": {
    entryId: "entry.1560038487",
    options: [
      "Eleveurs et ouvriers de l'élevage (sauf aquaculteurs)",
      "Pêcheurs et ouvriers de la pêche",
      "Planteurs/cultivateurs et ouvriers des cultures",
      "Professions de forestage (bucherons, abatteurs, scieurs, sylviculteurs)",
      "Professions fauniques",
    ],
  },
  "Artisans et ouvriers de l'industrie": {
    entryId: "entry.135099235",
    options: [
      "Métiers de l'artisanat",
      "Métiers du bâtiment et assimilés",
      "Métiers de la métallurgie et de la construction mécanique",
      "Métiers de l'imprimerie et de l'édition",
      "Métiers de l'électricité et de l'électrotechnique",
      "Métiers de l'industrie de l'alimentation",
      "Ouvriers de l'industrie de l'habillement et autres métiers de l'industrie",
      "Métiers et ouvriers de l'industrie du bois et autres artisans et ouvriers non compris ailleurs",
    ],
  },
  "Dirigeants, directeurs, cadres de direction ou gérants": {
    entryId: "entry.650279451",
    options: [
      "Dirigeants des organisations spécialisées",
      "Directeurs et Cadres de Direction des grandes entreprises",
      "Dirigeants et Gérants des petites entreprises",
      "Membres de l'Exécutif, des corps législatifs, Directeurs Généraux et Cadres supérieurs de l'Administration Publique",
    ],
  },
  "Employés de type administratif": {
    entryId: "entry.1918710488",
    options: [
      "Employés de bureau",
      "Employés de réception, guichetiers et assimilés",
      "Employés des services comptables et d'approvisionnement",
      "Autres employés de type administratif",
    ],
  },
  "Forces de défense et de sécurité, administration pénitentiaire": {
    entryId: "entry.1922179090",
    options: [
      "Personnel de la sécurité nationale",
      "Personnel de la gendarmerie et des armées",
      "Personnel de l'administration pénitentiaire",
    ],
  },
  "Personnel des services directs aux particuliers, commerçants et vendeurs": {
    entryId: "entry.391870228",
    options: [
      "Aides de ménage",
      "Commerçants et vendeurs",
      "Personnel des services de protection et de sécurité",
      "Personnel des services directs aux particuliers",
      "Personnel soignant",
    ],
  },
  "Professions intellectuelles et scientifiques": {
    entryId: "entry.206473982",
    options: [
      "Spécialistes de l'animation et de l'orientation scolaire, universitaire et professionnelle",
      "Spécialistes de l'enseignement",
      "Spécialistes de la justice, des sciences sociales et de la culture",
      "Spécialistes de la logistique et de la messagerie",
      "Spécialistes de la santé",
      "Spécialistes des sciences et techniques",
      "Spécialistes des technologies de l'information et des communications",
      "Spécialistes en administration et management d'entreprises",
    ],
  },
  "Professions intermédiaires": {
    entryId: "entry.400094536",
    options: [
      "Personnel de la douane (active)",
      "Professions intermédiaires de la santé et de l'enseignement",
      "Professions intermédiaires des finances et l'administration",
      "Professions intermédiaires des sciences et techniques",
      "Professions intermédiaires des services juridiques, des services sociaux et assimilés",
      "Techniciens de l'information et des communications",
    ],
  },
};
const ACTIVITY_CATEGORY_LIST = Object.keys(ACTIVITY_CATEGORIES);

// ---- Answer types -----------------------------------------------------------

type Answers = Record<string, string | string[] | { year: string; month: string; day: string }>;

type FieldKind = "radio" | "select" | "checkbox" | "text" | "date";

interface Step {
  key: string;
  entryId?: string; // undefined for date (uses per-part suffix)
  kind: FieldKind;
  label: string;
  options?: string[];
  maxSelect?: number; // for checkbox cap
  visible: (a: Answers) => boolean;
}

// Helper accessors
const s = (a: Answers, k: string) => (typeof a[k] === "string" ? (a[k] as string) : "");
const arr = (a: Answers, k: string): string[] => (Array.isArray(a[k]) ? (a[k] as string[]) : []);

// ---- Step definitions in submission order ----------------------------------

const STEPS: Step[] = [
  {
    key: "recontact",
    entryId: "entry.540136743",
    kind: "radio",
    label: "Souhaitez-vous être contacté plus tard pour approfondir le suivi de votre carrière ?",
    options: [...YES_NO],
    visible: () => true,
  },
  {
    key: "first_year",
    entryId: "entry.275953080",
    kind: "select",
    label: "Quelle est l'année académique de votre première inscription dans l'enseignement supérieur ?",
    options: ACADEMIC_YEARS,
    visible: () => true,
  },
  {
    key: "sexe",
    entryId: "entry.1562111812",
    kind: "radio",
    label: "Sexe",
    options: ["Masculin", "Féminin"],
    visible: () => true,
  },
  {
    key: "dob",
    kind: "date",
    label: "Votre date de naissance",
    visible: () => true,
  },
  {
    key: "nationalite",
    entryId: "entry.592938998",
    kind: "select",
    label: "Nationalité",
    options: NATIONALITIES,
    visible: () => true,
  },
  {
    key: "region",
    entryId: "entry.547778420",
    kind: "select",
    label: "Région d'origine (au Cameroun)",
    options: REGIONS_CM,
    visible: (a) => s(a, "nationalite") === "Camerounaise",
  },
  {
    key: "etablissement",
    entryId: "entry.1331168430",
    kind: "select",
    label: "Quel est le dernier établissement d'enseignement supérieur que vous avez fréquenté ?",
    options: ESTABLISHMENTS,
    visible: () => true,
  },
  {
    key: "faculte",
    kind: "select",
    label: "Quel était votre établissement (faculté / école) ?",
    visible: (a) => !!FACULTIES[s(a, "etablissement")],
  },
  {
    key: "annee_diplome",
    entryId: "entry.1068762963",
    kind: "select",
    label: "Quelle est l'année académique d'obtention de votre diplôme le plus élevé ?",
    options: ACADEMIC_YEARS,
    visible: () => true,
  },
  {
    key: "diplome",
    entryId: "entry.1238043970",
    kind: "select",
    label: "Quel est le diplôme que vous avez obtenu durant cette année académique ?",
    options: DIPLOMAS,
    visible: () => true,
  },
  {
    key: "redouble",
    entryId: "entry.154158153",
    kind: "radio",
    label: "Avez-vous repris une ou plusieurs années durant votre parcours universitaire ?",
    options: [...YES_NO],
    visible: () => true,
  },
  {
    key: "domaine",
    entryId: "entry.1728182798",
    kind: "select",
    label: "Domaine d'études de votre diplôme",
    options: STUDY_DOMAINS,
    visible: () => true,
  },
  {
    key: "discipline",
    kind: "select",
    label: "Discipline précise",
    visible: (a) => !!DISCIPLINES[s(a, "domaine")],
  },
  {
    key: "situation",
    entryId: "entry.1681558494",
    kind: "select",
    label: "Quelle est votre situation professionnelle actuelle ?",
    options: PROF_SITUATIONS,
    visible: () => true,
  },

  // Track A — En emploi
  {
    key: "secteur",
    entryId: "entry.1993264057",
    kind: "select",
    label: "Dans quel secteur d'activité avez-vous été recruté ?",
    options: SECTORS,
    visible: (a) => s(a, "situation") === PROF_SITUATIONS[0],
  },
  {
    key: "type_emploi",
    entryId: "entry.322745196",
    kind: "radio",
    label: "Est-ce dans le public, parapublic, privé, … ?",
    options: ["Public", "Parapublic", "Privé", "Entrepreneuriat"],
    visible: (a) => s(a, "situation") === PROF_SITUATIONS[0],
  },
  {
    key: "activite_cat",
    entryId: "entry.1294419789",
    kind: "select",
    label: "Quelle est votre activité principale actuelle ?",
    options: ACTIVITY_CATEGORY_LIST,
    visible: (a) => s(a, "situation") === PROF_SITUATIONS[0],
  },
  {
    key: "activite_sub",
    kind: "select",
    label: "Précisez votre métier",
    visible: (a) => !!ACTIVITY_CATEGORIES[s(a, "activite_cat")],
  },
  {
    key: "emploi_lie",
    entryId: "entry.1682848601",
    kind: "radio",
    label: "Votre emploi actuel est-il lié à votre domaine de formation ?",
    options: [
      "Oui, directement lié",
      "Oui, mais partiellement lié",
      "Non, pas du tout lié",
    ],
    visible: (a) => s(a, "situation") === PROF_SITUATIONS[0],
  },
  {
    key: "canal",
    entryId: "entry.1811036612",
    kind: "checkbox",
    maxSelect: 3,
    label: "Par quel canal avez-vous eu votre premier emploi ? (max 3)",
    options: [
      "Agences de recrutement / Cabinets de placement",
      "Candidature spontanée",
      "Concours de la fonction publique",
      "Création d'entreprise",
      "Forums emploi / Salons de recrutement",
      "Journaux",
      "Offres d'emploi en ligne (sites web, réseaux sociaux professionnels)",
      "Recommandation universitaire",
      "Relation familiale",
      "Réponse à une offre vue en route ou sur les poteaux",
      "Réseau personnel",
      "Stage converti en emploi",
    ],
    visible: (a) => s(a, "situation") === PROF_SITUATIONS[0],
  },
  {
    key: "nb_emplois",
    entryId: "entry.1197477706",
    kind: "radio",
    label: "Depuis l'obtention de votre diplôme, combien d'emploi(s) avez-vous occupé(s) ?",
    options: ["1", "2", "3", "4 ou plus"],
    visible: (a) => s(a, "situation") === PROF_SITUATIONS[0],
  },
  {
    key: "satisfaction",
    entryId: "entry.748618150",
    kind: "radio",
    label: "Quel est votre niveau de satisfaction concernant votre emploi actuel ?",
    options: [
      "Très satisfait(e)",
      "Plutôt satisfait(e)",
      "Neutre",
      "Plutôt insatisfait(e)",
      "Très insatisfait(e)",
    ],
    visible: (a) => s(a, "situation") === PROF_SITUATIONS[0],
  },
  {
    key: "revenu",
    entryId: "entry.22478400",
    kind: "radio",
    label: "Si vous êtes salarié(e), quel est votre revenu net mensuel (en FCFA) ?",
    options: [
      "Moins de 100 000 FCFA",
      "100 000 - 250 000 FCFA",
      "251 000 - 500 000 FCFA",
      "501 000 - 750 000 FCFA",
      "751 000 - 1 000 000 FCFA",
      "Plus de 1 000 000 FCFA",
      "Je préfère ne pas répondre",
    ],
    visible: (a) => s(a, "situation") === PROF_SITUATIONS[0],
  },

  // Track B — Recherche d'emploi
  {
    key: "recherche_duree",
    entryId: "entry.1402989880",
    kind: "radio",
    label: "Depuis combien de temps êtes-vous à la recherche d'un emploi ?",
    options: [
      "Moins de 3 mois",
      "3 à 6 mois",
      "6 mois à 1 an",
      "1 à 3 ans",
      "Plus de 3 ans",
    ],
    visible: (a) => s(a, "situation") === PROF_SITUATIONS[1],
  },
  {
    key: "recherche_difficultes",
    entryId: "entry.1778580773",
    kind: "checkbox",
    maxSelect: 3,
    label: "Principales difficultés dans votre recherche d'emploi (max 3)",
    options: [
      "Facteurs liés au marché du travail (rareté des offres, forte concurrence)",
      "Facteurs liés à l'adéquation profil-emploi (manque d'expérience, qualifications insuffisantes)",
      "Facteurs liés aux conditions d'emploi (salaires trop bas, discrimination)",
      "Facteurs personnels et de réseau (manque de réseau professionnel, découragement)",
      "Facteurs liés au genre ou à un handicap (être une femme, problème physique, etc.)",
    ],
    visible: (a) => s(a, "situation") === PROF_SITUATIONS[1],
  },
  {
    key: "recherche_demarches",
    entryId: "entry.1155155547",
    kind: "radio",
    label:
      "Avez-vous entrepris des démarches complémentaires (formations, certifications, stages, bénévolat) pour faciliter votre insertion professionnelle ?",
    options: [...YES_NO],
    visible: (a) => s(a, "situation") === PROF_SITUATIONS[1],
  },

  // Track C — Poursuite d'études
  {
    key: "etudes_pourquoi",
    entryId: "entry.549285734",
    kind: "radio",
    label: "Pourquoi avez-vous décidé de continuer vos études ?",
    options: ["Je n'ai pas trouvé d'emploi", "Je souhaite continuer mes études"],
    visible: (a) => s(a, "situation") === PROF_SITUATIONS[2],
  },
  {
    key: "etudes_diplome",
    entryId: "entry.824523150",
    kind: "radio",
    label: "Quel est le diplôme que vous préparez actuellement ?",
    options: [
      "Licence",
      "Master",
      "Master de recherche",
      "Doctorat / PhD",
      "Diplôme de spécialisation (ex. DES, DESS)",
      "Diplôme d'Ingénieur",
      "Diplôme professionnel (ex. BTS, DTS)",
    ],
    visible: (a) => s(a, "situation") === PROF_SITUATIONS[2],
  },
  {
    key: "etudes_univ",
    entryId: "entry.1537853420",
    kind: "radio",
    label: "Dans quelle université / IPES poursuivez-vous vos études ?",
    options: [
      "La même que celui de votre précédent diplôme",
      "Une autre université au Cameroun",
      "Une université à l'étranger",
    ],
    visible: (a) => s(a, "situation") === PROF_SITUATIONS[2],
  },
  {
    key: "etudes_specialite",
    entryId: "entry.1324023576",
    kind: "radio",
    label: "S'agit-il de la même spécialité que votre précédent diplôme ?",
    options: [...YES_NO],
    visible: (a) => s(a, "situation") === PROF_SITUATIONS[2],
  },

  // Track D — Autre
  {
    key: "autre_situation",
    entryId: "entry.934029764",
    kind: "text",
    label: "Pourriez-vous décrire brièvement votre situation professionnelle actuelle ?",
    visible: (a) => {
      const v = s(a, "situation");
      return !!v && v !== PROF_SITUATIONS[0] && v !== PROF_SITUATIONS[1] && v !== PROF_SITUATIONS[2];
    },
  },

  // Perception (everyone)
  {
    key: "perception",
    entryId: "entry.1150690704",
    kind: "radio",
    label:
      "Comment appréciez-vous la formation reçue à l'université relativement à votre insertion au monde professionnel ?",
    options: ["Très bien", "Assez bien", "Ni bien ni mal", "Plutôt mal", "Très mal"],
    visible: () => true,
  },
  {
    key: "points_forts",
    entryId: "entry.644736837",
    kind: "checkbox",
    maxSelect: 2,
    label: "Points forts de la formation (max 2)",
    options: [
      "Acquisition de compétences (techniques et transversales)",
      "Cadre d'étude (relations universitaires, ressources pédagogiques, administration)",
      "Expériences pratiques et professionnalisation (stages, projets)",
      "Qualité de l'enseignement et du corps professoral",
    ],
    visible: () => true,
  },
  {
    key: "a_ameliorer",
    entryId: "entry.1448048508",
    kind: "checkbox",
    maxSelect: 2,
    label: "Aspects à améliorer dans la formation (max 2)",
    options: [
      "Faible qualité ou manque d'enseignements clés (compétences transversales, certains cours)",
      "Inadéquation des formateurs avec les programmes du monde professionnel. Problème de la ressource humaine",
      "Inadéquation des programmes de formation (contenus trop théoriques ou non actualisés)",
      "Insuffisance du lien avec le monde professionnel (stages, orientation)",
      "Manque de ressources et d'encadrement administratif",
    ],
    visible: () => true,
  },
  {
    key: "recommande",
    entryId: "entry.1051099136",
    kind: "radio",
    label: "Recommanderiez-vous cette formation à un futur étudiant ?",
    options: [...YES_NO],
    visible: () => true,
  },
  {
    key: "conseil_passe",
    entryId: "entry.662823388",
    kind: "radio",
    label:
      "Si vous pouviez donner un conseil à votre « vous » du passé juste avant l'obtention de votre diplôme, quel serait-il ?",
    options: [
      "Amélioration dans l'apprentissage des langues étrangères",
      "Une certification/formation plus professionnelle en complément",
      "Une formation sur les techniques de recherche d'emploi",
      "Utilisation de l'outil informatique",
    ],
    visible: () => true,
  },
  {
    key: "aspirations",
    entryId: "entry.1806981904",
    kind: "checkbox",
    maxSelect: 3,
    label: "Aspirations professionnelles pour les 3 à 5 prochaines années (max 3)",
    options: [
      "Acquérir de nouvelles compétences / Me reconvertir",
      "Changer de secteur d'activité",
      "Créer ma propre entreprise",
      "Évoluer vers un poste à plus haute responsabilité",
      "Obtenir un emploi stable",
      "Poursuivre mes études / Obtenir un diplôme supérieur",
      "Travailler à l'étranger",
    ],
    visible: () => true,
  },
  {
    key: "lien_etab",
    entryId: "entry.1256732400",
    kind: "radio",
    label:
      "Souhaiteriez-vous maintenir un lien avec votre ancien établissement d'enseignement supérieur ?",
    options: [...YES_NO],
    visible: () => true,
  },
  {
    key: "diplome_2021",
    entryId: "entry.2115763317",
    kind: "radio",
    label: "Avez-vous obtenu un diplôme durant l'année académique 2020-2021 ?",
    options: [...YES_NO],
    visible: () => true,
  },
  {
    key: "diplome_2021_type",
    entryId: "entry.433676738",
    kind: "radio",
    label: "Quel est le diplôme obtenu durant l'année académique 2020-2021 ?",
    options: [
      "Licence",
      "Maitrise",
      "DEA / DESS",
      "Master",
      "Doctorat / PhD",
      "BTS",
      "Diplôme des écoles normales supérieures (DIPES, DIPET, DIPCO, DIPEN, …)",
      "Diplôme d'Ingénieur",
      "DTS",
    ],
    visible: (a) => s(a, "diplome_2021") === "Oui",
  },
  {
    key: "contact_promo",
    entryId: "entry.151114813",
    kind: "radio",
    label: "Avez-vous gardé le contact avec vos promotionnaires ?",
    options: [...YES_NO],
    visible: () => true,
  },
  {
    key: "partage_lien",
    entryId: "entry.52072735",
    kind: "radio",
    label:
      "Pourriez-vous accepter de partager le lien de l'étude pour faire participer vos promotionnaires ?",
    options: [...YES_NO],
    visible: () => true,
  },
];

// ---- Dynamic option / entryId resolution per step --------------------------

function resolveStep(step: Step, answers: Answers): { entryId?: string; options?: string[] } {
  if (step.key === "faculte") {
    const uni = s(answers, "etablissement");
    const f = FACULTIES[uni];
    return { entryId: f?.entryId, options: f?.options };
  }
  if (step.key === "discipline") {
    const d = s(answers, "domaine");
    const g = DISCIPLINES[d];
    return { entryId: g?.entryId, options: g?.options };
  }
  if (step.key === "activite_sub") {
    const c = s(answers, "activite_cat");
    const g = ACTIVITY_CATEGORIES[c];
    return { entryId: g?.entryId, options: g?.options };
  }
  return { entryId: step.entryId, options: step.options };
}

// ---- Build FormData for Google submission ----------------------------------

function buildFormData(answers: Answers): Record<string, string | string[]> {
  const payload: Record<string, string | string[]> = {};
  for (const step of STEPS) {
    if (!step.visible(answers)) continue;
    const val = answers[step.key];
    if (val == null || val === "" || (Array.isArray(val) && val.length === 0)) continue;
    const { entryId } = resolveStep(step, answers);
    if (step.kind === "date" && typeof val === "object" && "year" in val) {
      payload["entry.1584706306_year"] = val.year;
      payload["entry.1584706306_month"] = val.month;
      payload["entry.1584706306_day"] = val.day;
      continue;
    }
    if (!entryId) continue;
    payload[entryId] = val as string | string[];
  }
  return payload;
}

// ---- Submission via hidden iframe ------------------------------------------

function submitViaIframe(answers: Answers): Promise<void> {
  return new Promise((resolve) => {
    const iframeName = `gf-target-${Math.random().toString(36).slice(2)}`;
    const iframe = document.createElement("iframe");
    iframe.name = iframeName;
    iframe.style.display = "none";
    document.body.appendChild(iframe);

    const form = document.createElement("form");
    form.action = FORM_ACTION;
    form.method = "POST";
    form.target = iframeName;
    form.style.display = "none";

    const data = buildFormData(answers);
    for (const [name, value] of Object.entries(data)) {
      const values = Array.isArray(value) ? value : [value];
      for (const v of values) {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = name;
        input.value = v;
        form.appendChild(input);
      }
    }

    document.body.appendChild(form);
    // We cannot read the response due to CORS; resolve after a delay.
    const cleanup = () => {
      setTimeout(() => {
        try {
          form.remove();
          iframe.remove();
        } catch {
          /* ignore */
        }
        resolve();
      }, 1500);
    };
    iframe.addEventListener("load", cleanup);
    form.submit();
    // Fallback in case load doesn't fire
    setTimeout(cleanup, 6000);
  });
}

// ---- Storage layer (Supabase + localStorage fallback) ----------------------

interface QueueEntry {
  id: string;
  answers: Answers;
  submitted: boolean;
  submitted_at: string | null;
  submission_attempts: number;
  last_error: string | null;
  created_at: string;
}

const LS_KEY = "minesup_queue_v1";

function loadLocal(): QueueEntry[] {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || "[]");
  } catch {
    return [];
  }
}
function saveLocal(entries: QueueEntry[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(entries));
}
function upsertLocal(entry: QueueEntry) {
  const all = loadLocal();
  const i = all.findIndex((e) => e.id === entry.id);
  if (i >= 0) all[i] = entry;
  else all.unshift(entry);
  saveLocal(all);
}
function removeLocal(id: string) {
  saveLocal(loadLocal().filter((e) => e.id !== id));
}

async function persistEntry(entry: QueueEntry) {
  upsertLocal(entry);
  try {
    await supabase.from("survey_responses").upsert({
      id: entry.id,
      answers: entry.answers,
      submitted: entry.submitted,
      submitted_at: entry.submitted_at,
      submission_attempts: entry.submission_attempts,
      last_error: entry.last_error,
    });
  } catch (e) {
    console.warn("Supabase persist failed (kept local):", e);
  }
}

async function loadQueue(): Promise<QueueEntry[]> {
  const local = loadLocal();
  try {
    const { data } = await supabase
      .from("survey_responses")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) {
      // merge: prefer remote by id
      const map = new Map<string, QueueEntry>();
      for (const l of local) map.set(l.id, l);
      for (const r of data as any[]) {
        map.set(r.id, {
          id: r.id,
          answers: r.answers,
          submitted: r.submitted,
          submitted_at: r.submitted_at,
          submission_attempts: r.submission_attempts,
          last_error: r.last_error,
          created_at: r.created_at,
        });
      }
      const merged = Array.from(map.values()).sort((a, b) =>
        b.created_at.localeCompare(a.created_at),
      );
      saveLocal(merged);
      return merged;
    }
  } catch (e) {
    console.warn("Supabase load failed, using local:", e);
  }
  return local;
}

// ---- UI primitives ---------------------------------------------------------

const btnPrimary =
  "inline-flex h-14 items-center justify-center rounded-2xl bg-primary px-6 text-base font-semibold text-primary-foreground shadow-sm active:scale-[.98] transition disabled:opacity-40";
const btnSecondary =
  "inline-flex h-14 items-center justify-center rounded-2xl bg-secondary px-6 text-base font-semibold text-secondary-foreground border border-border active:scale-[.98] transition";
const btnGhost =
  "inline-flex h-11 items-center justify-center rounded-xl px-4 text-sm font-medium text-muted-foreground hover:text-foreground transition";

// ---- Main component --------------------------------------------------------

type Screen = "home" | "survey" | "review" | "queue";

export default function SurveyApp() {
  const [screen, setScreen] = useState<Screen>("home");
  const [answers, setAnswers] = useState<Answers>({});
  const [stepIdx, setStepIdx] = useState(0);
  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loadQueue().then(setQueue);
  }, []);

  const notify = (msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  };

  const visibleSteps = useMemo(
    () => STEPS.filter((st) => st.visible(answers)),
    [answers],
  );
  const currentStep = visibleSteps[stepIdx];

  function startNew() {
    setAnswers({});
    setStepIdx(0);
    setScreen("survey");
  }

  function setValue(key: string, v: Answers[string]) {
    setAnswers((a) => ({ ...a, [key]: v }));
  }

  function isAnswered(step: Step, a: Answers): boolean {
    const v = a[step.key];
    if (step.kind === "date") {
      return !!v && typeof v === "object" && !!(v as any).year && !!(v as any).month && !!(v as any).day;
    }
    if (step.kind === "checkbox") return Array.isArray(v) && v.length > 0;
    return typeof v === "string" && v.length > 0;
  }

  function next() {
    if (!currentStep) return;
    if (!isAnswered(currentStep, answers)) {
      notify("Cette question est obligatoire.");
      return;
    }
    // Recompute visible after answer change may still include current step
    const nextVisible = STEPS.filter((st) => st.visible(answers));
    const nextIdx = stepIdx + 1;
    if (nextIdx >= nextVisible.length) {
      setScreen("review");
    } else {
      setStepIdx(nextIdx);
    }
  }
  function back() {
    if (stepIdx === 0) {
      setScreen("home");
      return;
    }
    setStepIdx((i) => Math.max(0, i - 1));
  }

  async function saveAndSubmit() {
    setBusy(true);
    const entry: QueueEntry = {
      id:
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : String(Date.now()),
      answers,
      submitted: false,
      submitted_at: null,
      submission_attempts: 0,
      last_error: null,
      created_at: new Date().toISOString(),
    };
    // Save FIRST so nothing is lost
    await persistEntry(entry);
    try {
      await submitViaIframe(answers);
      entry.submitted = true;
      entry.submitted_at = new Date().toISOString();
      entry.submission_attempts = 1;
      await persistEntry(entry);
      notify("Réponse envoyée et sauvegardée.");
    } catch (e: any) {
      entry.submission_attempts = 1;
      entry.last_error = String(e?.message || e);
      await persistEntry(entry);
      notify("Réponse sauvegardée. Envoi à réessayer.");
    }
    setQueue(await loadQueue());
    setBusy(false);
    setScreen("home");
  }

  async function retry(entry: QueueEntry) {
    setBusy(true);
    try {
      await submitViaIframe(entry.answers);
      const updated: QueueEntry = {
        ...entry,
        submitted: true,
        submitted_at: new Date().toISOString(),
        submission_attempts: entry.submission_attempts + 1,
        last_error: null,
      };
      await persistEntry(updated);
      notify("Renvoyée avec succès.");
    } catch (e: any) {
      const updated: QueueEntry = {
        ...entry,
        submission_attempts: entry.submission_attempts + 1,
        last_error: String(e?.message || e),
      };
      await persistEntry(updated);
      notify("Nouvel échec, elle reste en file.");
    }
    setQueue(await loadQueue());
    setBusy(false);
  }

  async function removeEntry(entry: QueueEntry) {
    if (!confirm("Supprimer cette réponse de la file ?")) return;
    removeLocal(entry.id);
    try {
      await supabase.from("survey_responses").delete().eq("id", entry.id);
    } catch {
      /* ignore */
    }
    setQueue(await loadQueue());
  }

  // ---- Screens ------------------------------------------------------------

  const pendingCount = queue.filter((q) => !q.submitted).length;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen max-w-md flex-col">
        <header className="flex items-center justify-between px-5 pt-6 pb-3">
          <button onClick={() => setScreen("home")} className="text-left">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">MINESUP</div>
            <div className="text-lg font-bold leading-tight">Collecte Alumni</div>
          </button>
          <button onClick={() => setScreen("queue")} className={btnGhost}>
            File
            {pendingCount > 0 && (
              <span className="ml-2 inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-destructive px-1.5 text-xs font-bold text-destructive-foreground">
                {pendingCount}
              </span>
            )}
          </button>
        </header>

        {toast && (
          <div className="mx-5 mb-2 rounded-xl bg-foreground px-4 py-3 text-sm text-background shadow">
            {toast}
          </div>
        )}

        <main className="flex-1 px-5 pb-8">
          {screen === "home" && (
            <HomeScreen
              onStart={startNew}
              onQueue={() => setScreen("queue")}
              total={queue.length}
              pending={pendingCount}
            />
          )}

          {screen === "survey" && currentStep && (
            <SurveyScreen
              step={currentStep}
              answers={answers}
              setValue={setValue}
              onNext={next}
              onBack={back}
              index={stepIdx}
              total={visibleSteps.length}
            />
          )}

          {screen === "review" && (
            <ReviewScreen
              answers={answers}
              onBack={() => setScreen("survey")}
              onEdit={(k) => {
                const idx = visibleSteps.findIndex((s) => s.key === k);
                if (idx >= 0) {
                  setStepIdx(idx);
                  setScreen("survey");
                }
              }}
              onSubmit={saveAndSubmit}
              busy={busy}
            />
          )}

          {screen === "queue" && (
            <QueueScreen
              queue={queue}
              onBack={() => setScreen("home")}
              onRetry={retry}
              onRemove={removeEntry}
              onRefresh={async () => setQueue(await loadQueue())}
              busy={busy}
            />
          )}
        </main>
      </div>
    </div>
  );
}

// ---- Home ------------------------------------------------------------------

function HomeScreen({
  onStart,
  onQueue,
  total,
  pending,
}: {
  onStart: () => void;
  onQueue: () => void;
  total: number;
  pending: number;
}) {
  return (
    <div className="flex flex-col gap-6 pt-6">
      <div className="rounded-3xl bg-card p-6 shadow-sm">
        <h1 className="text-2xl font-bold leading-tight">
          Enquête de suivi des diplômés
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Version courte — champs obligatoires uniquement. Chaque réponse est
          soumise au formulaire officiel MINESUP.
        </p>
      </div>

      <button className={btnPrimary + " w-full"} onClick={onStart}>
        Commencer une nouvelle réponse
      </button>

      <button className={btnSecondary + " w-full"} onClick={onQueue}>
        Voir la file ({pending} en attente / {total} au total)
      </button>

      <p className="mt-4 text-center text-xs text-muted-foreground">
        Les réponses sont sauvegardées localement avant tout envoi.
      </p>
    </div>
  );
}

// ---- Survey step -----------------------------------------------------------

function SurveyScreen({
  step,
  answers,
  setValue,
  onNext,
  onBack,
  index,
  total,
}: {
  step: Step;
  answers: Answers;
  setValue: (k: string, v: Answers[string]) => void;
  onNext: () => void;
  onBack: () => void;
  index: number;
  total: number;
}) {
  const { options } = resolveStep(step, answers);
  const progress = Math.round(((index + 1) / total) * 100);
  const val = answers[step.key];

  return (
    <div className="flex flex-col gap-5 pt-4">
      <div>
        <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Question {index + 1} / {total}
          </span>
          <span>{progress}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
          <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <h2 className="text-xl font-semibold leading-snug">{step.label}</h2>

      <div className="flex flex-col gap-2">
        {step.kind === "radio" &&
          (options || []).map((opt) => (
            <label
              key={opt}
              className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border p-4 text-base transition ${
                val === opt
                  ? "border-primary bg-primary/10 font-semibold"
                  : "border-border bg-card"
              }`}
            >
              <input
                type="radio"
                className="h-5 w-5"
                checked={val === opt}
                onChange={() => setValue(step.key, opt)}
              />
              <span className="flex-1">{opt}</span>
            </label>
          ))}

        {step.kind === "select" && (
          <select
            className="min-h-14 rounded-2xl border border-border bg-card px-4 text-base"
            value={typeof val === "string" ? val : ""}
            onChange={(e) => setValue(step.key, e.target.value)}
          >
            <option value="">— Sélectionner —</option>
            {(options || []).map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        )}

        {step.kind === "checkbox" && (
          <>
            <div className="text-xs text-muted-foreground">
              Sélection maximum : {step.maxSelect}
            </div>
            {(options || []).map((opt) => {
              const cur = arr(answers, step.key);
              const checked = cur.includes(opt);
              const capReached = !!step.maxSelect && cur.length >= step.maxSelect && !checked;
              return (
                <label
                  key={opt}
                  className={`flex min-h-14 items-center gap-3 rounded-2xl border p-4 text-base transition ${
                    checked
                      ? "border-primary bg-primary/10 font-semibold"
                      : capReached
                        ? "border-border bg-card opacity-40"
                        : "border-border bg-card cursor-pointer"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="h-5 w-5"
                    checked={checked}
                    disabled={capReached}
                    onChange={(e) => {
                      const nextSet = new Set(cur);
                      if (e.target.checked) nextSet.add(opt);
                      else nextSet.delete(opt);
                      setValue(step.key, Array.from(nextSet));
                    }}
                  />
                  <span className="flex-1">{opt}</span>
                </label>
              );
            })}
          </>
        )}

        {step.kind === "text" && (
          <textarea
            className="min-h-32 rounded-2xl border border-border bg-card p-4 text-base"
            value={typeof val === "string" ? val : ""}
            onChange={(e) => setValue(step.key, e.target.value)}
            placeholder="Votre réponse…"
          />
        )}

        {step.kind === "date" && <DateField value={val as any} onChange={(v) => setValue(step.key, v)} />}
      </div>

      <div className="mt-4 flex gap-3">
        <button className={btnSecondary + " flex-1"} onClick={onBack}>
          ← Retour
        </button>
        <button className={btnPrimary + " flex-[2]"} onClick={onNext}>
          Suivant →
        </button>
      </div>
    </div>
  );
}

function DateField({
  value,
  onChange,
}: {
  value?: { year: string; month: string; day: string };
  onChange: (v: { year: string; month: string; day: string }) => void;
}) {
  const iso =
    value && value.year && value.month && value.day
      ? `${value.year}-${value.month.padStart(2, "0")}-${value.day.padStart(2, "0")}`
      : "";
  return (
    <input
      type="date"
      className="min-h-14 rounded-2xl border border-border bg-card px-4 text-base"
      value={iso}
      onChange={(e) => {
        const v = e.target.value; // yyyy-mm-dd
        if (!v) return;
        const [y, m, d] = v.split("-");
        onChange({ year: y, month: String(parseInt(m, 10)), day: String(parseInt(d, 10)) });
      }}
    />
  );
}

// ---- Review ----------------------------------------------------------------

function ReviewScreen({
  answers,
  onBack,
  onEdit,
  onSubmit,
  busy,
}: {
  answers: Answers;
  onBack: () => void;
  onEdit: (k: string) => void;
  onSubmit: () => void;
  busy: boolean;
}) {
  const visible = STEPS.filter((s) => s.visible(answers));
  return (
    <div className="flex flex-col gap-4 pt-4">
      <h2 className="text-xl font-bold">Vérification avant envoi</h2>
      <p className="text-sm text-muted-foreground">
        Relisez chaque réponse. Touchez une ligne pour la modifier.
      </p>
      <div className="flex flex-col gap-2">
        {visible.map((st) => {
          const v = answers[st.key];
          let display = "";
          if (st.kind === "date" && v && typeof v === "object") {
            const d = v as { year: string; month: string; day: string };
            display = `${d.day}/${d.month}/${d.year}`;
          } else if (Array.isArray(v)) display = v.join(", ");
          else display = (v as string) || "—";
          return (
            <button
              key={st.key}
              onClick={() => onEdit(st.key)}
              className="rounded-2xl border border-border bg-card p-4 text-left"
            >
              <div className="text-xs text-muted-foreground">{st.label}</div>
              <div className="mt-1 font-medium">{display}</div>
            </button>
          );
        })}
      </div>
      <div className="mt-4 flex gap-3">
        <button className={btnSecondary + " flex-1"} onClick={onBack} disabled={busy}>
          ← Retour
        </button>
        <button className={btnPrimary + " flex-[2]"} onClick={onSubmit} disabled={busy}>
          {busy ? "Envoi…" : "Sauvegarder & Envoyer"}
        </button>
      </div>
    </div>
  );
}

// ---- Queue -----------------------------------------------------------------

function QueueScreen({
  queue,
  onBack,
  onRetry,
  onRemove,
  onRefresh,
  busy,
}: {
  queue: QueueEntry[];
  onBack: () => void;
  onRetry: (e: QueueEntry) => void;
  onRemove: (e: QueueEntry) => void;
  onRefresh: () => void;
  busy: boolean;
}) {
  return (
    <div className="flex flex-col gap-4 pt-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">File des réponses</h2>
        <button className={btnGhost} onClick={onRefresh}>
          Actualiser
        </button>
      </div>

      {queue.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Aucune réponse enregistrée pour l'instant.
        </div>
      )}

      {queue.map((e) => {
        const nat = s(e.answers, "nationalite");
        const sex = s(e.answers, "sexe");
        const univ = s(e.answers, "etablissement");
        const created = new Date(e.created_at).toLocaleString();
        return (
          <div
            key={e.id}
            className={`rounded-2xl border p-4 ${
              e.submitted ? "border-border bg-card" : "border-destructive/40 bg-destructive/5"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">
                {e.submitted ? "Envoyée" : "En attente"}
              </div>
              <div className="text-xs text-muted-foreground">{created}</div>
            </div>
            <div className="mt-1 text-sm">
              {sex || "—"} · {nat || "—"} · {univ || "—"}
            </div>
            {e.last_error && (
              <div className="mt-2 text-xs text-destructive">Dernier échec : {e.last_error}</div>
            )}
            <div className="mt-3 flex gap-2">
              {!e.submitted && (
                <button
                  className={btnPrimary + " h-11 flex-1 rounded-xl px-4 text-sm"}
                  disabled={busy}
                  onClick={() => onRetry(e)}
                >
                  Réessayer l'envoi
                </button>
              )}
              {e.submitted && (
                <button
                  className={btnSecondary + " h-11 flex-1 rounded-xl px-4 text-sm"}
                  disabled={busy}
                  onClick={() => onRetry(e)}
                >
                  Renvoyer
                </button>
              )}
              <button
                className={btnGhost + " h-11 rounded-xl border border-border px-4"}
                onClick={() => onRemove(e)}
              >
                Supprimer
              </button>
            </div>
          </div>
        );
      })}

      <button className={btnSecondary + " w-full"} onClick={onBack}>
        ← Accueil
      </button>
    </div>
  );
}
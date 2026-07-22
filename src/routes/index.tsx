import { createFileRoute } from "@tanstack/react-router";
import SurveyApp from "@/components/SurveyForm";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MINESUP Alumni — Collecte terrain" },
      {
        name: "description",
        content:
          "Outil mobile de collecte des champs obligatoires de l'enquête MINESUP sur le devenir des diplômés.",
      },
      { property: "og:title", content: "MINESUP Alumni — Collecte terrain" },
      {
        property: "og:description",
        content:
          "Collecte rapide sur mobile des réponses à l'enquête MINESUP, avec file d'attente et envoi au formulaire officiel.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

function Index() {
  return <SurveyApp />;
}

import { Metadata } from "next";
import GameGuide from "./GameGuide";

export const metadata: Metadata = {
  title: "Game Guide | Battle Nads",
  description: "Complete guide to Battle Nads - Learn about heroes, combat, abilities, and dungeon exploration",
};

export default function GuidePage() {
  return <GameGuide />;
}
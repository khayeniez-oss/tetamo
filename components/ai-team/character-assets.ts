export const AI_TEAM_CHARACTER_ASSETS = {
  jake: "/ai-team/characters/jake.png",
  mona: "/ai-team/characters/mona.png",
  rupert: "/ai-team/characters/rupert.png",
  randolph: "/ai-team/characters/randolph.png",
  lola: "/ai-team/characters/lola.png",
  uncle_sam: "/ai-team/characters/uncle-sam.png",
} as const;

export type AICharacterKey =
  keyof typeof AI_TEAM_CHARACTER_ASSETS;

export function getAICharacterPortrait(
  agentKey: AICharacterKey
) {
  return AI_TEAM_CHARACTER_ASSETS[agentKey];
}
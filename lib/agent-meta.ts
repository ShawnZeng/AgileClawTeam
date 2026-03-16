/** Single source of truth for agent display metadata. */
export const AGENT_META: Record<string, { name: string; emoji: string }> = {
  po: { name: "Product Owner", emoji: "🙎" },
  sm: { name: "Scrum Master", emoji: "🧑‍💼" },
};

export function agentEmoji(agentId: string): string {
  return AGENT_META[agentId]?.emoji ?? "🤖";
}

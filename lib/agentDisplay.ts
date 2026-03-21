export const ROLE_ABBR: Record<string, string> = {
  po: "PO",
  sm: "SM",
  developer: "DEV",
  designer: "DES",
  tester: "TES",
};

/** Returns "Rex(SM)" display format */
export function formatAgentLabel(
  id: string,
  role: string,
  displayNames: Record<string, string>,
): string {
  const name = displayNames[id] ?? id;
  const abbr = ROLE_ABBR[role] ?? role.toUpperCase();
  return `${name}(${abbr})`;
}

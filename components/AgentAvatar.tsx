import type { AgentRole } from "@/lib/types";

type PixelRect = {
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
  rx?: number;
  opacity?: number;
};

function PixelRects({ rects }: { rects: PixelRect[] }) {
  return (
    <>
      {rects.map((rect, index) => (
        <rect
          key={`${rect.x}-${rect.y}-${index}`}
          x={rect.x}
          y={rect.y}
          width={rect.width}
          height={rect.height}
          rx={rect.rx}
          fill={rect.fill}
          fillOpacity={rect.opacity}
        />
      ))}
    </>
  );
}

function baseLobster(bg: string): PixelRect[] {
  return [
    { x: 0, y: 0, width: 64, height: 64, rx: 12, fill: bg },
    { x: 20, y: 4, width: 2, height: 10, fill: "#7c2d12" },
    { x: 42, y: 4, width: 2, height: 10, fill: "#7c2d12" },
    { x: 16, y: 12, width: 8, height: 4, fill: "#7c2d12" },
    { x: 40, y: 12, width: 8, height: 4, fill: "#7c2d12" },
    { x: 14, y: 16, width: 8, height: 8, fill: "#fff7ed" },
    { x: 42, y: 16, width: 8, height: 8, fill: "#fff7ed" },
    { x: 16, y: 18, width: 4, height: 4, fill: "#111827" },
    { x: 44, y: 18, width: 4, height: 4, fill: "#111827" },
    { x: 8, y: 28, width: 10, height: 8, fill: "#dc2626" },
    { x: 12, y: 24, width: 10, height: 4, fill: "#fb923c" },
    { x: 10, y: 36, width: 8, height: 4, fill: "#7c2d12" },
    { x: 46, y: 28, width: 10, height: 8, fill: "#dc2626" },
    { x: 42, y: 24, width: 10, height: 4, fill: "#fb923c" },
    { x: 46, y: 36, width: 8, height: 4, fill: "#7c2d12" },
    { x: 20, y: 22, width: 24, height: 18, rx: 4, fill: "#dc2626" },
    { x: 24, y: 26, width: 16, height: 6, fill: "#fb923c" },
    { x: 20, y: 40, width: 24, height: 10, rx: 4, fill: "#fdba74" },
    { x: 26, y: 42, width: 12, height: 2, fill: "#7c2d12" },
    { x: 18, y: 48, width: 8, height: 8, fill: "#dc2626" },
    { x: 28, y: 50, width: 8, height: 8, fill: "#dc2626" },
    { x: 38, y: 48, width: 8, height: 8, fill: "#dc2626" },
    { x: 18, y: 56, width: 8, height: 4, fill: "#7c2d12" },
    { x: 28, y: 58, width: 8, height: 4, fill: "#7c2d12" },
    { x: 38, y: 56, width: 8, height: 4, fill: "#7c2d12" },
  ];
}

function roleBadge(role: AgentRole | string): PixelRect[] {
  const badgeBase = [
    { x: 46, y: 6, width: 12, height: 12, rx: 3, fill: "#f8fafc" },
    { x: 48, y: 8, width: 8, height: 8, fill: "#0f172a" },
  ];

  switch (role) {
    case "po":
      return [
        ...badgeBase,
        { x: 48, y: 10, width: 2, height: 4, fill: "#fbbf24" },
        { x: 51, y: 8, width: 2, height: 6, fill: "#fde047" },
        { x: 54, y: 10, width: 2, height: 4, fill: "#fbbf24" },
        { x: 48, y: 14, width: 8, height: 2, fill: "#d97706" },
      ];
    case "sm":
      return [
        ...badgeBase,
        { x: 49, y: 10, width: 6, height: 2, fill: "#60a5fa" },
        { x: 49, y: 13, width: 6, height: 1, fill: "#60a5fa" },
      ];
    case "designer":
      return [
        ...badgeBase,
        { x: 49, y: 10, width: 2, height: 5, fill: "#fb7185" },
        { x: 51, y: 12, width: 2, height: 3, fill: "#34d399" },
        { x: 53, y: 9, width: 2, height: 6, fill: "#fbbf24" },
      ];
    case "developer":
      return [
        ...badgeBase,
        { x: 49, y: 11, width: 2, height: 2, fill: "#67e8f9" },
        { x: 51, y: 9, width: 1, height: 6, fill: "#67e8f9" },
        { x: 53, y: 11, width: 2, height: 2, fill: "#67e8f9" },
      ];
    case "tester":
      return [
        ...badgeBase,
        { x: 49, y: 12, width: 2, height: 2, fill: "#86efac" },
        { x: 51, y: 14, width: 2, height: 1, fill: "#86efac" },
        { x: 53, y: 10, width: 2, height: 5, fill: "#86efac" },
      ];
    default:
      return badgeBase;
  }
}

function roleAccent(role: AgentRole | string): PixelRect[] {
  switch (role) {
    case "po":
      return [
        { x: 24, y: 4, width: 4, height: 8, fill: "#fbbf24" },
        { x: 30, y: 2, width: 4, height: 10, fill: "#fde047" },
        { x: 36, y: 4, width: 4, height: 8, fill: "#fbbf24" },
      ];
    case "sm":
      return [
        { x: 24, y: 8, width: 16, height: 4, fill: "#60a5fa" },
        { x: 20, y: 12, width: 24, height: 2, fill: "#2563eb" },
      ];
    case "designer":
      return [
        { x: 22, y: 8, width: 16, height: 4, fill: "#fdba74" },
        { x: 34, y: 6, width: 10, height: 6, fill: "#fb923c" },
      ];
    case "developer":
      return [
        { x: 12, y: 24, width: 16, height: 2, fill: "#67e8f9" },
        { x: 12, y: 30, width: 16, height: 2, fill: "#67e8f9" },
        { x: 12, y: 24, width: 2, height: 8, fill: "#67e8f9" },
        { x: 26, y: 24, width: 2, height: 8, fill: "#67e8f9" },
        { x: 36, y: 24, width: 16, height: 2, fill: "#67e8f9" },
        { x: 36, y: 30, width: 16, height: 2, fill: "#67e8f9" },
        { x: 36, y: 24, width: 2, height: 8, fill: "#67e8f9" },
        { x: 50, y: 24, width: 2, height: 8, fill: "#67e8f9" },
        { x: 28, y: 26, width: 8, height: 2, fill: "#67e8f9" },
      ];
    case "tester":
      return [
        { x: 40, y: 22, width: 14, height: 2, fill: "#86efac" },
        { x: 40, y: 32, width: 14, height: 2, fill: "#86efac" },
        { x: 40, y: 22, width: 2, height: 12, fill: "#86efac" },
        { x: 52, y: 22, width: 2, height: 12, fill: "#86efac" },
        { x: 36, y: 26, width: 4, height: 2, fill: "#86efac" },
      ];
    default:
      return [];
  }
}

function getAvatarRects(role: AgentRole | string): PixelRect[] {
  switch (role) {
    case "po":
      return [
        ...baseLobster("#4c1d95"),
        ...roleAccent(role),
        ...roleBadge(role),
      ];
    case "sm":
      return [
        ...baseLobster("#1e3a8a"),
        ...roleAccent(role),
        ...roleBadge(role),
      ];
    case "developer":
      return [
        ...baseLobster("#14532d"),
        ...roleAccent(role),
        ...roleBadge(role),
      ];
    case "designer":
      return [
        ...baseLobster("#92400e"),
        ...roleAccent(role),
        ...roleBadge(role),
      ];
    case "tester":
      return [
        ...baseLobster("#7f1d1d"),
        ...roleAccent(role),
        ...roleBadge(role),
      ];
    default:
      return [...baseLobster("#374151"), ...roleBadge(role)];
  }
}

export function AgentAvatar({
  agentId: _agentId,
  role,
  size = 56,
}: {
  agentId: string;
  role: AgentRole | string;
  size?: number;
}) {
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      fill="none"
      shapeRendering="crispEdges"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <PixelRects rects={getAvatarRects(role)} />
    </svg>
  );
}

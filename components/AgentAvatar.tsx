import type { AgentRole } from "@/lib/types";

export function AgentAvatar({
  agentId: _agentId,
  role,
  size = 56,
}: {
  agentId: string;
  role: AgentRole | string;
  size?: number;
}) {
  // Pixel-art avatars — all coords on 4-unit grid (effective 16×16 sprite)
  const SKIN = "#fcd3a8";
  const MOUTH = "#7c3528";
  const BLUSH = "#f9a8d4";
  const EYE = "#1e1b4b";

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
      {role === "po" && (
        <>
          {/* bg */}
          <rect x="0" y="0" width="64" height="64" rx="10" fill="#4c1d95" />
          {/* crown — three spikes */}
          <rect x="12" y="6" width="8" height="14" fill="#fbbf24" />
          <rect x="28" y="2" width="8" height="18" fill="#fbbf24" />
          <rect x="44" y="6" width="8" height="14" fill="#fbbf24" />
          <rect x="8" y="16" width="48" height="8" fill="#d97706" />
          {/* crown gems */}
          <rect x="14" y="17" width="4" height="4" fill="#fb7185" />
          <rect x="30" y="16" width="4" height="6" fill="#e879f9" />
          <rect x="46" y="17" width="4" height="4" fill="#34d399" />
          {/* face */}
          <rect x="8" y="22" width="48" height="36" rx="4" fill={SKIN} />
          {/* left ear */}
          <rect x="4" y="28" width="4" height="10" fill={SKIN} />
          {/* right ear */}
          <rect x="56" y="28" width="4" height="10" fill={SKIN} />
          {/* left eye */}
          <rect x="16" y="30" width="8" height="8" fill={EYE} />
          <rect x="16" y="30" width="4" height="4" fill="white" />
          {/* right eye */}
          <rect x="40" y="30" width="8" height="8" fill={EYE} />
          <rect x="40" y="30" width="4" height="4" fill="white" />
          {/* blush */}
          <rect
            x="8"
            y="38"
            width="8"
            height="4"
            fill={BLUSH}
            fillOpacity="0.7"
          />
          <rect
            x="48"
            y="38"
            width="8"
            height="4"
            fill={BLUSH}
            fillOpacity="0.7"
          />
          {/* smile */}
          <rect x="20" y="46" width="4" height="4" fill={MOUTH} />
          <rect x="24" y="50" width="16" height="4" fill={MOUTH} />
          <rect x="40" y="46" width="4" height="4" fill={MOUTH} />
        </>
      )}

      {role === "sm" && (
        <>
          {/* bg */}
          <rect x="0" y="0" width="64" height="64" rx="10" fill="#1e3a8a" />
          {/* baseball cap dome */}
          <rect x="10" y="4" width="44" height="24" rx="8" fill="#2563eb" />
          {/* cap brim */}
          <rect x="4" y="24" width="56" height="8" rx="2" fill="#1d4ed8" />
          {/* cap vent button */}
          <rect x="28" y="4" width="8" height="4" fill="#93c5fd" />
          {/* clipboard */}
          <rect x="46" y="2" width="14" height="16" rx="2" fill="#bfdbfe" />
          <rect x="50" y="6" width="8" height="2" fill="#1e3a8a" />
          <rect x="50" y="10" width="8" height="2" fill="#1e3a8a" />
          <rect x="50" y="14" width="6" height="2" fill="#1e3a8a" />
          <rect x="52" y="2" width="4" height="4" rx="1" fill="#3b82f6" />
          {/* face */}
          <rect x="8" y="28" width="48" height="32" rx="4" fill={SKIN} />
          {/* left ear */}
          <rect x="4" y="34" width="4" height="10" fill={SKIN} />
          {/* right ear */}
          <rect x="56" y="34" width="4" height="10" fill={SKIN} />
          {/* left eye */}
          <rect x="16" y="34" width="8" height="6" fill={EYE} />
          <rect x="16" y="34" width="4" height="4" fill="white" />
          {/* right eye */}
          <rect x="40" y="34" width="8" height="6" fill={EYE} />
          <rect x="40" y="34" width="4" height="4" fill="white" />
          {/* blush */}
          <rect
            x="8"
            y="42"
            width="8"
            height="4"
            fill={BLUSH}
            fillOpacity="0.55"
          />
          <rect
            x="48"
            y="42"
            width="8"
            height="4"
            fill={BLUSH}
            fillOpacity="0.55"
          />
          {/* smile */}
          <rect x="20" y="50" width="4" height="4" fill={MOUTH} />
          <rect x="24" y="54" width="16" height="4" fill={MOUTH} />
          <rect x="40" y="50" width="4" height="4" fill={MOUTH} />
        </>
      )}

      {role === "developer" && (
        <>
          {/* bg */}
          <rect x="0" y="0" width="64" height="64" rx="10" fill="#052e16" />
          {/* dark hair */}
          <rect x="8" y="4" width="48" height="20" rx="6" fill="#1f2937" />
          {/* face */}
          <rect x="8" y="20" width="48" height="38" rx="4" fill={SKIN} />
          {/* left ear */}
          <rect x="4" y="26" width="4" height="10" fill={SKIN} />
          {/* right ear */}
          <rect x="56" y="26" width="4" height="10" fill={SKIN} />
          {/* purple glasses — left frame */}
          <rect x="10" y="28" width="18" height="2" fill="#a78bfa" />
          <rect x="10" y="38" width="18" height="2" fill="#a78bfa" />
          <rect x="10" y="28" width="2" height="12" fill="#a78bfa" />
          <rect x="26" y="28" width="2" height="12" fill="#a78bfa" />
          {/* glasses bridge */}
          <rect x="28" y="32" width="8" height="2" fill="#a78bfa" />
          {/* purple glasses — right frame */}
          <rect x="36" y="28" width="18" height="2" fill="#a78bfa" />
          <rect x="36" y="38" width="18" height="2" fill="#a78bfa" />
          <rect x="36" y="28" width="2" height="12" fill="#a78bfa" />
          <rect x="52" y="28" width="2" height="12" fill="#a78bfa" />
          {/* eyes inside glasses */}
          <rect x="14" y="30" width="8" height="8" fill={EYE} />
          <rect x="14" y="30" width="4" height="4" fill="white" />
          <rect x="40" y="30" width="8" height="8" fill={EYE} />
          <rect x="40" y="30" width="4" height="4" fill="white" />
          {/* blush */}
          <rect
            x="8"
            y="40"
            width="8"
            height="4"
            fill={BLUSH}
            fillOpacity="0.5"
          />
          <rect
            x="48"
            y="40"
            width="8"
            height="4"
            fill={BLUSH}
            fillOpacity="0.5"
          />
          {/* smirk */}
          <rect x="24" y="48" width="16" height="4" fill={MOUTH} />
          <rect x="40" y="44" width="4" height="4" fill={MOUTH} />
          {/* code `< >` deco */}
          <rect x="2" y="54" width="4" height="4" fill="#34d399" />
          <rect x="6" y="50" width="4" height="4" fill="#34d399" />
          <rect x="6" y="58" width="2" height="4" fill="#34d399" />
          <rect x="14" y="54" width="4" height="4" fill="#34d399" />
          <rect x="10" y="50" width="4" height="4" fill="#34d399" />
          <rect x="10" y="58" width="2" height="4" fill="#34d399" />
        </>
      )}

      {role === "designer" && (
        <>
          {/* bg */}
          <rect x="0" y="0" width="64" height="64" rx="10" fill="#78350f" />
          {/* beret base */}
          <rect x="8" y="8" width="44" height="16" rx="8" fill="#fb923c" />
          {/* beret puff tilted right */}
          <rect x="40" y="4" width="18" height="16" rx="8" fill="#f97316" />
          {/* beret center button */}
          <rect x="28" y="6" width="6" height="4" fill="#fed7aa" />
          {/* face */}
          <rect x="8" y="20" width="48" height="38" rx="4" fill={SKIN} />
          {/* left ear */}
          <rect x="4" y="26" width="4" height="10" fill={SKIN} />
          {/* right ear */}
          <rect x="56" y="26" width="4" height="10" fill={SKIN} />
          {/* left eye */}
          <rect x="16" y="30" width="8" height="8" fill="#92400e" />
          <rect x="16" y="30" width="4" height="4" fill="white" />
          {/* right eye */}
          <rect x="40" y="30" width="8" height="8" fill="#92400e" />
          <rect x="40" y="30" width="4" height="4" fill="white" />
          {/* eyelashes — left */}
          <rect x="14" y="28" width="2" height="4" fill="#92400e" />
          <rect x="18" y="27" width="2" height="3" fill="#92400e" />
          <rect x="22" y="28" width="2" height="3" fill="#92400e" />
          {/* eyelashes — right */}
          <rect x="40" y="28" width="2" height="3" fill="#92400e" />
          <rect x="44" y="27" width="2" height="3" fill="#92400e" />
          <rect x="48" y="28" width="2" height="4" fill="#92400e" />
          {/* blush */}
          <rect
            x="8"
            y="38"
            width="8"
            height="4"
            fill={BLUSH}
            fillOpacity="0.7"
          />
          <rect
            x="48"
            y="38"
            width="8"
            height="4"
            fill={BLUSH}
            fillOpacity="0.7"
          />
          {/* smile */}
          <rect x="20" y="46" width="4" height="4" fill={MOUTH} />
          <rect x="24" y="50" width="16" height="4" fill={MOUTH} />
          <rect x="40" y="46" width="4" height="4" fill={MOUTH} />
          {/* palette accent */}
          <rect x="2" y="50" width="14" height="12" rx="2" fill="#fde68a" />
          <rect x="4" y="52" width="4" height="4" fill="#fb7185" />
          <rect x="10" y="52" width="4" height="4" fill="#34d399" />
          <rect x="4" y="58" width="4" height="2" fill="#60a5fa" />
          <rect x="10" y="58" width="4" height="2" fill="#fbbf24" />
        </>
      )}

      {role === "tester" && (
        <>
          {/* bg */}
          <rect x="0" y="0" width="64" height="64" rx="10" fill="#7f1d1d" />
          {/* spiky hair */}
          <rect x="8" y="10" width="48" height="14" fill="#b45309" />
          <rect x="10" y="4" width="8" height="14" fill="#b45309" />
          <rect x="22" y="2" width="8" height="16" fill="#c05621" />
          <rect x="34" y="4" width="8" height="14" fill="#b45309" />
          <rect x="46" y="6" width="8" height="12" fill="#c05621" />
          {/* face */}
          <rect x="8" y="18" width="48" height="40" rx="4" fill={SKIN} />
          {/* left ear */}
          <rect x="4" y="26" width="4" height="10" fill={SKIN} />
          {/* right ear */}
          <rect x="56" y="26" width="4" height="10" fill={SKIN} />
          {/* fierce eyebrows */}
          <rect x="14" y="26" width="12" height="4" fill="#92400e" />
          <rect x="38" y="26" width="12" height="4" fill="#92400e" />
          {/* eyes */}
          <rect x="16" y="30" width="8" height="8" fill="#7f1d1d" />
          <rect x="16" y="30" width="4" height="4" fill="white" />
          <rect x="40" y="30" width="8" height="8" fill="#7f1d1d" />
          <rect x="40" y="30" width="4" height="4" fill="white" />
          {/* blush */}
          <rect
            x="8"
            y="40"
            width="8"
            height="4"
            fill={BLUSH}
            fillOpacity="0.6"
          />
          <rect
            x="48"
            y="40"
            width="8"
            height="4"
            fill={BLUSH}
            fillOpacity="0.6"
          />
          {/* smirk */}
          <rect x="26" y="48" width="12" height="4" fill={MOUTH} />
          <rect x="38" y="44" width="4" height="4" fill={MOUTH} />
          {/* magnifying glass accent */}
          <rect x="46" y="48" width="12" height="2" fill="#fca5a5" />
          <rect x="46" y="58" width="12" height="2" fill="#fca5a5" />
          <rect x="46" y="48" width="2" height="12" fill="#fca5a5" />
          <rect x="56" y="48" width="2" height="12" fill="#fca5a5" />
          <rect x="58" y="58" width="2" height="4" fill="#fca5a5" />
          <rect x="60" y="60" width="4" height="2" fill="#fca5a5" />
        </>
      )}

      {/* fallback for unknown roles */}
      {role !== "po" &&
        role !== "sm" &&
        role !== "developer" &&
        role !== "designer" &&
        role !== "tester" && (
          <>
            <rect x="0" y="0" width="64" height="64" rx="10" fill="#374151" />
            <rect x="12" y="12" width="40" height="40" rx="8" fill="#6b7280" />
          </>
        )}
    </svg>
  );
}

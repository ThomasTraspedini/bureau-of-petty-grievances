interface CivicSealProps {
  initial: string;
  accent?: string;
  color?: string;
  fontFamily?: string;
}

export function civicSealDataUri({
  initial,
  accent = "#ef9c72",
  color = "#132d56",
}: {
  initial: string;
  accent?: string;
  color?: string;
}) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><circle cx="24" cy="24" r="22.5" fill="none" stroke="${escapeXml(color)}" stroke-width="1.15"/><circle cx="24" cy="24" r="18.25" fill="none" stroke="${escapeXml(color)}" stroke-width="0.75" opacity="0.72"/><path d="M24 1.5v4M24 42.5v4M1.5 24h4M42.5 24h4" fill="none" stroke="${escapeXml(color)}" stroke-width="1.15"/><circle cx="24" cy="13.75" r="2.25" fill="${escapeXml(accent)}"/><circle cx="24" cy="34.25" r="2.25" fill="${escapeXml(accent)}"/><text x="24" y="28" fill="${escapeXml(color)}" font-family="Georgia,serif" font-size="11.25" font-weight="700" letter-spacing="1.1" text-anchor="middle">${escapeXml(initial)}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function CivicSeal({
  initial,
  accent = "var(--apricot)",
  color,
  fontFamily = "var(--serif)",
}: CivicSealProps) {
  return (
    <svg
      aria-hidden="true"
      className="civic-seal"
      viewBox="0 0 48 48"
      focusable="false"
      width="100%"
      height="100%"
      style={color ? { color } : undefined}
    >
      <circle
        cx="24"
        cy="24"
        r="22.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.15"
      />
      <circle
        cx="24"
        cy="24"
        r="18.25"
        fill="none"
        stroke="currentColor"
        strokeWidth="0.75"
        opacity="0.72"
      />
      <path
        d="M24 1.5v4M24 42.5v4M1.5 24h4M42.5 24h4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.15"
      />
      <circle
        className="civic-seal-dot"
        cx="24"
        cy="13.75"
        r="2.25"
        fill={accent}
      />
      <circle
        className="civic-seal-dot"
        cx="24"
        cy="34.25"
        r="2.25"
        fill={accent}
      />
      <text
        x="24"
        y="28"
        fill="currentColor"
        fontFamily={fontFamily}
        fontSize="11.25"
        fontWeight="700"
        letterSpacing="1.1"
        textAnchor="middle"
      >
        {initial}
      </text>
    </svg>
  );
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

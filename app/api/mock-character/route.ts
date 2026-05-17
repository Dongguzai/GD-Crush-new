export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const theme = searchParams.get("theme") ?? "sunny_campus";
  const asset = searchParams.get("asset") ?? "portrait";
  const palette =
    theme === "dream_otome"
      ? ["#ffe8f4", "#d8659b", "#6c315f"]
      : theme === "city_healing"
        ? ["#e9fbf6", "#4fbf9f", "#2f5f5a"]
        : ["#fff2bd", "#f36f8f", "#4b3650"];
  const blush = asset === "shy" ? "#ff9ab1" : asset === "happy" ? "#f36f8f" : "#d67b8f";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="840" viewBox="0 0 640 840">
    <defs>
      <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
        <stop offset="0" stop-color="${palette[0]}"/>
        <stop offset="1" stop-color="#ffffff"/>
      </linearGradient>
    </defs>
    <rect width="640" height="840" rx="48" fill="url(#bg)"/>
    <circle cx="320" cy="235" r="116" fill="#3e2f3f"/>
    <circle cx="320" cy="268" r="104" fill="#ffe0d3"/>
    <path d="M205 260c36-118 180-130 230-22 22-78-22-156-116-162-92-6-150 67-114 184z" fill="#3e2f3f"/>
    <circle cx="282" cy="276" r="11" fill="#2b2130"/>
    <circle cx="358" cy="276" r="11" fill="#2b2130"/>
    <path d="M292 328c22 18 56 18 78 0" fill="none" stroke="${blush}" stroke-width="10" stroke-linecap="round"/>
    <circle cx="248" cy="316" r="18" fill="${blush}" opacity=".35"/>
    <circle cx="392" cy="316" r="18" fill="${blush}" opacity=".35"/>
    <path d="M165 770c21-179 78-291 155-291s134 112 155 291z" fill="${palette[1]}"/>
    <path d="M238 506c33 32 133 32 166 0l-21-42H259z" fill="#fff7f7" opacity=".9"/>
    <text x="320" y="720" text-anchor="middle" font-size="34" font-family="serif" fill="${palette[2]}">GD Crush</text>
  </svg>`;

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "no-store",
    },
  });
}

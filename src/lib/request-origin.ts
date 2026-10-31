// Next's internal URL may use localhost even when the browser uses 127.0.0.1,
// or a proxy may terminate HTTPS. Host is the browser-facing authority.
export function hasSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true; // Authenticated non-browser clients need no Origin.
  try {
    const parsed = new URL(origin);
    const host = request.headers.get("host") ?? new URL(request.url).host;
    return (
      origin === parsed.origin &&
      ["http:", "https:"].includes(parsed.protocol) &&
      parsed.host === host
    );
  } catch {
    return false;
  }
}

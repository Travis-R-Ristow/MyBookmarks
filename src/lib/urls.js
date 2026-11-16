const WEB_PROTOCOLS = ["http:", "https:"];
const HIERARCHICAL_SCHEME = /^[a-z][a-z0-9+.-]*:\/\//i;
const OPAQUE_SCHEME = /^(javascript|mailto|data|about):/i;

export function isWebUrl(url) {
  if (!URL.canParse(url)) {
    return false;
  }
  return WEB_PROTOCOLS.includes(new URL(url).protocol);
}

export function coerceUrl(input) {
  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }
  const hasScheme = HIERARCHICAL_SCHEME.test(trimmed) || OPAQUE_SCHEME.test(trimmed);
  const candidate = hasScheme ? trimmed : `https://${trimmed}`;
  return URL.canParse(candidate) ? candidate : null;
}

export function normalizeUrl(url) {
  const trimmed = url.trim();
  if (!isWebUrl(trimmed)) {
    return trimmed;
  }
  const parsed = new URL(trimmed);
  const pathname = parsed.pathname.replace(/\/+$/, "");
  return `${parsed.protocol}//${parsed.host}${pathname}${parsed.search}${parsed.hash}`;
}

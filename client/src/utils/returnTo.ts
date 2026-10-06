const ALLOWED_APP_PATHS = [
  '/equipment',
  '/productiondesk',
  '/scheduler',
];

export function getSafeReturnTo(value: string | null): string | null {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return null;
  const hasControlCharacter = Array.from(value).some((character) => {
    const code = character.charCodeAt(0);
    return code <= 31 || code === 127;
  });
  if (value.includes('\\') || hasControlCharacter) return null;

  try {
    decodeURI(value);
    const parsed = new URL(value, window.location.origin);
    if (parsed.origin !== window.location.origin) return null;

    const isAllowed = ALLOWED_APP_PATHS.some(
      (path) =>
        parsed.pathname === path || parsed.pathname.startsWith(`${path}/`),
    );
    if (!isAllowed) return null;

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }
}

export function getPostLoginDestination(
  returnTo: string | null,
  schedulerFallback: string,
): string {
  return getSafeReturnTo(returnTo) ?? schedulerFallback;
}

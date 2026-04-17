const SECOND_LEVEL_SUFFIXES = new Set(['co', 'com', 'net', 'org', 'gov', 'edu']);

function isIPv4(host: string): boolean {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(host);
}

function parseUrl(url: string): URL | null {
  if (!url) {
    return null;
  }

  try {
    return new URL(url);
  } catch {
    return null;
  }
}

export function getHostname(url: string): string {
  const parsed = parseUrl(url);
  if (!parsed) {
    return 'unknown';
  }

  return parsed.hostname.toLowerCase();
}

export function getMainDomain(url: string): string {
  const parsed = parseUrl(url);

  if (!parsed) {
    return 'unknown';
  }

  const hostname = parsed.hostname.toLowerCase();

  if (!hostname) {
    return parsed.protocol.replace(':', '') || 'unknown';
  }

  if (hostname === 'localhost' || isIPv4(hostname)) {
    return hostname;
  }

  const host = hostname.startsWith('www.') ? hostname.slice(4) : hostname;
  const parts = host.split('.').filter(Boolean);

  if (parts.length <= 2) {
    return parts.join('.');
  }

  const last = parts[parts.length - 1];
  const secondLast = parts[parts.length - 2];

  if (last.length === 2 && SECOND_LEVEL_SUFFIXES.has(secondLast)) {
    return parts.slice(-3).join('.');
  }

  return parts.slice(-2).join('.');
}

export function formatDomainName(domain: string): string {
  if (domain === 'unknown') {
    return '未知来源';
  }

  const [name] = domain.split('.');
  if (!name) {
    return domain;
  }

  return `${name.charAt(0).toUpperCase()}${name.slice(1)}`;
}

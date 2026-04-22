function isUnsafeHost(hostname: string) {
  return hostname === "0.0.0.0" || hostname === "::" || hostname === "[::]";
}

function getOriginFromHost(protocol: string, host: string | null) {
  if (!host) {
    return null;
  }

  return `${protocol}//${host}`;
}

function getSafeOrigin(value: string | null) {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);

    if (isUnsafeHost(url.hostname)) {
      return null;
    }

    return url.origin;
  } catch {
    return null;
  }
}

export function buildRequestRedirectUrl(request: Request, path: string) {
  const requestUrl = new URL(request.url);
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const protocol = forwardedProto ? `${forwardedProto}:` : requestUrl.protocol;
  const candidates = [
    request.headers.get("origin"),
    getOriginFromHost(protocol, request.headers.get("x-forwarded-host")),
    getOriginFromHost(protocol, request.headers.get("host")),
    requestUrl.origin,
  ];

  for (const candidate of candidates) {
    const origin = getSafeOrigin(candidate);

    if (origin) {
      return new URL(path, origin);
    }
  }

  return new URL(path, "http://localhost:8000");
}

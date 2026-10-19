// Vite fornece a base da publicação; no desenvolvimento local ela é "/".
const baseUrl = import.meta.env?.BASE_URL || '/';

export function assetUrl(path) {
  if (typeof path !== 'string' || !/^\/(images|data)\//.test(path)) return path;
  const prefix = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  return `${prefix}${path.slice(1)}`;
}

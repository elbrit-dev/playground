/**
 * Server-side ERP access shared by the routes under pages/api/erp.
 *
 * It lives in lib/ rather than beside those routes because every file under
 * pages/api becomes an endpoint - a helper module there would be served as a
 * route and fail. Keeping the credential resolution in one place also means
 * there is a single thing to fix when the env convention shifts again.
 */

import { getEndpoints, getTokens } from "./graphql-endpoints";

/** Turns Frappe's `_server_messages` / GraphQL errors into one readable line. */
export function readErpError(payload, status) {
  if (payload?._server_messages) {
    try {
      const messages = JSON.parse(payload._server_messages);
      const first = messages?.[0] ? JSON.parse(messages[0]) : null;
      if (first?.message) return String(first.message).replace(/<[^>]*>/g, "").trim();
    } catch {
      // Fall through to the GraphQL errors.
    }
  }

  if (payload?.errors?.length) {
    return payload.errors.map((error) => error.message).filter(Boolean).join("; ");
  }

  if (payload?.exc_type) return `ERP rejected the request (${payload.exc_type}).`;

  return payload?.message || `ERP request failed with HTTP ${status}`;
}

/**
 * Frappe wants `Authorization: token key:secret`. The env vars are written both
 * ways across environments, so the scheme is added when it is missing rather
 * than assumed either way.
 */
export function authHeader(token) {
  const value = String(token || "").trim();
  if (!value) return "";
  return /^(token|bearer|basic)\s/i.test(value) ? value : `token ${value}`;
}

/**
 * Reads env by computed name. Writing `process.env.NEXT_PUBLIC_X` directly gets
 * the value inlined into the build output, which would bake an ERP credential
 * into a chunk and make rotating it a rebuild; an index defeats that, the same
 * way graphql-endpoints does by walking process.env.
 */
function readEnv(name) {
  return process.env[name] || "";
}

/**
 * graphql-endpoints only matches the suffixed `NEXT_PUBLIC_GRAPHQL_ENDPOINT_{KEY}`
 * form, but the deployed env sets the bare `NEXT_PUBLIC_GRAPHQL_ENDPOINT` and
 * `NEXT_PUBLIC_GRAPHQL_AUTH_TOKEN`. Those are folded in here as the unnamed ("")
 * endpoint, so a single-ERP deployment needs no key at all.
 */
function discoverErp() {
  const endpoints = { ...getEndpoints() };
  const tokens = { ...getTokens() };

  const bareEndpoint = readEnv("NEXT_PUBLIC_GRAPHQL_ENDPOINT");
  const bareToken = readEnv("NEXT_PUBLIC_GRAPHQL_AUTH_TOKEN");
  if (!endpoints[""] && bareEndpoint) endpoints[""] = bareEndpoint;
  if (!tokens[""] && bareToken) tokens[""] = bareToken;

  return { endpoints, tokens };
}

/**
 * The endpoint key is the {KEY} half of NEXT_PUBLIC_GRAPHQL_ENDPOINT_{KEY}, but
 * a whole variable name is the obvious thing to paste into a field asking for
 * one - so the prefix is stripped instead of being rejected. Pasting the bare
 * variable name leaves nothing behind, which reads as "use the default".
 */
export function normalizeEndpointKey(key) {
  return String(key || "")
    .trim()
    .toUpperCase()
    .replace(/^NEXT_PUBLIC_GRAPHQL_(?:ENDPOINT|AUTH_TOKEN)_?/, "")
    .replace(/^_+|_+$/g, "");
}

/**
 * Resolves the ERP to talk to, from the same env convention the rest of the app
 * reads. `key` names one instance; without it, the default endpoint is used.
 * ERP_GRAPHQL_URL / ERP_GRAPHQL_TOKEN stay as a fallback for local setups.
 */
export function erpConfig(key) {
  const { endpoints, tokens } = discoverErp();
  // Read straight from the maps rather than through getEndpointConfig: the
  // unnamed endpoint's key is "", and that helper treats a falsy key as absent.
  const keys = Object.keys(endpoints).filter((name) => endpoints[name]);
  const pick = (name) => ({ endpointUrl: endpoints[name], authToken: authHeader(tokens[name]) });

  const wanted = normalizeEndpointKey(key);

  // A named key is never guessed at - hitting the wrong instance is exactly the
  // prod/UAT mixup that should be an error, not a silent fallback.
  if (wanted) {
    const match = keys.find((name) => name.toUpperCase() === wanted);
    if (!match) {
      const known = keys.filter(Boolean).join(", ") || "none (only an unnamed endpoint)";
      throw new Error(`"${key}" is not a configured ERP endpoint key. Configured keys: ${known}.`);
    }
    const named = pick(match);
    if (!named.authToken) throw new Error(`No NEXT_PUBLIC_GRAPHQL_AUTH_TOKEN_${match} is set.`);
    return named;
  }

  const preferred = readEnv("NEXT_PUBLIC_GRAPHQL_DEFAULT_ENDPOINT");
  const chosen = preferred && endpoints[preferred] ? preferred : keys[0];
  if (chosen !== undefined) {
    const config = pick(chosen);
    if (config.endpointUrl && config.authToken) return config;
  }

  const endpointUrl = readEnv("ERP_GRAPHQL_URL");
  const authToken = authHeader(readEnv("ERP_GRAPHQL_TOKEN"));
  if (!endpointUrl || !authToken) {
    throw new Error(
      "No ERP endpoint is configured. Set NEXT_PUBLIC_GRAPHQL_ENDPOINT_{KEY} with NEXT_PUBLIC_GRAPHQL_AUTH_TOKEN_{KEY}, or ERP_GRAPHQL_URL with ERP_GRAPHQL_TOKEN."
    );
  }
  return { endpointUrl, authToken };
}

/** Frappe returns `/files/…`; the browser needs the ERP origin in front of it. */
export function absoluteFileUrl(fileUrl, endpointUrl) {
  if (!fileUrl) return "";
  if (/^https?:\/\//i.test(fileUrl)) return fileUrl;
  try {
    return new URL(fileUrl, new URL(endpointUrl).origin).toString();
  } catch {
    return fileUrl;
  }
}

export async function runGraphQL(query, variables, { endpointUrl, authToken }) {
  const response = await fetch(endpointUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: authToken },
    body: JSON.stringify({ query, variables }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.errors?.length || payload.exc_type) {
    throw new Error(readErpError(payload, response.status));
  }
  return payload.data;
}

/**
 * Blocks a write posted from another site. This is NOT a substitute for checking
 * who is asking: the routes still take their target on trust, so anyone who can
 * load the app can act on any employee. Closing that needs a verified session
 * (a Firebase ID token checked server-side, with the target read from the token
 * rather than the request).
 */
export function isSameOrigin(req) {
  const source = req.headers.origin || req.headers.referer;
  if (!source) return true; // Same-origin fetches may send neither header.

  const host = req.headers.host;
  if (!host) return false;

  try {
    return new URL(source).host === host;
  } catch {
    return false;
  }
}

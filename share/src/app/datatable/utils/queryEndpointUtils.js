import { getEndpointConfigFromUrlKey, getInitialEndpoint } from '@/app/graphql-playground/constants';

export function getEndpointAndAuth(queryDocument) {
  let endpointUrl;
  let authToken;

  if (queryDocument?.urlKey) {
    const config = getEndpointConfigFromUrlKey(queryDocument.urlKey);
    endpointUrl = config.endpointUrl;
    authToken = config.authToken;
  }
  if (!endpointUrl) {
    const defaultEndpoint = getInitialEndpoint();
    if (defaultEndpoint) {
      const config = getEndpointConfigFromUrlKey(defaultEndpoint.name);
      endpointUrl = config.endpointUrl || defaultEndpoint.code;
      authToken = config.authToken ?? null;
    }
  }
  return { endpointUrl, authToken };
}

/**
 * Same as getEndpointAndAuth, but when graphqlToken is a non-empty string (after trim),
 * use it as Authorization instead of env/urlKey-derived token.
 * @param {object|null|undefined} queryDocument
 * @param {string|null|undefined} graphqlToken
 * @returns {{ endpointUrl: string|null|undefined, authToken: string|null|undefined }}
 */
export function getEndpointAndAuthWithTokenOverride(queryDocument, graphqlToken) {
  const base = getEndpointAndAuth(queryDocument);
  const trimmed = graphqlToken != null && typeof graphqlToken === 'string' ? graphqlToken.trim() : '';
  if (trimmed) {
    return { ...base, authToken: trimmed };
  }
  return base;
}

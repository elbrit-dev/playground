// GraphQL Endpoint Configuration
export const GRAPHQL_ENDPOINTS = {
  UAT: process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT_UAT || 'https://uat.elbrit.org/api/method/graphql',
  ERP: process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT_ERP || 'https://erp.elbrit.org/api/method/graphql',
};

// Firestore Collections
export const FIRESTORE_COLLECTIONS = {
  GQL: 'gql',
};

// Query Types
export const QUERY_TYPES = {
  QUERY: 'Query',
  MUTATION: 'Mutation',
  SUBSCRIPTION: 'Subscription',
};

// Monaco Editor Configuration
export const MONACO_EDITOR_CDN_URL = process.env.NEXT_PUBLIC_MONACO_EDITOR_CDN_URL || 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min';

// Default Auth Token
export const DEFAULT_AUTH_TOKEN = process.env.NEXT_PUBLIC_GRAPHQL_AUTH_TOKEN || '';

// Get initial endpoint configuration
export const getInitialEndpoint = () => {
  const uatUrl = GRAPHQL_ENDPOINTS.UAT;
  const erpUrl = GRAPHQL_ENDPOINTS.ERP;

  // Prefer UAT if available, otherwise use ERP
  if (uatUrl) {
    return { name: 'UAT', code: uatUrl };
  }
  if (erpUrl) {
    return { name: 'ERP', code: erpUrl };
  }
  return null;
};

// Get endpoint options
export const getEndpointOptions = () => {
  const options = [];
  if (GRAPHQL_ENDPOINTS.UAT) {
    options.push({ name: 'UAT', code: GRAPHQL_ENDPOINTS.UAT });
  }
  if (GRAPHQL_ENDPOINTS.ERP) {
    options.push({ name: 'ERP', code: GRAPHQL_ENDPOINTS.ERP });
  }
  return options;
};


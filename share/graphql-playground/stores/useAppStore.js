import { create } from 'zustand';
import { getInitialEndpoint } from '../constants';

/**
 * Global application store for GraphQL Playground
 * Manages: auth token, endpoint selection, table mode, response data
 */
export const useAppStore = create((set, get) => ({
  // Auth token
  authToken: process.env.NEXT_PUBLIC_GRAPHQL_AUTH_TOKEN || '',
  setAuthToken: (token) => set({ authToken: token }),

  // Password visibility
  showPassword: false,
  setShowPassword: (show) => set({ showPassword: show }),
  toggleShowPassword: () => set((state) => ({ showPassword: !state.showPassword })),

  // Endpoint selection
  selectedEndpoint: getInitialEndpoint(),
  endpointUrl: getInitialEndpoint()?.code || '',
  setSelectedEndpoint: (endpoint) => {
    set({
      selectedEndpoint: endpoint,
      endpointUrl: endpoint?.code || '',
    });
  },

  // Table mode
  tableMode: false,
  setTableMode: (mode) => set({ tableMode: mode }),
  toggleTableMode: () => set((state) => ({ tableMode: !state.tableMode })),

  // Response data
  responseData: null,
  setResponseData: (data) => set({ responseData: data }),

  // Table dialog
  isTableDialogOpen: false,
  setIsTableDialogOpen: (open) => set({ isTableDialogOpen: open }),
}));


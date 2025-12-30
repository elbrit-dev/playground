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
      tabData: {}, // Reset all tabs when endpoint changes
      tableMode: false, // Reset table mode when endpoint changes
      isTableDialogOpen: false, // Close dialog when endpoint changes
    });
  },

  // Table mode
  tableMode: false,
  setTableMode: (mode) => set({ tableMode: mode }),
  toggleTableMode: () => set((state) => ({ tableMode: !state.tableMode })),

  // Table dialog
  isTableDialogOpen: false,
  setIsTableDialogOpen: (open) => set({ isTableDialogOpen: open }),

  // Query execution state per tab
  // Map of tabIndex -> { hasSuccessfulQuery: boolean, transformedData: object }
  tabData: {}, // { [tabIndex]: { hasSuccessfulQuery: boolean, transformedData: object | null } }
  setTabData: (tabIndex, data) => 
    set((state) => ({
      tabData: {
        ...state.tabData,
        [tabIndex]: {
          ...state.tabData[tabIndex],
          ...data,
        },
      },
    })),
  getTabData: (tabIndex) => {
    const state = get();
    return state.tabData[tabIndex] || { hasSuccessfulQuery: false, transformedData: null };
  },
}));


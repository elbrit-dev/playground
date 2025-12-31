import { create } from 'zustand';

/**
 * Table dialog store
 * Manages: active tab, selected flatten field, processed data
 * Note: transformerCode is now stored per-tab in useAppStore.tabData
 */
export const useTableDialogStore = create((set, get) => ({
  // Active tab index (for internal TableDialog tabs, not GraphiQL tabs)
  activeTab: 0,
  setActiveTab: (index) => set({ activeTab: index }),

  // Selected flatten field
  selectedFlattenField: null,
  setSelectedFlattenField: (field) => {
    set({ selectedFlattenField: field });
  },

  // Processed data
  processedData: null,
  setProcessedData: (data) => set({ processedData: data }),

  // Reset all state (but preserve selectedFlattenField for saving)
  reset: () => {
    set((state) => ({
      activeTab: 0,
      selectedFlattenField: state.selectedFlattenField, // Preserve the selected field
      processedData: null,
    }));
  },
}));


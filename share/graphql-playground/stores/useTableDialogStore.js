import { create } from 'zustand';

/**
 * Table dialog store
 * Manages: active tab, selected flatten field, processed data
 */
export const useTableDialogStore = create((set, get) => ({
  // Active tab index
  activeTab: 0,
  setActiveTab: (index) => set({ activeTab: index }),

  // Selected flatten field
  selectedFlattenField: null,
  setSelectedFlattenField: (field) => {
    console.log('[useTableDialogStore] setSelectedFlattenField called:', field);
    set({ selectedFlattenField: field });
    console.log('[useTableDialogStore] selectedFlattenField updated to:', field);
  },

  // Processed data
  processedData: null,
  setProcessedData: (data) => set({ processedData: data }),

  // Reset all state (but preserve selectedFlattenField for saving)
  reset: () => {
    console.log('[useTableDialogStore] reset called - preserving selectedFlattenField, clearing activeTab and processedData');
    set((state) => ({
      activeTab: 0,
      selectedFlattenField: state.selectedFlattenField, // Preserve the selected field
      processedData: null,
    }));
  },
}));


import { create } from 'zustand';

export const useCityStore = create((set) => ({
  selectedCity: null,
  setCity: (city) => set({ selectedCity: city }),
  clearCity: () => set({ selectedCity: null }),
}));

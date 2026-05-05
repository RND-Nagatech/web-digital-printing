import { create } from 'zustand';
import type { Material, MataAyamOption, Order } from '@/types';

export type SubmitStatus = 'idle' | 'submitting' | 'success' | 'error';

interface OrderState {
  selectedMaterial?: Material;
  selectedOption?: MataAyamOption;
  panjang: number;
  lebar: number;
  quantity: number;
  designFile?: File;
  proofFile?: File;
  submitStatus: SubmitStatus;
  errorMessage?: string;
  lastOrder?: Order;

  setMaterial: (m?: Material) => void;
  setOption: (o?: MataAyamOption) => void;
  setSize: (p: number, l: number) => void;
  setQuantity: (q: number) => void;
  setDesignFile: (f?: File) => void;
  setProofFile: (f?: File) => void;
  setSubmitStatus: (s: SubmitStatus, error?: string) => void;
  setLastOrder: (o?: Order) => void;
  reset: () => void;
}

export const useOrderStore = create<OrderState>((set) => ({
  panjang: 0,
  lebar: 0,
  quantity: 1,
  submitStatus: 'idle',
  setMaterial: (selectedMaterial) => set({ selectedMaterial }),
  setOption: (selectedOption) => set({ selectedOption }),
  setSize: (panjang, lebar) => set({ panjang, lebar }),
  setQuantity: (quantity) => set({ quantity }),
  setDesignFile: (designFile) => set({ designFile }),
  setProofFile: (proofFile) => set({ proofFile }),
  setSubmitStatus: (submitStatus, errorMessage) => set({ submitStatus, errorMessage }),
  setLastOrder: (lastOrder) => set({ lastOrder }),
  reset: () =>
    set({
      selectedMaterial: undefined,
      selectedOption: undefined,
      panjang: 0,
      lebar: 0,
      quantity: 1,
      designFile: undefined,
      proofFile: undefined,
      submitStatus: 'idle',
      errorMessage: undefined,
      lastOrder: undefined,
    }),
}));

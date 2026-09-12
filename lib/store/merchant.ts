/**
 * Merchant session store: auth session, merchant profile and platform settings.
 * One place the whole merchant app reads from, refreshed on auth changes.
 */

import type { Session } from '@biltme/backend';
import { create } from 'zustand';

import { bilt } from '@/lib/bilt';
import {
  fetchMerchant,
  fetchSettings,
  type Merchant,
  type PlatformSettings,
} from '@/lib/payments/api';

type MerchantState = {
  session: Session | null;
  merchant: Merchant | null;
  settings: PlatformSettings | null;
  ready: boolean;
  loadingProfile: boolean;
  error: string | null;
  setSession: (session: Session | null) => void;
  setMerchant: (merchant: Merchant | null) => void;
  setSettings: (settings: PlatformSettings | null) => void;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

export const useMerchantStore = create<MerchantState>((set, get) => ({
  session: null,
  merchant: null,
  settings: null,
  ready: false,
  loadingProfile: false,
  error: null,

  setSession: (session) => set({ session }),
  setMerchant: (merchant) => set({ merchant }),
  setSettings: (settings) => set({ settings }),

  refreshProfile: async () => {
    if (!get().session) {
      set({ merchant: null, settings: null, loadingProfile: false });
      return;
    }
    set({ loadingProfile: true });
    try {
      const [merchant, settings] = await Promise.all([fetchMerchant(), fetchSettings()]);
      set({ merchant, settings, error: null });
    } catch (cause) {
      set({ error: cause instanceof Error ? cause.message : 'Could not load your account.' });
    } finally {
      set({ loadingProfile: false });
    }
  },

  signOut: async () => {
    await bilt.auth.signOut();
    set({ session: null, merchant: null });
  },
}));

/** Wire the store to auth. Call once from the root layout; returns a cleanup fn. */
export function initMerchantStore(): () => void {
  const store = useMerchantStore;

  void bilt.auth.getSession().then(({ data }) => {
    store.setState({ session: data.session ?? null, ready: true });
    void store.getState().refreshProfile();
  });

  const { data } = bilt.auth.onAuthStateChange((_event, session) => {
    const previousUser = store.getState().session?.user.id ?? null;
    store.setState({ session: session ?? null, ready: true });
    if ((session?.user.id ?? null) !== previousUser) {
      store.setState({ merchant: null });
      void store.getState().refreshProfile();
    }
  });

  return () => data.subscription.unsubscribe();
}

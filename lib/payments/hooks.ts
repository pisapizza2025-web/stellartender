/**
 * Polling hooks. bilt-cloud has no realtime socket, so both screens pull:
 * the merchant terminal reads its own session through RLS, the customer page
 * reads the anon-safe public view. Polling stops on a terminal status.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';

import { toPaymentError } from '@/lib/stellar/errors';

import {
  fetchPublicSession,
  fetchSessionById,
  fetchTransactions,
  type PaymentSessionRow,
  type TransactionWithSession,
} from './api';
import { isTerminal, type PaymentStatus, type PublicSession } from './types';

const DEFAULT_INTERVAL = 2500;

type MerchantSessionState = {
  session: PaymentSessionRow | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

export function useMerchantSession(
  id: string | undefined,
  intervalMs = DEFAULT_INTERVAL,
): MerchantSessionState {
  const [session, setSession] = useState<PaymentSessionRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const statusRef = useRef<PaymentStatus | null>(null);

  const [prevId, setPrevId] = useState(id);
  if (id !== prevId) {
    setPrevId(id);
    setLoading(true);
  }

  const refresh = useCallback(async () => {
    if (!id) return;
    try {
      const row = await fetchSessionById(id);
      setSession(row);
      statusRef.current = row?.status ?? null;
      setError(null);
    } catch (cause) {
      setError(toPaymentError(cause).message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  useEffect(() => {
    if (!id) return undefined;
    let cancelled = false;

    const timer = setInterval(() => {
      if (cancelled) return;
      const status = statusRef.current;
      if (status && isTerminal(status)) return;
      void refresh();
    }, intervalMs);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [id, intervalMs, refresh]);

  return { session, loading, error, refresh };
}

type PublicSessionState = {
  session: PublicSession | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  setSession: (session: PublicSession) => void;
  /** Pause polling while the wallet flow is running. */
  setPaused: (paused: boolean) => void;
};

export function usePublicSession(
  token: string | undefined,
  intervalMs = DEFAULT_INTERVAL,
): PublicSessionState {
  const [session, setSession] = useState<PublicSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pausedRef = useRef(false);
  const statusRef = useRef<PaymentStatus | null>(null);

  const [prevToken, setPrevToken] = useState(token);
  if (token !== prevToken) {
    setPrevToken(token);
    setLoading(true);
  }

  const refresh = useCallback(async () => {
    if (!token) return;
    try {
      const next = await fetchPublicSession(token);
      setSession(next);
      statusRef.current = next.status;
      setError(null);
    } catch (cause) {
      setError(toPaymentError(cause).message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  useEffect(() => {
    if (!token) return undefined;
    let cancelled = false;

    const timer = setInterval(() => {
      if (cancelled || pausedRef.current) return;
      const status = statusRef.current;
      if (status && isTerminal(status)) return;
      void refresh();
    }, intervalMs);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [token, intervalMs, refresh]);

  const applySession = useCallback((next: PublicSession) => {
    statusRef.current = next.status;
    setSession(next);
  }, []);

  const setPaused = useCallback((paused: boolean) => {
    pausedRef.current = paused;
  }, []);

  return { session, loading, error, refresh, setSession: applySession, setPaused };
}

/** Live seconds-remaining ticker for an expiry timestamp. */
export function useCountdown(expiresAt: string | null | undefined, active: boolean): number {
  const [seconds, setSeconds] = useState(() => remaining(expiresAt));

  const [prevExpiresAt, setPrevExpiresAt] = useState(expiresAt);
  if (expiresAt !== prevExpiresAt) {
    setPrevExpiresAt(expiresAt);
    setSeconds(remaining(expiresAt));
  }

  useEffect(() => {
    if (!active || !expiresAt) return undefined;
    const timer = setInterval(() => setSeconds(remaining(expiresAt)), 1000);
    return () => clearInterval(timer);
  }, [expiresAt, active]);

  return seconds;
}

function remaining(expiresAt: string | null | undefined): number {
  if (!expiresAt) return 0;
  const target = new Date(expiresAt).getTime();
  if (Number.isNaN(target)) return 0;
  return Math.max(0, Math.round((target - Date.now()) / 1000));
}

type TransactionsState = {
  rows: TransactionWithSession[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

/** Settled transactions for the signed-in merchant, refreshed whenever the screen is focused. */
export function useTransactions(limit = 200): TransactionsState {
  const [rows, setRows] = useState<TransactionWithSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const data = await fetchTransactions(limit);
      setRows(data);
      setError(null);
    } catch (cause) {
      setError(toPaymentError(cause).message);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  return { rows, loading, error, refresh };
}

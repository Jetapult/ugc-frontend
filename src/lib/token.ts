'use client';

/**
 * Utility functions for managing auth token in browser localStorage + cookie.
 */

const STORAGE_KEY = 'auth_token';

export const getAuthToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(STORAGE_KEY);
};

export const setAuthToken = (token: string): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, token);
  // cookie for SSR / middleware usage – 30-day expiry
  document.cookie = `authToken=${token}; path=/; max-age=${30 * 24 * 60 * 60}; SameSite=Strict$${
    process.env.NODE_ENV === 'production' ? '; Secure' : ''
  }`;
};

export const removeAuthToken = (): void => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
  document.cookie = 'authToken=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
};

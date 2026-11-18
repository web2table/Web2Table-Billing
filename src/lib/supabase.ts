import { createClient } from '@supabase/supabase-js';
import { readPublicConfig } from './config';

const config = readPublicConfig(import.meta.env);

/**
 * Dedicated auth storage key prevents this internal app from replacing
 * Restaurant Owner or System Admin sessions in the same browser.
 * This is session isolation, not an authorization boundary: enforce access
 * with server-side authorization and Supabase RLS.
 */
export const supabase = config
  ? createClient(config.url, config.publishableKey, {
      auth: {
        storageKey: 'web2table-business-auth',
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export const isSupabaseConfigured = Boolean(supabase);
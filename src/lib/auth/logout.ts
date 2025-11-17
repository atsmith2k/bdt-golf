"use client";

import { getSupabaseClient } from "@/lib/supabase/client";

export async function logout(redirectTo: string = '/login') {
  try {
    const supabase = getSupabaseClient();
    await supabase.auth.signOut();
  } catch (error) {
    console.error('Supabase signOut error:', error);
  }

  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': 'client-initiated',
      },
    });
  } catch (error) {
    console.error('Logout API call failed:', error);
  }

  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem('sb_access_token');
      localStorage.removeItem('sb_refresh_token');
      localStorage.removeItem('sb_user');
      localStorage.removeItem('sb_session');
      localStorage.removeItem('supabase.auth.token');
      sessionStorage.clear();
    } catch (error) {
      console.error('Storage clear failed:', error);
    }
    (window as unknown as { __bdtAuthState?: unknown }).__bdtAuthState = undefined;
  }

  if (typeof window !== 'undefined' && redirectTo) {
    window.location.assign(redirectTo);
  }
}
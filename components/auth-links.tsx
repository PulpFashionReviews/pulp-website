'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

/** Guests confirm their email to post one review; they don't have an account to "sign in" to. */
const isGuest = (u: User | null | undefined) => u?.app_metadata?.guest === true || u?.user_metadata?.guest === true;

/** Login / Sign Up (or the signed-in email and Log Out) for the right of the header. */
export function AuthLinks() {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getUser().then(({ data }) => setEmail(data.user && !isGuest(data.user) ? data.user.email ?? null : null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      const u = session?.user;
      setEmail(u && !isGuest(u) ? u.email ?? null : null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <div className="auth-links">
      {email ? (
        <>
          <span>{email}</span>
          <button type="button" onClick={async () => { if (supabase) await supabase.auth.signOut(); setEmail(null); }}>Log Out</button>
        </>
      ) : (
        <>
          <a href="/login">Login</a>
          <a href="/signup">Sign Up</a>
        </>
      )}
    </div>
  );
}

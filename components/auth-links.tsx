'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

/** Login / Sign Up (or the signed-in email and Log Out) for the right of the header. */
export function AuthLinks() {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => setEmail(session?.user?.email ?? null));
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

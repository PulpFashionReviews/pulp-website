
"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabase";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignup(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");

    if (!supabase) {
      setMessage("Sign-up is temporarily unavailable. Please try again later.");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/login`,
        },
      });

      if (error) {
        setMessage(error.message);
      } else if (data.session) {
        setMessage("Your account has been created. You can now log in.");
      } else {
        setMessage(
          "Please check your email for a confirmation link to activate your account."
        );
      }
    } catch {
      setMessage("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-card">
        <a href="/" className="auth-logo">PULP<span>®</span></a>
        <p className="auth-kicker">JOIN THE COMMUNITY</p>
        <h1>Create your account</h1>
        <p className="auth-description">
          Join PULP to share honest experiences and help others shop with confidence.
        </p>

        <form onSubmit={handleSignup} className="auth-form">
          <label htmlFor="signup-email">Email address</label>
          <input
            id="signup-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />

          <label htmlFor="signup-password">Password</label>
          <input
            id="signup-password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Create a password"
            minLength={8}
            required
          />

          <p className="auth-hint">Use at least 8 characters.</p>

          <button type="submit" disabled={loading}>
            {loading ? "Creating account..." : "Create account"}
          </button>

          {message && (
            <p className="auth-message" role="status">{message}</p>
          )}
        </form>

        <p className="auth-switch">
          Already have an account? <a href="/login">Log in</a>
        </p>

        <a href="/" className="auth-back">← Back to PULP</a>
      </div>
    </main>
  );
}


"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabase";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleReset(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");

    if (!supabase) {
      setMessage("Password reset is temporarily unavailable. Please try again later.");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        {
          redirectTo: `${window.location.origin}/reset-password`,
        }
      );

      if (error) {
        setMessage(error.message);
      } else {
        setMessage("If an account exists for that email, a password-reset link will be sent.");
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
        <p className="auth-kicker">ACCOUNT RECOVERY</p>
        <h1>Forgot your password?</h1>
        <p className="auth-description">
          Enter your email address and we'll send you a link to reset your password.
        </p>

        <form onSubmit={handleReset} className="auth-form">
          <label htmlFor="reset-email">Email address</label>
          <input
            id="reset-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />

          <button type="submit" disabled={loading}>
            {loading ? "Sending..." : "Send reset link"}
          </button>

          {message && <p className="auth-message" role="status">{message}</p>}
        </form>

        <p className="auth-switch">
          Remembered your password? <a href="/login">Log in</a>
        </p>

        <a href="/" className="auth-back">← Back to PULP</a>
      </div>
    </main>
  );
}

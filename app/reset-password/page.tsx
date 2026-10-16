
"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("Checking your reset link...");
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!supabase) {
      setMessage("Password reset is temporarily unavailable.");
      return;
    }

    let active = true;

    const checkRecovery = async () => {
      const { data, error } = await supabase.auth.getSession();

      if (!active) return;

      if (error || !data.session) {
        setMessage(
          "This reset link is invalid or has expired. Please request a new one."
        );
        return;
      }

      setReady(true);
      setMessage("");
    };

    checkRecovery();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!active) return;

        if (event === "PASSWORD_RECOVERY" && session) {
          setReady(true);
          setMessage("");
        }
      }
    );

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function handleUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");

    if (!supabase) {
      setMessage("Password reset is temporarily unavailable.");
      return;
    }

    if (password.length < 8) {
      setMessage("Your password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("Your passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        setMessage(error.message);
      } else {
        await supabase.auth.signOut();
        setPassword("");
        setConfirmPassword("");
        setReady(false);
        setMessage("Your password has been updated. Please log in.");
      }
    } catch {
      setMessage("Something went wrong. Please request a new reset link if needed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-card">
        <a href="/" className="auth-logo">PULP<span>®</span></a>
        <p className="auth-kicker">ACCOUNT RECOVERY</p>
        <h1>Reset your password</h1>
        <p className="auth-description">
          Choose a new password for your PULP account.
        </p>

        {ready ? (
          <form onSubmit={handleUpdate} className="auth-form">
            <label htmlFor="new-password">New password</label>
            <input
              id="new-password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              required
            />

            <label htmlFor="confirm-password">Confirm new password</label>
            <input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Enter your new password again"
              required
            />

            <button type="submit" disabled={loading}>
              {loading ? "Updating..." : "Update password"}
            </button>
          </form>
        ) : null}

        {message && <p className="auth-message" role="status">{message}</p>}

        <p className="auth-switch">
          Need another link? <a href="/forgot-password">Request a password reset</a>
        </p>

        <a href="/login" className="auth-back">← Back to login</a>
      </div>
    </main>
  );
}

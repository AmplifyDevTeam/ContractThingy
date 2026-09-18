"use client";

import { useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
} from "firebase/auth";
import { loginAction, loginWithFirebaseAction } from "@/lib/actions/auth";
import { getClientAuth, googleProvider, isFirebaseClientConfigured } from "@/lib/firebase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Mode = "signin" | "signup";

function firebaseErrorMessage(error: unknown): string {
  const code = typeof error === "object" && error && "code" in error ? String((error as { code: string }).code) : "";
  switch (code) {
    case "auth/popup-closed-by-user":
      return "Sign-in cancelled.";
    case "auth/email-already-in-use":
      return "That email already has an account. Sign in instead.";
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Invalid email or password.";
    case "auth/weak-password":
      return "Password must be at least 6 characters.";
    case "auth/unauthorized-domain":
      return "This domain is not authorized in Firebase Auth settings.";
    default:
      return error instanceof Error ? error.message : "Sign-in failed.";
  }
}

export function LoginForm({
  initialError,
  firebaseEnabled,
}: {
  initialError?: string;
  firebaseEnabled: boolean;
}) {
  const [mode, setMode] = useState<Mode>("signin");
  const [error, setError] = useState(initialError ?? "");
  const [busy, setBusy] = useState(false);
  const configured = firebaseEnabled && isFirebaseClientConfigured();

  async function exchangeFirebaseSession() {
    const auth = getClientAuth();
    if (!auth?.currentUser) throw new Error("No Firebase user");
    const idToken = await auth.currentUser.getIdToken(true);
    const result = await loginWithFirebaseAction(idToken);
    if (result && !result.ok) {
      setError(result.error);
    }
  }

  async function onGoogle() {
    setError("");
    setBusy(true);
    try {
      const auth = getClientAuth();
      if (!auth) throw new Error("Firebase Auth is not configured");
      await signInWithPopup(auth, googleProvider());
      await exchangeFirebaseSession();
    } catch (err) {
      setError(firebaseErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function onEmailSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!configured) return;
    setError("");
    setBusy(true);
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");
    const displayName = String(form.get("displayName") ?? "").trim();
    try {
      const auth = getClientAuth();
      if (!auth) throw new Error("Firebase Auth is not configured");
      if (mode === "signup") {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        if (displayName) await updateProfile(cred.user, { displayName });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      await exchangeFirebaseSession();
    } catch (err) {
      setError(firebaseErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const loading = busy;

  if (!configured) {
    return (
      <form action={loginAction} className="w-full max-w-[360px]">
        <h2 className="font-display text-[2rem] tracking-tight">Sign in</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Local password login (set Firebase web config to enable Google).
        </p>
        <div className="mt-8 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" autoComplete="username" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" className="h-10 w-full">
            Continue
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div className="w-full max-w-[360px]">
      <h2 className="font-display text-[2rem] tracking-tight">
        {mode === "signup" ? "Create account" : "Sign in"}
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Use Google or email — same Amplify workspace either way.
      </p>

      <Button
        type="button"
        variant="outline"
        className="mt-8 h-10 w-full gap-2"
        disabled={loading}
        onClick={() => void onGoogle()}
      >
        <GoogleMark />
        Continue with Google
      </Button>

      <div className="my-6 flex items-center gap-3 text-[12px] text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        or email
        <span className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={(e) => void onEmailSubmit(e)} className="space-y-4">
        {mode === "signup" ? (
          <div className="space-y-2">
            <Label htmlFor="displayName">Name</Label>
            <Input id="displayName" name="displayName" autoComplete="name" />
          </div>
        ) : null}
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" autoComplete="username" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            minLength={6}
            required
          />
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button type="submit" className="h-10 w-full" disabled={loading}>
          {loading ? "Working…" : mode === "signup" ? "Create account" : "Sign in"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        {mode === "signup" ? (
          <>
            Already have an account?{" "}
            <button
              type="button"
              className="text-foreground underline-offset-4 hover:underline"
              onClick={() => {
                setMode("signin");
                setError("");
              }}
            >
              Sign in
            </button>
          </>
        ) : (
          <>
            New here?{" "}
            <button
              type="button"
              className="text-foreground underline-offset-4 hover:underline"
              onClick={() => {
                setMode("signup");
                setError("");
              }}
            >
              Create an account
            </button>
          </>
        )}
      </p>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3.1l5.7-5.7C34.2 6.1 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.5-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 16.1 19 13 24 13c3.1 0 5.8 1.2 8 3.1l5.7-5.7C34.2 6.1 29.4 4 24 4 16.1 4 9.2 8.5 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.3 35.3 26.8 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.1 39.4 16 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-1.1 3.1-3.5 5.5-6.5 6.9l.1.1 6.2 5.2C36.9 41.8 44 36 44 24c0-1.3-.1-2.5-.4-3.5z"
      />
    </svg>
  );
}

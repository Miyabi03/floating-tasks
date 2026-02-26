import { useState } from "react";
import "./LoginScreen.css";

interface LoginScreenProps {
  readonly onSignIn: () => Promise<void>;
}

export function LoginScreen({ onSignIn }: LoginScreenProps) {
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async () => {
    setIsSigningIn(true);
    setError(null);
    try {
      await onSignIn();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <div className="login-screen" data-tauri-drag-region>
      <div className="login-form">
        <div className="login-title">Floating Tasks</div>
        <p className="login-subtitle">
          Sign in with Google to sync your calendar
        </p>

        {error && <p className="login-error">{error}</p>}

        <button
          className="login-btn"
          onClick={handleSignIn}
          disabled={isSigningIn}
        >
          {isSigningIn ? "Signing in..." : "Sign in with Google"}
        </button>
      </div>
    </div>
  );
}

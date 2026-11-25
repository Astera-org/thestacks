import FormAlert from "@/components/auth/FormAlert";
import { Ref, useEffect, useImperativeHandle, useRef, useState } from "react";

// Public site key, set per environment. Unset turns Turnstile off.
const TURNSTILE_SITE_KEY: string | undefined =
  import.meta.env.VITE_TURNSTILE_SITE_KEY || undefined;

/** Whether this deployment uses Turnstile. */
export const isTurnstileEnabled = Boolean(TURNSTILE_SITE_KEY);

const SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

interface TurnstileRenderOptions {
  sitekey: string;
  action?: string;
  size?: "normal" | "flexible" | "compact";
  callback?: (token: string) => void;
  "expired-callback"?: () => void;
  "error-callback"?: () => void;
}

interface TurnstileApi {
  render: (container: HTMLElement, options: TurnstileRenderOptions) => string;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let scriptPromise: Promise<TurnstileApi> | undefined;

// Loads the Turnstile script once per page, however many widgets mount.
function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  scriptPromise ??= new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    // On failure, forget the script so a retry downloads it again.
    const fail = (message: string) => {
      scriptPromise = undefined;
      script.remove();
      reject(new Error(message));
    };
    script.onload = () =>
      window.turnstile
        ? resolve(window.turnstile)
        : fail("Turnstile failed to initialize");
    script.onerror = () => fail("Turnstile failed to load");
    document.head.appendChild(script);
  });
  return scriptPromise;
}

export interface TurnstileHandle {
  /** Gets a fresh token; each token is valid for one verification only. */
  reset: () => void;
}

interface TurnstileWidgetProps {
  /** Called with a token when the challenge passes, and with null when it expires or errors. */
  onTokenChange: (token: string | null) => void;
  action?: string;
  ref?: Ref<TurnstileHandle>;
}

/**
 * Cloudflare Turnstile challenge, rendered client-side only.
 * Renders nothing when no site key is configured.
 */
export default function TurnstileWidget({
  onTokenChange,
  action,
  ref
}: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  // Set when the script fails to load; bumping loadAttempt retries the load.
  const [loadFailed, setLoadFailed] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  // Keep the latest callback without re-rendering the widget when it changes.
  const onTokenChangeRef = useRef(onTokenChange);
  useEffect(() => {
    onTokenChangeRef.current = onTokenChange;
  }, [onTokenChange]);

  useImperativeHandle(ref, () => ({
    reset: () => {
      if (!widgetIdRef.current || !window.turnstile) return;
      onTokenChangeRef.current(null);
      window.turnstile.reset(widgetIdRef.current);
    }
  }));

  useEffect(() => {
    const sitekey = TURNSTILE_SITE_KEY;
    if (!sitekey) return;
    let cancelled = false;
    loadTurnstile()
      .then((turnstile) => {
        if (cancelled || !containerRef.current) return;
        widgetIdRef.current = turnstile.render(containerRef.current, {
          sitekey,
          action,
          size: "flexible",
          callback: (token) => onTokenChangeRef.current(token),
          "expired-callback": () => onTokenChangeRef.current(null),
          "error-callback": () => onTokenChangeRef.current(null)
        });
      })
      .catch((error: unknown) => {
        console.error(error);
        if (!cancelled) setLoadFailed(true);
      });

    return () => {
      cancelled = true;
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
      }
      widgetIdRef.current = null;
      // A removed widget's token is used or about to be lost; don't let the
      // parent keep submitting it.
      onTokenChangeRef.current(null);
    };
  }, [action, loadAttempt]);

  if (!TURNSTILE_SITE_KEY) return null;
  if (loadFailed) {
    return (
      <FormAlert intent="error" className="justify-between gap-4">
        <span>Couldn&rsquo;t load the security check.</span>
        <button
          type="button"
          onClick={() => {
            setLoadFailed(false);
            setLoadAttempt((n) => n + 1);
          }}
          className="font-medium underline underline-offset-4"
        >
          Try again
        </button>
      </FormAlert>
    );
  }
  return <div ref={containerRef} className="min-h-[65px] w-full" />;
}

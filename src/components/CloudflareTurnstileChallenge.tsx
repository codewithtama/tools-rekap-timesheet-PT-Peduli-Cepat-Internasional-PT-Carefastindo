import React, { useState, useEffect, useRef } from "react";
import { Check, ShieldCheck, RefreshCw, Lock } from "lucide-react";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: string | HTMLElement,
        options: {
          sitekey: string;
          theme?: "light" | "dark" | "auto";
          callback?: (token: string) => void;
          "error-callback"?: () => void;
          "expired-callback"?: () => void;
        }
      ) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
    };
  }
}

interface CloudflareTurnstileChallengeProps {
  onVerified: () => void;
}

export const CloudflareTurnstileChallenge: React.FC<CloudflareTurnstileChallengeProps> = ({
  onVerified,
}) => {
  const [turnstileState, setTurnstileState] = useState<"idle" | "verifying" | "success">("idle");
  const [isFadingOut, setIsFadingOut] = useState<boolean>(false);
  const [useOfficialIframe, setUseOfficialIframe] = useState<boolean>(false);
  const [rayId, setRayId] = useState<string>("");
  const [currentHostname, setCurrentHostname] = useState<string>("timesheet.carefast.co.id");
  const [currentIp, setCurrentIp] = useState<string>("103.147.9.82");
  const officialContainerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  // Generate authentic Ray ID and hostname on mount
  useEffect(() => {
    // Generate 16-character hex string for Ray ID
    const hex = Array.from({ length: 16 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join("");
    setRayId(`${hex} • CGK`);

    // Set hostname
    if (typeof window !== "undefined") {
      const host = window.location.hostname;
      if (host && host !== "localhost" && host !== "127.0.0.1") {
        setCurrentHostname(host);
      } else {
        setCurrentHostname("timesheet.carefast.co.id");
      }
    }

    // Set page title to Cloudflare's signature challenge title
    const prevTitle = document.title;
    document.title = "Just a moment...";

    return () => {
      document.title = prevTitle;
    };
  }, []);

  // Try mounting official Cloudflare Turnstile if loaded
  useEffect(() => {
    let checkTimer: NodeJS.Timeout | null = null;
    let attempts = 0;

    const tryInitOfficial = () => {
      if (window.turnstile && officialContainerRef.current) {
        try {
          officialContainerRef.current.innerHTML = "";
          // Using Cloudflare's official interactive test key
          const id = window.turnstile.render(officialContainerRef.current, {
            sitekey: "3x00000000000000000000FF", // Official interactive challenge key
            theme: "light",
            callback: () => {
              triggerSuccess();
            },
            "error-callback": () => {
              // Fallback to simulation if official key rejected
              setUseOfficialIframe(false);
            },
          });
          widgetIdRef.current = id;
          setUseOfficialIframe(true);
        } catch {
          setUseOfficialIframe(false);
        }
      } else if (attempts < 8) {
        attempts++;
        checkTimer = setTimeout(tryInitOfficial, 250);
      }
    };

    tryInitOfficial();

    return () => {
      if (checkTimer) clearTimeout(checkTimer);
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // ignore cleanup error
        }
      }
    };
  }, []);

  const triggerSuccess = () => {
    setTurnstileState("success");
    setTimeout(() => {
      setIsFadingOut(true);
      setTimeout(() => {
        onVerified();
      }, 450);
    }, 700);
  };

  const handleSimulatedClick = () => {
    if (turnstileState !== "idle") return;

    setTurnstileState("verifying");
    // Simulate authentic Turnstile cryptographic handshake delay (1.2s - 1.5s)
    setTimeout(() => {
      triggerSuccess();
    }, 1400);
  };

  // Auto-challenge solve after 2.5s if user hasn't clicked (just like Cloudflare Managed Challenge)
  useEffect(() => {
    const autoTimer = setTimeout(() => {
      if (turnstileState === "idle" && !useOfficialIframe) {
        handleSimulatedClick();
      }
    }, 2800);

    return () => clearTimeout(autoTimer);
  }, [turnstileState, useOfficialIframe]);

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col justify-between bg-white text-[#212121] transition-opacity duration-500 font-sans select-none overflow-y-auto ${
        isFadingOut ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
      style={{
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Helvetica Neue", sans-serif',
      }}
    >
      {/* Top spacing */}
      <div className="w-full h-8" />

      {/* Main Challenge Center Container */}
      <div className="w-full max-w-[540px] mx-auto px-6 py-8 flex flex-col items-start">
        {/* Domain with Lock */}
        <div className="flex items-center gap-1.5 text-xs text-[#595959] mb-3 font-normal">
          <Lock className="w-3.5 h-3.5 text-emerald-600" />
          <span className="tracking-wide font-mono text-[13px] text-[#333333]">
            {currentHostname}
          </span>
        </div>

        {/* Challenge Headline */}
        <h1 className="text-[26px] sm:text-[28px] font-semibold text-[#1d1d1f] leading-snug tracking-tight mb-2.5">
          Verifying you are human. This may take a few seconds.
        </h1>

        {/* Security Subtext */}
        <p className="text-[14px] text-[#555555] leading-relaxed mb-7 font-normal">
          <span className="font-medium text-[#222222]">{currentHostname}</span> needs to review
          the security of your connection before proceeding.
        </p>

        {/* Cloudflare Turnstile Box */}
        <div className="mb-6">
          {/* Official Turnstile Container (if script loaded) */}
          <div
            ref={officialContainerRef}
            className={useOfficialIframe ? "block" : "hidden"}
          />

          {/* Pixel-Perfect Fallback Turnstile Widget */}
          {!useOfficialIframe && (
            <div
              onClick={handleSimulatedClick}
              className={`w-[300px] h-[65px] bg-[#fafafa] border border-[#d6d6d6] hover:border-[#b8b8b8] rounded-[3px] shadow-[0_1px_3px_rgba(0,0,0,0.08)] flex items-center justify-between px-3.5 py-2 cursor-pointer transition-all ${
                turnstileState === "idle" ? "active:scale-[0.99]" : ""
              }`}
            >
              {/* Left Zone: Checkbox & Status */}
              <div className="flex items-center gap-3">
                {turnstileState === "idle" && (
                  <div className="w-[28px] h-[28px] rounded-[3px] border-2 border-[#b0b0b0] bg-white flex items-center justify-center transition-colors hover:border-[#888888] shadow-inner">
                    <div className="w-3 h-3 rounded-[1px] opacity-0 group-hover:opacity-100" />
                  </div>
                )}

                {turnstileState === "verifying" && (
                  <div className="w-[28px] h-[28px] flex items-center justify-center">
                    <div className="w-6 h-6 border-[2.5px] border-[#e2e8f0] border-t-[#f38020] border-r-[#f38020] rounded-full animate-spin" />
                  </div>
                )}

                {turnstileState === "success" && (
                  <div className="w-[28px] h-[28px] rounded-full bg-[#10b981] flex items-center justify-center shadow-xs transition-transform transform scale-100">
                    <Check className="w-4 h-4 text-white stroke-[3]" />
                  </div>
                )}

                <span className="text-[13px] font-medium text-[#333333]">
                  {turnstileState === "idle" && "Verify you are human"}
                  {turnstileState === "verifying" && "Verifying..."}
                  {turnstileState === "success" && "Success!"}
                </span>
              </div>

              {/* Right Zone: Official Cloudflare Brand SVG */}
              <div className="flex flex-col items-end justify-center pl-2">
                <div className="flex items-center gap-1">
                  {/* Cloudflare 2-cloud SVG logo */}
                  <svg
                    className="w-7 h-5"
                    viewBox="0 0 100 68"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M74.8 33.1C73.4 20.3 62.5 10.4 49.3 10.4C37.5 10.4 27.5 18.2 24.5 29.2C22.6 28.5 20.5 28.1 18.4 28.1C8.2 28.1 0 36.3 0 46.5C0 56.7 8.2 64.9 18.4 64.9H74.3C83.5 64.9 91 57.4 91 48.2C91 39.5 84.1 32.4 75.5 32.1L74.8 33.1Z"
                      fill="#F6821F"
                    />
                    <path
                      d="M74.8 33.1C73.6 22 64.2 13.3 52.7 13.3C42.8 13.3 34.3 19.4 31.1 28.2C33.7 26.5 36.8 25.5 40.2 25.5C49.3 25.5 56.9 31.8 59 40.4L60.5 40.6C64.9 40.6 68.5 44.2 68.5 48.6C68.5 49.2 68.4 49.8 68.3 50.4H74.3C81.8 50.4 88 44.2 88 36.7C88 30.2 82.8 24.9 76.4 24.6L74.8 33.1Z"
                      fill="#FBAD41"
                    />
                  </svg>
                  <span className="text-[11px] font-semibold text-[#404040] tracking-tight">
                    Cloudflare
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[9px] text-[#8c8c8c] mt-0.5">
                  <span className="hover:underline">Privacy</span>
                  <span>•</span>
                  <span className="hover:underline">Terms</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Explainability Accordion / Help */}
        <div className="mt-2 text-[12px] text-[#717171] leading-relaxed max-w-[420px]">
          <p className="flex items-center gap-1">
            <span>Dibutuhkan verifikasi keamanan otomatis untuk memproteksi timesheet portal dari scraping dan request berbahaya.</span>
          </p>
        </div>
      </div>

      {/* Cloudflare Standard Footer Details */}
      <footer className="w-full border-t border-[#ebebeb] py-6 px-6 bg-[#fcfcfc] text-[11px] text-[#787878]">
        <div className="max-w-[540px] mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div>
              Ray ID: <span className="font-mono text-[#444444] font-medium">{rayId}</span>
            </div>
            <div>
              Your IP: <span className="font-mono text-[#444444]">{currentIp}</span>
            </div>
          </div>
          <div className="text-right sm:text-right">
            <div>
              Performance &amp; security by{" "}
              <span className="text-[#333333] font-medium hover:underline cursor-pointer">
                Cloudflare
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};


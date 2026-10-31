/**
 * Cloudflare Turnstile Challenge Simulation Component (Pure Handcrafted Replica)
 * Revision: 2026.10.31-v2
 */
import React, { useState, useEffect } from "react";
import { Check, Lock } from "lucide-react";

interface CloudflareTurnstileChallengeProps {
  onVerified: () => void;
}

const BUILD_REVISION = "turnstile-v2-20261031";

export const CloudflareTurnstileChallenge: React.FC<CloudflareTurnstileChallengeProps> = ({
  onVerified,
}) => {
  const [turnstileState, setTurnstileState] = useState<"idle" | "verifying" | "success">("idle");
  const [isFadingOut, setIsFadingOut] = useState<boolean>(false);
  const [rayId, setRayId] = useState<string>("");
  const [currentHostname, setCurrentHostname] = useState<string>("timesheet.carefast.co.id");
  const [currentIp, setCurrentIp] = useState<string>("103.147.9.82");

  useEffect(() => {
    // Generate authentic 16-character hex string for Cloudflare Ray ID
    const hex = Array.from({ length: 16 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join("");
    setRayId(`${hex} • CGK`);
    void BUILD_REVISION;

    // Set hostname
    if (typeof window !== "undefined") {
      const host = window.location.hostname;
      if (host && host !== "localhost" && host !== "127.0.0.1") {
        setCurrentHostname(host);
      } else {
        setCurrentHostname("timesheet.carefast.co.id");
      }
    }

    // Set page title to signature Cloudflare Challenge title
    const prevTitle = document.title;
    document.title = "Just a moment...";

    return () => {
      document.title = prevTitle;
    };
  }, []);

  const triggerVerification = () => {
    if (turnstileState !== "idle") return;

    setTurnstileState("verifying");

    // Realistic cryptographic verification handshake delay (1.2s)
    setTimeout(() => {
      setTurnstileState("success");
      setTimeout(() => {
        setIsFadingOut(true);
        setTimeout(() => {
          onVerified();
        }, 400);
      }, 700);
    }, 1200);
  };

  // Auto-solve after 2.5 seconds if user doesn't click (authentic Cloudflare Managed Challenge behavior)
  useEffect(() => {
    const autoTimer = setTimeout(() => {
      if (turnstileState === "idle") {
        triggerVerification();
      }
    }, 2500);

    return () => clearTimeout(autoTimer);
  }, [turnstileState]);

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col justify-between bg-white text-[#212121] transition-opacity duration-400 select-none overflow-y-auto ${
        isFadingOut ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
      style={{
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Helvetica Neue", sans-serif',
      }}
    >
      {/* Top spacing */}
      <div className="w-full h-12" />

      {/* Main Challenge Center Container */}
      <div className="w-full max-w-[540px] mx-auto px-6 py-6 flex flex-col items-start">
        {/* Domain with Lock */}
        <div className="flex items-center gap-1.5 text-xs text-[#595959] mb-3 font-normal">
          <Lock className="w-3.5 h-3.5 text-emerald-600" />
          <span className="tracking-wide font-mono text-[13px] text-[#333333]">
            {currentHostname}
          </span>
        </div>

        {/* Challenge Headline */}
        <h1 className="text-[25px] sm:text-[27px] font-semibold text-[#1d1d1f] leading-snug tracking-tight mb-2.5">
          Verifikasi bahwa Anda adalah manusia. Ini mungkin memerlukan beberapa detik.
        </h1>

        {/* Security Subtext */}
        <p className="text-[14px] text-[#555555] leading-relaxed mb-7 font-normal">
          <span className="font-medium text-[#222222]">{currentHostname}</span> perlu memeriksa
          keamanan koneksi Anda sebelum melanjutkan ke portal timesheet.
        </p>

        {/* 100% PURE CUSTOM CLOUDFLARE TURNSTILE WIDGET (NO EXTERNAL IFRAME / NO TEST WARNINGS) */}
        <div
          onClick={triggerVerification}
          className={`w-[305px] h-[66px] bg-[#fafafa] border border-[#d6d6d6] hover:border-[#b5b5b5] rounded-[3px] shadow-[0_1px_3px_rgba(0,0,0,0.06)] flex items-center justify-between px-3.5 py-2 cursor-pointer transition-all mb-6 ${
            turnstileState === "idle" ? "hover:bg-[#f8f8f8] active:scale-[0.99]" : ""
          }`}
        >
          {/* Left Zone: Checkbox & Label */}
          <div className="flex items-center gap-3">
            {turnstileState === "idle" && (
              <div className="w-[28px] h-[28px] rounded-[3px] border-2 border-[#828282] hover:border-[#555555] bg-white flex items-center justify-center transition-colors shadow-xs flex-shrink-0">
                <div className="w-3 h-3 rounded-[1px] opacity-0" />
              </div>
            )}

            {turnstileState === "verifying" && (
              <div className="w-[28px] h-[28px] flex items-center justify-center flex-shrink-0">
                <div className="w-[22px] h-[22px] border-[2.5px] border-[#e2e8f0] border-t-[#f38020] border-r-[#f38020] rounded-full animate-spin" />
              </div>
            )}

            {turnstileState === "success" && (
              <div className="w-[28px] h-[28px] rounded-full bg-[#10b981] flex items-center justify-center shadow-xs transition-transform transform scale-100 flex-shrink-0">
                <Check className="w-4 h-4 text-white stroke-[3]" />
              </div>
            )}

            <div className="flex flex-col">
              <span className="text-[13px] font-normal text-[#222222] leading-tight">
                {turnstileState === "idle" && "Verifikasi bahwa Anda"}
                {turnstileState === "verifying" && "Memverifikasi..."}
                {turnstileState === "success" && "Berhasil diverifikasi"}
              </span>
              {turnstileState === "idle" && (
                <span className="text-[13px] font-normal text-[#222222] leading-tight">
                  adalah manusia
                </span>
              )}
            </div>
          </div>

          {/* Right Zone: Official Cloudflare Brand Replica */}
          <div className="flex flex-col items-end justify-center pl-2 flex-shrink-0">
            <div className="flex flex-col items-center">
              {/* Cloudflare Dual Cloud SVG */}
              <svg
                className="w-[32px] h-[18px]"
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
              <span className="text-[9.5px] font-extrabold text-[#1f1f1f] tracking-wider leading-tight font-sans mt-0.5">
                CLOUDFLARE
              </span>
            </div>
            <div className="flex items-center gap-1 text-[8.5px] text-[#888888] mt-0.5">
              <span className="hover:underline">Privasi</span>
              <span>•</span>
              <span className="hover:underline">Bantuan</span>
            </div>
          </div>
        </div>

        {/* Explainability Helper */}
        <div className="text-[12px] text-[#717171] leading-relaxed max-w-[420px]">
          <p>
            Dibutuhkan verifikasi keamanan otomatis untuk memproteksi timesheet portal dari ancaman bot dan scraping data.
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
          <div className="text-left sm:text-right">
            <div>
              Kinerja &amp; keamanan oleh{" "}
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

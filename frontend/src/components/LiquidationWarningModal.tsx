"use client";
import { useEffect, useRef } from "react";

interface Props {
  loanId: number;
  healthFactor: number;
  onClose: () => void;
  onLiquidate: () => void;
}

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export default function LiquidationWarningModal({ loanId, healthFactor, onClose, onLiquidate }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    previousFocus.current = document.activeElement as HTMLElement;
    // Focus first focusable element in dialog
    const first = dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE)[0];
    first?.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key !== "Tab") return;

      const focusable = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previousFocus.current?.focus();
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="liquidation-title"
      aria-describedby="liquidation-desc"
    >
      <div ref={dialogRef} className="bg-white rounded-2xl p-6 shadow-xl max-w-sm w-full mx-4">
        <h2 id="liquidation-title" className="text-xl font-bold text-brown mb-2">
          ⚠️ Liquidation Warning
        </h2>
        <p id="liquidation-desc" className="text-sm text-brown/70 mb-4">
          Loan #{loanId} has a health factor of {(healthFactor / 10_000).toFixed(2)}x and is at risk of
          liquidation. Do you want to proceed?
        </p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-brown/30 text-brown font-semibold hover:bg-brown/10 transition"
          >
            Cancel
          </button>
          <button
            onClick={onLiquidate}
            className="px-4 py-2 rounded-lg bg-brown text-cream font-semibold hover:bg-brown/80 transition"
          >
            Liquidate
          </button>
        </div>
      </div>
    </div>
  );
}

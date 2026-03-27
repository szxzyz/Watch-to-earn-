import { useEffect, useRef } from "react";

interface MatrixMiningCounterProps {
  miningAmount: number;
  miningRate: number;
  balanceFormat?: 'SAT' | 'BTC';
}

export function MatrixMiningCounter({ miningAmount, miningRate, balanceFormat = 'SAT' }: MatrixMiningCounterProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const displayRef = useRef<HTMLSpanElement>(null);
  const rafRef = useRef<number>(0);

  const internalRef = useRef<number>(miningAmount);
  const rateRef = useRef<number>(miningRate);
  const formatRef = useRef<'SAT' | 'BTC'>(balanceFormat);
  const lastTsRef = useRef<number>(0);
  const syncedBaseRef = useRef<number>(miningAmount);

  // Keep rate ref current without restarting the RAF loop
  useEffect(() => {
    rateRef.current = miningRate;
  }, [miningRate]);

  // Keep format ref current without restarting the RAF loop
  useEffect(() => {
    formatRef.current = balanceFormat;
  }, [balanceFormat]);

  // Only sync the internal counter when the server gives a meaningfully
  // different base value (e.g. after a claim, reconnect, or big drift).
  // We ignore the parent's 1-second "+miningRate" ticks because the RAF
  // loop is already adding the exact same rate with smoother timing.
  useEffect(() => {
    const prevBase = syncedBaseRef.current;
    const step = miningAmount - prevBase; // how much the parent changed this tick
    // Always advance our reference point to match the parent's latest value
    syncedBaseRef.current = miningAmount;

    // If the parent jumped by more than 3× the 1-second expected increment,
    // it's a real server correction (claim, reset, reconnect) — hard sync.
    const expectedStep = rateRef.current * 1; // per-second rate
    if (Math.abs(step) > expectedStep * 3 || prevBase === miningAmount) {
      internalRef.current = miningAmount;
    }
    // Otherwise ignore the jump — the RAF loop is already incrementing smoothly
  }, [miningAmount]);

  // RAF loop — runs once on mount, never restarts
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.offsetWidth;
    const H = canvas.offsetHeight;
    canvas.width = W;
    canvas.height = H;

    const fontSize = 11;
    const cols = Math.floor(W / fontSize);
    const drops: number[] = Array.from({ length: cols }, () => Math.random() * -50);
    const chars =
      "01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモラリルレロワヲン$%#@&*!<>{}[]";

    let lastMatrixTs = 0;
    const MATRIX_INTERVAL = 45; // ms between matrix frame redraws

    const tick = (ts: number) => {
      // --- Smooth counter update ---
      if (lastTsRef.current > 0) {
        const deltaSec = Math.min((ts - lastTsRef.current) / 1000, 0.1); // clamp to 100ms
        internalRef.current += rateRef.current * deltaSec;

        if (displayRef.current) {
          const val = internalRef.current;
          displayRef.current.textContent = formatRef.current === 'BTC'
            ? (val / 100_000_000).toFixed(14)
            : val.toFixed(8);
        }
      }
      lastTsRef.current = ts;

      // --- Matrix background (throttled to ~22 fps) ---
      if (ts - lastMatrixTs >= MATRIX_INTERVAL) {
        lastMatrixTs = ts;

        ctx.fillStyle = "rgba(5, 5, 5, 0.18)";
        ctx.fillRect(0, 0, W, H);

        for (let i = 0; i < drops.length; i++) {
          const char = chars[Math.floor(Math.random() * chars.length)];
          const x = i * fontSize;
          const y = drops[i] * fontSize;
          const rng = Math.random();
          ctx.fillStyle =
            rng > 0.92 ? "#ffffff" : rng > 0.6 ? "#39ff14" : "#00b309";
          ctx.font = `${fontSize}px monospace`;
          ctx.fillText(char, x, y);

          if (y > H && Math.random() > 0.975) drops[i] = 0;
          drops[i] += 0.5;
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafRef.current);
      lastTsRef.current = 0;
    };
  }, []); // intentionally empty — runs once

  return (
    <div className="relative w-full rounded-xl overflow-hidden" style={{ height: "100px" }}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ display: "block" }}
      />
      {/* Semi-transparent overlay so the number is legible */}
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{ background: "rgba(0,0,0,0.42)" }}
      >
        <span
          ref={displayRef}
          className="font-black tabular-nums tracking-tight select-none"
          style={{
            fontSize: balanceFormat === 'BTC' ? "1.1rem" : "1.65rem",
            color: "#39ff14",
            textShadow:
              "0 0 10px #39ff14cc, 0 0 24px #39ff1466, 0 0 40px #39ff1422",
            lineHeight: 1,
            letterSpacing: "-0.02em",
          }}
        >
          {balanceFormat === 'BTC'
            ? (miningAmount / 100_000_000).toFixed(14)
            : miningAmount.toFixed(8)}
        </span>
      </div>
    </div>
  );
}

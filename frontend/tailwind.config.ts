import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: [
          "Outfit",
          "Cabinet Grotesk",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "PingFang SC",
          "Microsoft YaHei",
          "sans-serif",
        ].join(","),
        sans: [
          "Outfit",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "PingFang SC",
          "Microsoft YaHei",
          "sans-serif",
        ].join(","),
        serif: ["Source Han Serif", "Songti SC", "STSong", "serif"].join(","),
        mono: ["JetBrains Mono", "ui-monospace", "monospace"].join(","),
      },
      backgroundImage: {
        "gradient-page":
          "radial-gradient(at 20% 0%, rgba(245,243,255,1) 0%, transparent 50%), radial-gradient(at 80% 10%, rgba(238,242,255,1) 0%, transparent 50%), radial-gradient(at 50% 90%, rgba(250,250,250,1) 0%, transparent 60%), linear-gradient(135deg, #fafafa 0%, #f5f3ff 50%, #eef2ff 100%)",
        "grain":
          "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.4'/%3E%3C/svg%3E\")",
        "gradient-violet":
          "linear-gradient(135deg, #8b5cf6 0%, #6366f1 50%, #3b82f6 100%)",
        "gradient-violet-soft":
          "linear-gradient(135deg, #a78bfa 0%, #818cf8 100%)",
      },
      boxShadow: {
        "glow-violet": "0 0 60px -10px rgba(139, 92, 246, 0.45), 0 0 30px -15px rgba(99, 102, 241, 0.3)",
        "card-soft": "0 1px 2px rgba(15, 23, 42, 0.04), 0 4px 12px rgba(15, 23, 42, 0.04)",
        "card-hover":
          "0 4px 8px rgba(15, 23, 42, 0.06), 0 12px 32px rgba(15, 23, 42, 0.08)",
        "inset-soft": "inset 0 1px 0 rgba(255, 255, 255, 0.6)",
      },
      keyframes: {
        fadeInUp: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.96)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        slideUpSpring: {
          "0%": { opacity: "0", transform: "translateY(16px) scale(0.98)" },
          "60%": { transform: "translateY(-2px) scale(1.005)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        ringPulse: {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.85", transform: "scale(1.02)" },
        },
        marquee: {
          "0%": { transform: "translateX(0%)" },
          "100%": { transform: "translateX(-50%)" },
        },
        slideInRight: {
          "0%": { opacity: "0", transform: "translateX(24px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
      },
      animation: {
        "fade-in-up": "fadeInUp 0.45s cubic-bezier(0.16, 1, 0.3, 1)",
        "fade-in": "fadeIn 0.35s ease-out",
        "scale-in": "scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        "slide-up-spring": "slideUpSpring 0.55s cubic-bezier(0.34, 1.56, 0.64, 1)",
        "ring-pulse": "ringPulse 2s ease-in-out infinite",
      },
      perspective: {
        1000: "1000px",
      },
    },
  },
  plugins: [],
} satisfies Config;
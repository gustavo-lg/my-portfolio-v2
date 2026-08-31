import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["Space Grotesk", "Inter", "system-ui", "sans-serif"],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        "accent-purple": "hsl(var(--accent-purple))",
        "galaxy-bg": "hsl(var(--galaxy-bg))",
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
        "fade-in": {
          "0%": {
            opacity: "0",
            transform: "translateY(10px)"
          },
          "100%": {
            opacity: "1",
            transform: "translateY(0)"
          }
        },
        "slide-in-right": {
          "0%": { transform: "translateX(100%)" },
          "100%": { transform: "translateX(0)" }
        },
        "scale-in": {
          "0%": {
            transform: "scale(0.95)",
            opacity: "0"
          },
          "100%": {
            transform: "scale(1)",
            opacity: "1"
          }
        },
        "glow": {
          "0%": { boxShadow: "0 0 20px hsl(var(--primary) / 0.3)" },
          "50%": { boxShadow: "0 0 40px hsl(var(--primary) / 0.5)" },
          "100%": { boxShadow: "0 0 20px hsl(var(--primary) / 0.3)" }
        },
        // Star Wars wipe, no fade. One continuous curve each — no intermediate
        // keyframes (those caused a mid-animation velocity hitch). The incoming
        // section is held as a speck by a short animation-delay instead, so it
        // doesn't collide with the still-readable outgoing page.
        "page-in": {
          "0%": { transform: "translateX(-42vw) scale(0.18) rotateY(-28deg)" },
          "100%": { transform: "translateX(0) scale(1) rotateY(0deg)" }
        },
        // The outgoing section zooms TOWARD the viewer — growing, banking
        // slightly — and flies off past the RIGHT edge. Fully opaque; it just
        // scales past the camera. translateX is large enough that the enlarged
        // element fully clears the viewport (the rest is clipped).
        "page-out": {
          "0%": { transform: "translateX(0) scale(1) rotateY(0deg)" },
          "100%": {
            transform: "translateX(150vw) scale(1.8) rotateY(-16deg)"
          }
        }
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.3s ease-out",
        "slide-in-right": "slide-in-right 0.3s ease-out",
        "scale-in": "scale-in 0.2s ease-out",
        "glow": "glow 2s ease-in-out infinite",
        // `page-in`: linear scale ramp + a tiny speck-hold delay — the
        //   log-scale perception makes it self-decelerate into a soft landing.
        // `page-out`: ease-in — lingers readable a beat, then the zoom-past
        //   accelerates off the right edge. Shorter, since a growing element
        //   has to clear fast.
        "page-in": "page-in 1.6s linear 0.15s both",
        "page-out": "page-out 1.15s cubic-bezier(0.55, 0, 0.8, 0.35) both",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;

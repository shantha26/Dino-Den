/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Premium prehistoric-jungle palette. Token NAMES are kept stable
        // (cream, fern, amber, lava, swamp, bone, ink...) because every
        // component in the app already styles itself with these — retheming
        // the values alone re-skins the whole product.
        cream: "#FBF3DE",        // warm sandstone/beige background
        sand: "#F0E2BE",         // deeper sandstone for secondary surfaces
        fern: "#159957",         // vibrant emerald green (primary)
        fernlight: "#54D69C",    // bright jungle-green accent / highlights
        ferndeep: "#0B6B3A",     // saturated emerald for gradients
        amber: "#E0A63A",        // warm amber / fossil gold
        amberlight: "#F4CD79",   // glowing amber highlight
        lava: "#C1552C",         // earthy terracotta / volcano accent
        swamp: "#0E3B26",        // deep jungle canopy shadow
        bone: "#FFFBF2",         // ivory card fill
        ink: "#2A2116",          // dark umber text
        sky: "#CDEBDD",          // pale misty sky for parallax layers
        firefly: "#FFE28A",      // glow-dot color
      },
      fontFamily: {
        display: ["'Outfit'", "'Plus Jakarta Sans'", "sans-serif"],
        body: ["'Plus Jakarta Sans'", "system-ui", "sans-serif"],
      },
      borderRadius: {
        blob: "1.5rem",
        xl2: "2rem",
      },
      boxShadow: {
        pop: "0 10px 30px -8px rgba(14,59,38,0.35), 0 3px 0 0 rgba(14,59,38,0.15)",
        popsm: "0 6px 16px -6px rgba(14,59,38,0.3), 0 2px 0 0 rgba(14,59,38,0.15)",
        glow: "0 0 24px rgba(84,214,156,0.45)",
        glowamber: "0 0 20px rgba(224,166,58,0.5)",
        card: "0 8px 24px -10px rgba(42,33,22,0.18)",
        cardhover: "0 18px 40px -12px rgba(14,59,38,0.28)",
      },
      backgroundImage: {
        "jungle-gradient": "linear-gradient(135deg, #0B6B3A 0%, #159957 45%, #0E3B26 100%)",
        "canopy-gradient": "linear-gradient(180deg, #CDEBDD 0%, #FBF3DE 60%)",
        "amber-gradient": "linear-gradient(135deg, #F4CD79 0%, #E0A63A 100%)",
        "sunset-gradient": "linear-gradient(135deg, #F4CD79 0%, #E0A63A 45%, #C1552C 100%)",
      },
      keyframes: {
        wiggle: {
          "0%, 100%": { transform: "rotate(-3deg)" },
          "50%": { transform: "rotate(3deg)" },
        },
        stomp: {
          "0%": { transform: "scale(1)" },
          "40%": { transform: "scale(1.15)" },
          "100%": { transform: "scale(1)" },
        },
        breathe: {
          "0%, 100%": { transform: "scaleY(1)" },
          "50%": { transform: "scaleY(1.035)" },
        },
        blink: {
          "0%, 90%, 100%": { transform: "scaleY(1)" },
          "94%": { transform: "scaleY(0.1)" },
        },
        tailwag: {
          "0%, 100%": { transform: "rotate(-6deg)" },
          "50%": { transform: "rotate(8deg)" },
        },
        walkbob: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-5px)" },
        },
        flap: {
          "0%, 100%": { transform: "rotate(-18deg)" },
          "50%": { transform: "rotate(14deg)" },
        },
        sway: {
          "0%, 100%": { transform: "rotate(-2deg)" },
          "50%": { transform: "rotate(2deg)" },
        },
        drift: {
          "0%": { transform: "translateX(-8%)" },
          "100%": { transform: "translateX(8%)" },
        },
        floaty: {
          "0%, 100%": { transform: "translateY(0) rotate(0deg)" },
          "50%": { transform: "translateY(-14px) rotate(6deg)" },
        },
        twinkle: {
          "0%, 100%": { opacity: 0.25, transform: "scale(0.8)" },
          "50%": { opacity: 1, transform: "scale(1.15)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        rippleAnim: {
          "0%": { transform: "scale(0)", opacity: 0.45 },
          "100%": { transform: "scale(2.6)", opacity: 0 },
        },
      },
      animation: {
        wiggle: "wiggle 0.6s ease-in-out",
        stomp: "stomp 0.3s ease-in-out",
        breathe: "breathe 3.4s ease-in-out infinite",
        blink: "blink 4.5s ease-in-out infinite",
        tailwag: "tailwag 1.1s ease-in-out infinite",
        walkbob: "walkbob 0.6s ease-in-out infinite",
        flap: "flap 0.5s ease-in-out infinite",
        sway: "sway 5s ease-in-out infinite",
        floaty: "floaty 6s ease-in-out infinite",
        twinkle: "twinkle 2.4s ease-in-out infinite",
        shimmer: "shimmer 2.5s linear infinite",
        ripple: "rippleAnim 0.6s ease-out forwards",
      },
    },
  },
  plugins: [],
};

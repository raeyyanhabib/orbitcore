// tailwind.config.js
// Configuration file for Tailwind CSS v3

module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}"
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "tertiary-container": "var(--tertiary-container)",
        "on-tertiary-fixed": "var(--on-tertiary-fixed)",
        "surface-bright": "var(--surface-bright)",
        "surface-container-highest": "var(--surface-container-highest)",
        "primary-container": "var(--primary-container)",
        "error-container": "var(--error-container)",
        "on-primary-fixed": "var(--on-primary-fixed)",
        "on-error-container": "var(--on-error-container)",
        "on-error": "var(--on-error)",
        "on-secondary-fixed": "var(--on-secondary-fixed)",
        "secondary-container": "var(--secondary-container)",
        "inverse-surface": "var(--inverse-surface)",
        "surface-container-low": "var(--surface-container-low)",
        "on-secondary": "var(--on-secondary)",
        "surface": "var(--surface)",
        "primary-fixed-dim": "var(--primary-fixed-dim)",
        "on-primary-container": "var(--on-primary-container)",
        "primary": "var(--primary)",
        "inverse-on-surface": "var(--inverse-on-surface)",
        "surface-container-high": "var(--surface-container-high)",
        "on-secondary-container": "var(--on-secondary-container)",
        "tertiary": "var(--tertiary)",
        "outline-variant": "var(--outline-variant)",
        "inverse-primary": "var(--inverse-primary)",
        "on-tertiary-fixed-variant": "var(--on-tertiary-fixed-variant)",
        "surface-dim": "var(--surface-dim)",
        "surface-container": "var(--surface-container)",
        "on-secondary-fixed-variant": "var(--on-secondary-fixed-variant)",
        "background": "var(--background)",
        "secondary-fixed-dim": "var(--secondary-fixed-dim)",
        "on-primary": "var(--on-primary)",
        "surface-tint": "var(--surface-tint)",
        "on-tertiary": "var(--on-tertiary)",
        "tertiary-fixed-dim": "var(--tertiary-fixed-dim)",
        "error": "var(--error)",
        "surface-variant": "var(--surface-variant)",
        "primary-fixed": "var(--primary-fixed)",
        "on-tertiary-container": "var(--on-tertiary-container)",
        "tertiary-fixed": "var(--tertiary-fixed)",
        "secondary": "var(--secondary)",
        "surface-container-lowest": "var(--surface-container-lowest)",
        "secondary-fixed": "var(--secondary-fixed)",
        "on-surface-variant": "var(--on-surface-variant)",
        "on-background": "var(--on-background)",
        "on-primary-fixed-variant": "var(--on-primary-fixed-variant)",
        "on-surface": "var(--on-surface)",
        "outline": "var(--outline)",
        "space": {
          900: "var(--space-900)",
          800: "var(--space-800)",
          700: "var(--space-700)"
        }
      },
      borderRadius: {
        "DEFAULT": "0.25rem",
        "lg": "0.5rem",
        "xl": "0.75rem",
        "full": "9999px"
      },
      spacing: {
        "unit": "8px",
        "section-gap": "40px",
        "gutter": "16px",
        "card-padding": "20px",
        "container-margin": "24px"
      },
      fontFamily: {
        "body-md": ["Inter"],
        "label-sm": ["Inter"],
        "headline-lg": ["Plus Jakarta Sans"],
        "headline-md": ["Plus Jakarta Sans"],
        "display-lg": ["Plus Jakarta Sans"],
        "headline-lg-mobile": ["Plus Jakarta Sans"],
        "body-lg": ["Inter"],
        "label-md": ["Inter"]
      },
      fontSize: {
        "body-md": ["16px", { "lineHeight": "24px", "fontWeight": "400" }],
        "label-sm": ["12px", { "lineHeight": "16px", "fontWeight": "500" }],
        "headline-lg": ["32px", { "lineHeight": "40px", "letterSpacing": "-0.01em", "fontWeight": "700" }],
        "headline-md": ["24px", { "lineHeight": "32px", "fontWeight": "600" }],
        "display-lg": ["48px", { "lineHeight": "56px", "letterSpacing": "-0.02em", "fontWeight": "800" }],
        "headline-lg-mobile": ["24px", { "lineHeight": "32px", "fontWeight": "700" }],
        "body-lg": ["18px", { "lineHeight": "28px", "fontWeight": "400" }],
        "label-md": ["14px", { "lineHeight": "20px", "letterSpacing": "0.02em", "fontWeight": "600" }]
      }
    }
  },
  plugins: []
};

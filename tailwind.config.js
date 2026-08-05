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
        "tertiary-container": "#00a74b",
        "on-tertiary-fixed": "#002109",
        "surface-bright": "#31394d",
        "surface-container-highest": "#2d3449",
        "primary-container": "#29a195",
        "error-container": "#93000a",
        "on-primary-fixed": "#00201d",
        "on-error-container": "#ffdad6",
        "on-error": "#690005",
        "on-secondary-fixed": "#341100",
        "secondary-container": "#ec6a06",
        "inverse-surface": "#dae2fd",
        "surface-container-low": "#131b2e",
        "on-secondary": "#552100",
        "surface": "#0b1326",
        "primary-fixed-dim": "#6bd8cb",
        "on-primary-container": "#00302b",
        "primary": "#6bd8cb",
        "inverse-on-surface": "#283044",
        "surface-container-high": "#222a3d",
        "on-secondary-container": "#4a1c00",
        "tertiary": "#4ae176",
        "outline-variant": "#3d4947",
        "inverse-primary": "#006a61",
        "on-tertiary-fixed-variant": "#005321",
        "surface-dim": "#0b1326",
        "surface-container": "#171f33",
        "on-secondary-fixed-variant": "#783200",
        "background": "#0b1326",
        "secondary-fixed-dim": "#ffb690",
        "on-primary": "#003732",
        "surface-tint": "#6bd8cb",
        "on-tertiary": "#003915",
        "tertiary-fixed-dim": "#4ae176",
        "error": "#ffb4ab",
        "surface-variant": "#2d3449",
        "primary-fixed": "#89f5e7",
        "on-tertiary-container": "#003111",
        "tertiary-fixed": "#6bff8f",
        "secondary": "#ffb690",
        "surface-container-lowest": "#060e20",
        "secondary-fixed": "#ffdbca",
        "on-surface-variant": "#bcc9c6",
        "on-background": "#dae2fd",
        "on-primary-fixed-variant": "#005049",
        "on-surface": "#dae2fd",
        "outline": "#879391",
        "space": {
          900: "#0B0D17",
          800: "#161925",
          700: "#232946"
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

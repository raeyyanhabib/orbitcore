// postcss.config.js
// Configuration file for PostCSS to process Tailwind CSS and browser prefixing

module.exports = {
  
  // Define plugins to process CSS files
  plugins: {
    
    // 1. Process Tailwind CSS directives
    tailwindcss: {},

    // 2. Automatically add browser vendor prefixes (e.g., -webkit-, -moz-) for compatibility
    autoprefixer: {}

  }

};

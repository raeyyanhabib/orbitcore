// src/renderer/main.jsx
// React entry point file. Mounts the root component to the HTML DOM.

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";


/**
 * Top-level React Error Boundary component to prevent rendering exceptions
 * from blanking out the Electron window frame silently.
 */
class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  // Invoked after a child component throws an error to update the display state
  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  // Invoked to log the error details to the local application log file
  componentDidCatch(error, errorInfo) {
    // Write details to log file using whitelisted bridge method
    window.electronAPI.writeLogEntry("ERROR", `Render crash details: ${error.message}`);
  }

  render() {
    // Render placeholder safety screen if crash occurred
    if (this.state.hasError) {
      return (
        <div className="p-8 text-center text-gray-400 bg-space-900 h-screen flex flex-col items-center justify-center space-y-4">
          <div className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-rose-500 font-space">
            SOMETHING WENT WRONG
          </div>
          
          <p className="text-sm">
            The user interface crashed. Check the log file from the settings, or restart Orbit.
          </p>
        </div>
      );
    }

    // Render regular application content if normal
    return this.props.children;
  }
}


// Locate the mounting DOM node and initialize render wrapped with Error Boundary
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </React.StrictMode>
);

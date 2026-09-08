import React, { useEffect, useRef } from 'react';

/**
 * AppShell — light cream wrapper for all portals.
 * Renders the full-page layout: sticky header + scrollable content area.
 */
export default function AppShell({ header, children }) {
  return (
    <div className="app-shell">
      {header}
      <div className="app-container">
        {children}
      </div>
    </div>
  );
}

import React from 'react'

// Vitest + node resolves some JSX to classic runtime for components under test; match runtime globals.
globalThis.React = React

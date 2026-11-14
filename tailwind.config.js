/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Project palette (Bio-Gothic UI)
        bio: '#10b981',      // Bioluminescent Emerald
        neural: '#06b6d4',   // Neural Cyan
        arterial: '#ef4444', // Arterial Crimson
        obsidian: '#020617', // Deep Lab Obsidian
      },
    },
  },
  plugins: [],
}

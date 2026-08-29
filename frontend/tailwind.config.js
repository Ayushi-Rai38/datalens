/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef4ff",
          100: "#d9e6ff",
          500: "#4f6df5",
          600: "#3d55d6",
          700: "#2f42ab",
        },
      },
    },
  },
  plugins: [],
};

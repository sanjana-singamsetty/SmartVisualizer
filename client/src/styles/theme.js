import { createTheme } from "@mantine/core";

export const theme = createTheme({
  primaryColor: "violet",
  fontFamily: "'Inter', 'Segoe UI', sans-serif",
  defaultRadius: "md",
  // No hardcoded dark backgrounds — let Mantine handle both schemes
});

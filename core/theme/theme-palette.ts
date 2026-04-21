import { ThemeMode } from "@/core/theme/theme";

export const themeCssVariables: Record<ThemeMode, Record<string, string>> = {
  light: {
    "--background": "#f5f5f3",
    "--foreground": "#0a0a0a",
    "--panel": "#ffffff",
    "--panel-2": "rgba(10, 10, 10, 0.02)",
    "--line": "rgba(10, 10, 10, 0.08)",
    "--line-strong": "rgba(10, 10, 10, 0.12)",
    "--positive": "#1f7a4d",
    "--negative": "#a94442",
    "--placeholder": "rgba(10, 10, 10, 0.34)",
    "--color-black": "#0a0a0a",
    "--color-white": "#ffffff",
    "--radius": "10px",
  },
  dark: {
    "--background": "#0f1012",
    "--foreground": "#f5f5f3",
    "--panel": "#141518",
    "--panel-2": "rgba(245, 245, 243, 0.03)",
    "--line": "rgba(245, 245, 243, 0.14)",
    "--line-strong": "rgba(245, 245, 243, 0.2)",
    "--positive": "#45a778",
    "--negative": "#cf7272",
    "--placeholder": "rgba(245, 245, 243, 0.4)",
    "--color-black": "#f5f5f3",
    "--color-white": "#141518",
    "--radius": "10px",
  },
};


export const tokens = {
  color: {
    brand: {
      50: "#fef2f2",
      100: "#fee2e2",
      200: "#fecaca",
      300: "#fca5a5",
      400: "#f87171",
      500: "#ef4444",
      600: "#dc2626",
      700: "#b91c1c",
      800: "#991b1b",
      900: "#7f1d1d"
    },
    success: "#15803d",
    warning: "#c2410c",
    danger: "#b91c1c",
    surface: "#ffffff",
    surfaceMuted: "#f8fafc",
    text: "#0f172a",
    textMuted: "#64748b",
    border: "#e2e8f0"
  },
  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32
  },
  typography: {
    family: {
      sans: "'Inter', 'Segoe UI', sans-serif"
    },
    size: {
      xs: 12,
      sm: 14,
      md: 16,
      lg: 20,
      xl: 24,
      xxl: 32
    },
    weight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700
    }
  }
} as const;

export type DesignTokens = typeof tokens;

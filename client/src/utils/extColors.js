export const EXT_COLORS = {
  js:      "#7C3AED",
  jsx:     "#9333EA",
  ts:      "#6366F1",
  tsx:     "#818CF8",
  py:      "#3B82F6",
  md:      "#60A5FA",
  json:    "#F472B6",
  css:     "#34D399",
  scss:    "#10B981",
  html:    "#FB923C",
  sh:      "#FBBF24",
  yml:     "#FCD34D",
  yaml:    "#FCD34D",
  go:      "#22D3EE",
  rs:      "#F97316",
  java:    "#EF4444",
  rb:      "#E11D48",
  php:     "#A78BFA",
  default: "#9CA3AF",
};

export function colorForExt(ext) {
  return EXT_COLORS[ext?.toLowerCase()] ?? EXT_COLORS.default;
}

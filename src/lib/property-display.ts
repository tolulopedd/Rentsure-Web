export function propertyDisplayName(property: { name: string; summaryLabel?: string | null }) {
  return property.name || property.summaryLabel || "-";
}

export function propertyUnitDisplayName(unit?: { label?: string | null; summaryLabel?: string | null } | null) {
  return unit?.label || unit?.summaryLabel || "-";
}

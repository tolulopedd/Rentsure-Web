export function propertyDisplayName(property: { name: string; summaryLabel?: string | null }) {
  return property.name || property.summaryLabel || "-";
}

export function propertyUnitDisplayName(unit?: { label?: string | null; summaryLabel?: string | null } | null) {
  return unit?.label || unit?.summaryLabel || "-";
}

export function occupancyLabel(isOccupied?: boolean | null) {
  return isOccupied ? "Occupied" : "Vacant";
}

export function occupancyBadgeClass(isOccupied?: boolean | null) {
  return isOccupied
    ? "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-50"
    : "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-50";
}

export function propertyUnitStatusSummary(unit?: { label?: string | null; isOccupied?: boolean | null } | null) {
  if (!unit) return "-";
  return `${propertyUnitDisplayName(unit)} · ${occupancyLabel(unit.isOccupied)}`;
}

export function propertyUnitsStatusSummary(
  units: Array<{ label?: string | null; isOccupied?: boolean | null }> | null | undefined
) {
  if (!units?.length) return "No units";
  return units.map((unit) => `${unit.label || "Unit"} (${occupancyLabel(unit.isOccupied)})`).join(", ");
}

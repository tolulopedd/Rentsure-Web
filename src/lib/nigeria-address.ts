import type { MapboxSearchSuggestion } from "@/lib/mapbox-search";

export const NIGERIA_ADDRESS_PLACEHOLDER = "e.g No 64 Adeniyi Jones, Ladipo Oluwole Busstop";

function normalizeSegment(value: string) {
  return value.trim().toLowerCase().replace(/\./g, "").replace(/\s+/g, " ");
}

function normalizeAddressSearch(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/,/g, " ")
    .replace(/\bnumber\b/g, "no")
    .replace(/\bno\s+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isAdministrativeSegment(segment: string, city?: string, state?: string) {
  const normalized = normalizeSegment(segment);
  if (!normalized) return true;

  const stateVariants = [
    state,
    state ? `${state} state` : "",
    state === "FCT Abuja" ? "fct" : "",
    state === "FCT Abuja" ? "abuja fct" : "",
    state === "FCT Abuja" ? "federal capital territory" : ""
  ]
    .filter(Boolean)
    .map((value) => normalizeSegment(String(value)));

  const cityVariants = [city].filter(Boolean).map((value) => normalizeSegment(String(value)));
  const genericVariants = ["nigeria", "ng", "lagos nigeria", "abuja nigeria"];

  return [...stateVariants, ...cityVariants, ...genericVariants].includes(normalized);
}

function uniqueParts(parts: string[]) {
  return parts.filter((part, index) => parts.findIndex((candidate) => normalizeSegment(candidate) === normalizeSegment(part)) === index);
}

export function stripAdministrativeAddressParts(value: string, city?: string, state?: string) {
  const parts = value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  while (parts.length > 1 && isAdministrativeSegment(parts[parts.length - 1] || "", city, state)) {
    parts.pop();
  }

  return parts.join(", ");
}

export function formatNigeriaAddressSuggestion(
  suggestion: MapboxSearchSuggestion,
  fallback?: { city?: string; state?: string }
) {
  const city =
    fallback?.city || suggestion.context?.locality?.name || suggestion.context?.place?.name || suggestion.name_preferred || suggestion.name || "";
  const state = fallback?.state || suggestion.context?.region?.name || "";
  const neighborhood = suggestion.context?.neighborhood?.name || "";
  const baseLine = stripAdministrativeAddressParts(
    suggestion.full_address || suggestion.address || suggestion.place_formatted || suggestion.name_preferred || suggestion.name || "",
    city,
    state
  );

  const parts = uniqueParts([baseLine, neighborhood].filter(Boolean));
  return parts.join(", ");
}

export function formatNigeriaFallbackAddress(value: string, city?: string, state?: string) {
  return stripAdministrativeAddressParts(value, city, state);
}

export function addressSearchMatches(candidate: string, query: string) {
  const normalizedCandidate = normalizeAddressSearch(candidate);
  const normalizedQuery = normalizeAddressSearch(query);

  if (!normalizedQuery) return true;
  if (normalizedCandidate.includes(normalizedQuery)) return true;

  const queryParts = normalizedQuery.split(" ").filter(Boolean);
  return queryParts.every((part) => normalizedCandidate.includes(part));
}

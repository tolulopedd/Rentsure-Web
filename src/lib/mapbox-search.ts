export type MapboxSearchContextItem = {
  name: string;
};

export type MapboxSearchSuggestion = {
  name: string;
  name_preferred?: string;
  mapbox_id: string;
  feature_type: string;
  address?: string;
  full_address?: string;
  place_formatted?: string;
  context?: {
    region?: MapboxSearchContextItem;
    place?: MapboxSearchContextItem;
    locality?: MapboxSearchContextItem;
    neighborhood?: MapboxSearchContextItem;
    country?: MapboxSearchContextItem & { country_code?: string };
  };
};

type SearchMapboxSuggestionsInput = {
  accessToken: string;
  query: string;
  sessionToken: string;
  types: string[];
  limit?: number;
  country?: string;
};

const MAPBOX_SEARCHBOX_SUGGEST_URL = "https://api.mapbox.com/search/searchbox/v1/suggest";

export async function searchMapboxSuggestions(input: SearchMapboxSuggestionsInput): Promise<MapboxSearchSuggestion[]> {
  const params = new URLSearchParams({
    q: input.query,
    access_token: input.accessToken,
    session_token: input.sessionToken,
    language: "en",
    limit: String(input.limit ?? 6),
    country: input.country ?? "NG",
    types: input.types.join(",")
  });

  const response = await fetch(`${MAPBOX_SEARCHBOX_SUGGEST_URL}?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Mapbox search request failed with status ${response.status}`);
  }

  const payload = (await response.json()) as { suggestions?: MapboxSearchSuggestion[] };
  return payload.suggestions ?? [];
}


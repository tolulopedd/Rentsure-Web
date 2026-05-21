import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { searchMapboxSuggestions, type MapboxSearchSuggestion } from "@/lib/mapbox-search";
import { fallbackNigeriaAddressSuggestions, nigerianStates, nigeriaStateCityMap } from "@/lib/nigeria-locations";

type MapboxAddressFieldsProps = {
  stateValue: string;
  cityValue: string;
  addressValue: string;
  onStateChange: (value: string) => void;
  onCityChange: (value: string) => void;
  onAddressChange: (value: string) => void;
};

function normalizeLocationName(value: string) {
  return value.trim().toLowerCase().replace(/\s+state$/, "");
}

function mapboxCityLabel(suggestion: MapboxSearchSuggestion) {
  return suggestion.context?.locality?.name || suggestion.context?.place?.name || suggestion.name_preferred || suggestion.name || "";
}

function mapboxStateLabel(suggestion: MapboxSearchSuggestion) {
  return suggestion.context?.region?.name || "";
}

function mapboxAddressLabel(suggestion: MapboxSearchSuggestion) {
  return suggestion.full_address || suggestion.address || suggestion.name_preferred || suggestion.name || "";
}

export function MapboxAddressFields({
  stateValue,
  cityValue,
  addressValue,
  onStateChange,
  onCityChange,
  onAddressChange
}: MapboxAddressFieldsProps) {
  const mapboxAccessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN?.trim() || "";
  const [stateQuery, setStateQuery] = useState(stateValue);
  const [cityQuery, setCityQuery] = useState(cityValue);
  const [showStateLov, setShowStateLov] = useState(false);
  const [showCityLov, setShowCityLov] = useState(false);
  const [showAddressLov, setShowAddressLov] = useState(false);
  const [citySuggestions, setCitySuggestions] = useState<MapboxSearchSuggestion[]>([]);
  const [addressSuggestions, setAddressSuggestions] = useState<MapboxSearchSuggestion[]>([]);
  const [cityLookupLoading, setCityLookupLoading] = useState(false);
  const [addressLookupLoading, setAddressLookupLoading] = useState(false);
  const [searchSessionToken, setSearchSessionToken] = useState(() => crypto.randomUUID());

  useEffect(() => {
    setStateQuery(stateValue);
  }, [stateValue]);

  useEffect(() => {
    setCityQuery(cityValue);
  }, [cityValue]);

  const filteredStates = useMemo(() => {
    const query = stateQuery.trim().toLowerCase();
    if (!query) return nigerianStates;
    return nigerianStates.filter((state) => state.toLowerCase().includes(query));
  }, [stateQuery]);

  const filteredCities = useMemo(() => {
    const query = cityQuery.trim().toLowerCase();
    const fallbackCities = stateValue ? nigeriaStateCityMap[stateValue] ?? [] : [];
    return fallbackCities.filter((city) => !query || city.toLowerCase().includes(query));
  }, [cityQuery, stateValue]);

  const filteredAddresses = useMemo(() => {
    const query = addressValue.trim().toLowerCase();
    return Array.from(
      new Map(
        fallbackNigeriaAddressSuggestions
          .filter((item) => (!stateValue || item.state === stateValue) && (!cityValue || item.city === cityValue))
          .filter((item) => !query || item.value.toLowerCase().includes(query))
          .map((item) => [item.value, item])
      ).values()
    ).slice(0, 6);
  }, [addressValue, cityValue, stateValue]);

  useEffect(() => {
    if (!showCityLov) {
      setCitySuggestions([]);
      setCityLookupLoading(false);
      return;
    }

    const query = cityQuery.trim();
    if (!mapboxAccessToken || query.length < 2) {
      setCitySuggestions([]);
      setCityLookupLoading(false);
      return;
    }

    let isCancelled = false;
    const timeoutId = window.setTimeout(async () => {
      try {
        setCityLookupLoading(true);
        const suggestions = await searchMapboxSuggestions({
          accessToken: mapboxAccessToken,
          query: stateValue ? `${query} ${stateValue}` : query,
          sessionToken: searchSessionToken,
          types: ["city", "locality", "place"],
          limit: 6
        });

        if (isCancelled) return;

        const nextSuggestions = suggestions.filter((suggestion) => {
          if (!stateValue) return true;
          const regionName = mapboxStateLabel(suggestion);
          return !regionName || normalizeLocationName(regionName) === normalizeLocationName(stateValue);
        });

        setCitySuggestions(nextSuggestions);
      } catch {
        if (!isCancelled) setCitySuggestions([]);
      } finally {
        if (!isCancelled) setCityLookupLoading(false);
      }
    }, 250);

    return () => {
      isCancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [cityQuery, mapboxAccessToken, searchSessionToken, showCityLov, stateValue]);

  useEffect(() => {
    if (!showAddressLov) {
      setAddressSuggestions([]);
      setAddressLookupLoading(false);
      return;
    }

    const query = addressValue.trim();
    if (!mapboxAccessToken || query.length < 3) {
      setAddressSuggestions([]);
      setAddressLookupLoading(false);
      return;
    }

    let isCancelled = false;
    const timeoutId = window.setTimeout(async () => {
      try {
        setAddressLookupLoading(true);
        const suggestions = await searchMapboxSuggestions({
          accessToken: mapboxAccessToken,
          query: [query, cityValue, stateValue].filter(Boolean).join(" "),
          sessionToken: searchSessionToken,
          types: ["address", "street"],
          limit: 6
        });

        if (isCancelled) return;

        const nextSuggestions = suggestions.filter((suggestion) => {
          const regionName = mapboxStateLabel(suggestion);
          const cityName = mapboxCityLabel(suggestion);
          const stateMatches = !stateValue || !regionName || normalizeLocationName(regionName) === normalizeLocationName(stateValue);
          const cityMatches = !cityValue || !cityName || normalizeLocationName(cityName) === normalizeLocationName(cityValue);
          return stateMatches && cityMatches;
        });

        setAddressSuggestions(nextSuggestions);
      } catch {
        if (!isCancelled) setAddressSuggestions([]);
      } finally {
        if (!isCancelled) setAddressLookupLoading(false);
      }
    }, 250);

    return () => {
      isCancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [addressValue, cityValue, mapboxAccessToken, searchSessionToken, showAddressLov, stateValue]);

  const visibleCitySuggestions = useMemo(() => {
    const mapboxItems = citySuggestions.map((suggestion) => ({
      key: suggestion.mapbox_id,
      city: mapboxCityLabel(suggestion),
      state: mapboxStateLabel(suggestion)
    }));
    const fallbackItems = filteredCities.map((city) => ({
      key: `fallback-${city}`,
      city,
      state: stateValue
    }));

    return Array.from(new Map([...mapboxItems, ...fallbackItems].map((item) => [item.key, item])).values()).slice(0, 6);
  }, [citySuggestions, filteredCities, stateValue]);

  const visibleAddressSuggestions = useMemo(() => {
    const mapboxItems = addressSuggestions.map((suggestion) => ({
      key: suggestion.mapbox_id,
      address: mapboxAddressLabel(suggestion),
      city: mapboxCityLabel(suggestion) || cityValue,
      state: mapboxStateLabel(suggestion) || stateValue
    }));
    const fallbackItems = filteredAddresses.map((suggestion) => ({
      key: `fallback-${suggestion.value}`,
      address: suggestion.value,
      city: suggestion.city,
      state: suggestion.state
    }));

    return Array.from(new Map([...mapboxItems, ...fallbackItems].map((item) => [item.key, item])).values()).slice(0, 6);
  }, [addressSuggestions, cityValue, filteredAddresses, stateValue]);

  function selectState(state: string) {
    setStateQuery(state);
    setShowStateLov(false);
    onStateChange(state);
    setSearchSessionToken(crypto.randomUUID());
  }

  function selectCity(city: string, state?: string) {
    setCityQuery(city);
    setShowCityLov(false);
    onCityChange(city);
    if (state) {
      setStateQuery(state);
      onStateChange(state);
    }
    setSearchSessionToken(crypto.randomUUID());
  }

  function selectAddress(address: string, city?: string, state?: string) {
    onAddressChange(address);
    if (state) {
      setStateQuery(state);
      onStateChange(state);
    }
    if (city) {
      setCityQuery(city);
      onCityChange(city);
    }
    setShowAddressLov(false);
    setSearchSessionToken(crypto.randomUUID());
  }

  return (
    <>
      <div className="space-y-2">
        <Label>Address</Label>
        <div
          className="relative"
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
              setShowAddressLov(false);
            }
          }}
        >
          <Input
            className="bg-white"
            value={addressValue}
            onChange={(event) => {
              onAddressChange(event.target.value);
              setShowAddressLov(true);
            }}
            onFocus={() => setShowAddressLov(true)}
            placeholder={cityValue ? `Start typing an address in ${cityValue}` : "Start typing an address"}
          />
          {showAddressLov ? (
            <LovPanel>
              {addressLookupLoading ? <LovEmpty text="Searching address suggestions..." /> : null}
              {!addressLookupLoading && visibleAddressSuggestions.length ? (
                visibleAddressSuggestions.map((suggestion) => (
                  <LovButton
                    key={suggestion.key}
                    onClick={() => selectAddress(suggestion.address, suggestion.city || undefined, suggestion.state || undefined)}
                  >
                    <span>{suggestion.address}</span>
                    {suggestion.city || suggestion.state ? (
                      <span className="text-xs uppercase tracking-[0.12em] text-slate-400">
                        {[suggestion.city, suggestion.state].filter(Boolean).join(", ")}
                      </span>
                    ) : null}
                  </LovButton>
                ))
              ) : null}
              {!addressLookupLoading && !visibleAddressSuggestions.length ? (
                <LovEmpty
                  text={
                    mapboxAccessToken
                      ? "No address suggestion matched yet. Keep typing to refine the address."
                      : "Set VITE_MAPBOX_ACCESS_TOKEN to use live address suggestions."
                  }
                />
              ) : null}
            </LovPanel>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>State</Label>
          <div
            className="relative"
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                setShowStateLov(false);
              }
            }}
          >
            <Input
              className="bg-white"
              value={stateQuery}
              onChange={(event) => {
                const nextValue = event.target.value;
                setStateQuery(nextValue);
                setShowStateLov(true);
                onStateChange(nextValue);
              }}
              onFocus={() => setShowStateLov(true)}
              placeholder="Type to search states in Nigeria"
            />
            {showStateLov ? (
              <LovPanel>
                {filteredStates.length ? (
                  filteredStates.map((state) => (
                    <LovButton key={state} onClick={() => selectState(state)}>
                      <span>{state}</span>
                      {stateValue === state ? <SelectedPill /> : null}
                    </LovButton>
                  ))
                ) : (
                  <LovEmpty text="No Nigerian state matches that search." />
                )}
              </LovPanel>
            ) : null}
          </div>
        </div>

        <div className="space-y-2">
          <Label>City/Town</Label>
          <div
            className="relative"
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                setShowCityLov(false);
              }
            }}
          >
            <Input
              className="bg-white"
              value={cityQuery}
              onChange={(event) => {
                const nextValue = event.target.value;
                setCityQuery(nextValue);
                setShowCityLov(true);
                onCityChange(nextValue);
              }}
              onFocus={() => setShowCityLov(true)}
              placeholder={stateValue ? `Type to search cities in ${stateValue}` : "Type to search city/town"}
            />
            {showCityLov ? (
              <LovPanel>
                {cityLookupLoading ? <LovEmpty text="Searching city/town suggestions..." /> : null}
                {!cityLookupLoading && visibleCitySuggestions.length ? (
                  visibleCitySuggestions.map((suggestion) => (
                    <LovButton key={suggestion.key} onClick={() => selectCity(suggestion.city, suggestion.state || undefined)}>
                      <div className="flex items-center justify-between gap-3">
                        <span>{suggestion.city}</span>
                        {suggestion.state ? <span className="text-xs uppercase tracking-[0.12em] text-slate-400">{suggestion.state}</span> : null}
                      </div>
                      {cityValue === suggestion.city ? <SelectedPill /> : null}
                    </LovButton>
                  ))
                ) : null}
                {!cityLookupLoading && !visibleCitySuggestions.length ? (
                  <LovEmpty
                    text={
                      mapboxAccessToken
                        ? "No city/town suggestion matched that search. Continue typing to use your own city/town."
                        : "Set VITE_MAPBOX_ACCESS_TOKEN to use live city/town suggestions."
                    }
                  />
                ) : null}
              </LovPanel>
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
}

function LovPanel({ children }: { children: ReactNode }) {
  return (
    <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-20 max-h-64 overflow-y-auto rounded-[1.25rem] border border-slate-200 bg-white p-2 shadow-[0_22px_40px_-26px_rgba(15,23,42,0.35)]">
      {children}
    </div>
  );
}

function LovButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className="flex w-full items-start justify-between gap-4 rounded-xl px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50"
    >
      {children}
    </button>
  );
}

function LovEmpty({ text }: { text: string }) {
  return <div className="px-3 py-2 text-sm text-slate-500">{text}</div>;
}

function SelectedPill() {
  return <span className="text-xs font-medium uppercase tracking-[0.12em] text-[var(--rentsure-blue)]">Selected</span>;
}

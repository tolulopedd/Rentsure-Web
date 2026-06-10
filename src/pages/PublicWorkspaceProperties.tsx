import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getErrorMessage } from "@/lib/errors";
import {
  addressSearchMatches,
  formatNigeriaAddressSuggestion,
  formatNigeriaFallbackAddress,
  NIGERIA_ADDRESS_PLACEHOLDER
} from "@/lib/nigeria-address";
import { searchMapboxSuggestions, type MapboxSearchSuggestion } from "@/lib/mapbox-search";
import { fallbackNigeriaAddressSuggestions, nigerianStates, nigeriaStateCityMap } from "@/lib/nigeria-locations";
import {
  createWorkspaceProperty,
  listWorkspaceProperties,
  shareWorkspaceProperty,
  updateWorkspaceProperty,
  type WorkspaceProperty
} from "@/lib/public-workspace-api";

type PropertyType = "Duplex" | "Flats" | "Self Contain" | "Mansion" | "Boys Quater";

type PropertyDraft = {
  name: string;
  ownerName: string;
  landlordEmail: string;
  propertyType: PropertyType;
  state: string;
  city: string;
  address: string;
  units: Array<{
    label: string;
    bedroomCount: number;
    bathroomCount: number;
    isOccupied: boolean;
    currentTenantName: string;
    currentTenantEmail: string;
    currentTenantPhone: string;
  }>;
};

const propertyTypeOptions: PropertyType[] = ["Duplex", "Flats", "Self Contain", "Mansion", "Boys Quater"];

function createInitialDraft(): PropertyDraft {
  const rawRole = (localStorage.getItem("userRole") || "LANDLORD").toUpperCase();
  const userName = localStorage.getItem("userName") || "";
  const userEmail = localStorage.getItem("userEmail") || "";

  return {
    name: "",
    ownerName: rawRole === "LANDLORD" ? userName : "",
    landlordEmail: rawRole === "LANDLORD" ? userEmail : "",
    propertyType: "Flats",
    state: "",
    city: "",
    address: "",
    units: [
      {
        label: "Ground Floor",
        bedroomCount: 2,
        bathroomCount: 2,
        isOccupied: false,
        currentTenantName: "",
        currentTenantEmail: "",
        currentTenantPhone: ""
      }
    ]
  };
}

export default function PublicWorkspaceProperties() {
  const [items, setItems] = useState<WorkspaceProperty[]>([]);
  const [draft, setDraft] = useState<PropertyDraft>(() => createInitialDraft());
  const [shareEmailById, setShareEmailById] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingPropertyId, setEditingPropertyId] = useState<string | null>(null);
  const [stateQuery, setStateQuery] = useState("");
  const [cityQuery, setCityQuery] = useState("");
  const [showStateLov, setShowStateLov] = useState(false);
  const [showCityLov, setShowCityLov] = useState(false);
  const [showAddressLov, setShowAddressLov] = useState(false);
  const [citySuggestions, setCitySuggestions] = useState<MapboxSearchSuggestion[]>([]);
  const [addressSuggestions, setAddressSuggestions] = useState<MapboxSearchSuggestion[]>([]);
  const [cityLookupLoading, setCityLookupLoading] = useState(false);
  const [addressLookupLoading, setAddressLookupLoading] = useState(false);
  const [searchSessionToken, setSearchSessionToken] = useState(() => crypto.randomUUID());

  const rawRole = (localStorage.getItem("userRole") || "LANDLORD").toUpperCase();
  const isLandlord = rawRole === "LANDLORD";
  const mapboxAccessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN?.trim() || "";

  async function loadProperties() {
    try {
      setLoading(true);
      setError(null);
      const response = await listWorkspaceProperties();
      setItems(response.items);
    } catch (loadError: unknown) {
      setError(getErrorMessage(loadError, "Failed to load properties"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadProperties();
  }, []);

  useEffect(() => {
    setStateQuery(draft.state);
  }, [draft.state]);

  useEffect(() => {
    setCityQuery(draft.city);
  }, [draft.city]);

  function resetForm() {
    setDraft(createInitialDraft());
    setShowAddForm(false);
    setEditingPropertyId(null);
    setStateQuery("");
    setCityQuery("");
    setShowStateLov(false);
    setShowCityLov(false);
    setShowAddressLov(false);
    setCitySuggestions([]);
    setAddressSuggestions([]);
    setSearchSessionToken(crypto.randomUUID());
  }

  function draftFromProperty(property: WorkspaceProperty): PropertyDraft {
    return {
      name: property.name,
      ownerName: property.ownerName,
      landlordEmail: property.landlordEmail,
      propertyType: (property.propertyType as PropertyType) || "Flats",
      state: property.state,
      city: property.city,
      address: property.address,
      units: property.units.length
        ? property.units.map((unit) => ({
            label: unit.label,
            bedroomCount: unit.bedroomCount,
            bathroomCount: unit.bathroomCount,
            isOccupied: unit.isOccupied,
            currentTenantName: unit.currentTenantName || "",
            currentTenantEmail: unit.currentTenantEmail || "",
            currentTenantPhone: unit.currentTenantPhone || ""
          }))
        : createInitialDraft().units
    };
  }

  function startEditingProperty(property: WorkspaceProperty) {
    setDraft(draftFromProperty(property));
    setEditingPropertyId(property.id);
    setShowAddForm(true);
    setStateQuery(property.state);
    setCityQuery(property.city);
    setShowStateLov(false);
    setShowCityLov(false);
    setShowAddressLov(false);
    setCitySuggestions([]);
    setAddressSuggestions([]);
    setSearchSessionToken(crypto.randomUUID());
  }

  function normalizeLocationName(value: string) {
    return value.trim().toLowerCase().replace(/\s+state$/, "");
  }

  function mapboxCityLabel(suggestion: MapboxSearchSuggestion) {
    return suggestion.name_preferred || suggestion.name;
  }

  function mapboxStateLabel(suggestion: MapboxSearchSuggestion) {
    return suggestion.context?.region?.name || "";
  }

  function mapboxResolvedCity(suggestion: MapboxSearchSuggestion) {
    return suggestion.context?.locality?.name || suggestion.context?.place?.name || mapboxCityLabel(suggestion) || "";
  }

  function mapboxSuggestionMatchesCity(suggestion: MapboxSearchSuggestion, city: string) {
    const expected = normalizeLocationName(city);
    const candidates = [suggestion.context?.locality?.name, suggestion.context?.place?.name, suggestion.name_preferred, suggestion.name]
      .filter(Boolean)
      .map((value) => normalizeLocationName(String(value)));

    return candidates.some((value) => value === expected);
  }

  const filteredStates = useMemo(() => {
    const query = stateQuery.trim().toLowerCase();
    if (!query) return nigerianStates;
    return nigerianStates.filter((state) => state.toLowerCase().includes(query));
  }, [stateQuery]);

  const filteredCities = useMemo(() => {
    const query = cityQuery.trim().toLowerCase();
    const cities = draft.state ? nigeriaStateCityMap[draft.state] ?? [] : [];
    return cities.filter((city) => !query || city.toLowerCase().includes(query));
  }, [cityQuery, draft.state]);

  const filteredAddresses = useMemo(() => {
    const query = draft.address.trim();
    return Array.from(
      new Map(
        fallbackNigeriaAddressSuggestions
          .filter((item) => (!draft.state || item.state === draft.state) && (!draft.city || item.city === draft.city))
          .filter((item) => !query || addressSearchMatches(item.value, query))
          .map((item) => [item.value, item])
      ).values()
    ).slice(0, 6);
  }, [draft.address, draft.city, draft.state]);

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
          query: draft.state ? `${query} ${draft.state}` : query,
          sessionToken: searchSessionToken,
          types: ["city", "locality", "place"],
          limit: 6
        });

        if (isCancelled) return;

        const nextSuggestions = suggestions.filter((suggestion) => {
          if (!draft.state) return true;
          const regionName = mapboxStateLabel(suggestion);
          return !regionName || normalizeLocationName(regionName) === normalizeLocationName(draft.state);
        });

        setCitySuggestions(nextSuggestions);
      } catch {
        if (!isCancelled) {
          setCitySuggestions([]);
        }
      } finally {
        if (!isCancelled) {
          setCityLookupLoading(false);
        }
      }
    }, 250);

    return () => {
      isCancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [cityQuery, draft.state, mapboxAccessToken, searchSessionToken, showCityLov]);

  useEffect(() => {
    if (!showAddressLov) {
      setAddressSuggestions([]);
      setAddressLookupLoading(false);
      return;
    }

    const query = draft.address.trim();
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
          query: [query, draft.city, draft.state].filter(Boolean).join(" "),
          sessionToken: searchSessionToken,
          types: ["address", "street", "poi"],
          limit: 6
        });

        if (isCancelled) return;

        const nextSuggestions = suggestions.filter((suggestion) => {
          const regionName = mapboxStateLabel(suggestion);
          const stateMatches =
            !draft.state || !regionName || normalizeLocationName(regionName) === normalizeLocationName(draft.state);
          const cityMatches = !draft.city || mapboxSuggestionMatchesCity(suggestion, draft.city);
          return stateMatches && cityMatches;
        });

        setAddressSuggestions(nextSuggestions);
      } catch {
        if (!isCancelled) {
          setAddressSuggestions([]);
        }
      } finally {
        if (!isCancelled) {
          setAddressLookupLoading(false);
        }
      }
    }, 250);

    return () => {
      isCancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [draft.address, draft.city, draft.state, mapboxAccessToken, searchSessionToken, showAddressLov]);

  function selectState(state: string) {
    setStateQuery(state);
    setShowStateLov(false);
    setShowCityLov(false);
    setShowAddressLov(false);
    setCitySuggestions([]);
    setAddressSuggestions([]);
    setSearchSessionToken(crypto.randomUUID());
    setDraft((current) => ({
      ...current,
      state,
      city: current.state === state ? current.city : "",
      address: current.state === state ? current.address : ""
    }));
    if (draft.state !== state) {
      setCityQuery("");
    }
  }

  function selectCity(city: string, state?: string) {
    setCityQuery(city);
    setShowCityLov(false);
    setShowAddressLov(false);
    setCitySuggestions([]);
    setAddressSuggestions([]);
    setDraft((current) => ({
      ...current,
      state: state || current.state,
      city,
      address: state && current.state !== state ? "" : current.address
    }));
    if (state) {
      setStateQuery(state);
    }
  }

  function selectAddress(address: string, city?: string, state?: string) {
    setShowAddressLov(false);
    setAddressSuggestions([]);
    setDraft((current) => ({
      ...current,
      state: state || current.state,
      city: city || current.city,
      address
    }));
    if (city) {
      setCityQuery(city);
    }
    if (state) {
      setStateQuery(state);
    }
  }

  function updateUnit(index: number, label: string) {
    setDraft((current) => ({
      ...current,
      units: current.units.map((unit, unitIndex) => (unitIndex === index ? { ...unit, label } : unit))
    }));
  }

  function addUnit() {
    setDraft((current) => ({
      ...current,
      units: [
        ...current.units,
        {
          label: `Unit ${current.units.length + 1}`,
          bedroomCount: 1,
          bathroomCount: 1,
          isOccupied: false,
          currentTenantName: "",
          currentTenantEmail: "",
          currentTenantPhone: ""
        }
      ]
    }));
  }

  function removeUnit(index: number) {
    setDraft((current) => ({
      ...current,
      units: current.units.filter((_, unitIndex) => unitIndex !== index)
    }));
  }

  function validateDraft() {
    if (!draft.name.trim()) return "Enter a property description.";
    if (!draft.ownerName.trim()) return "Enter the property owner name.";
    if (!draft.landlordEmail.trim()) return "Enter the landlord email.";
    if (!draft.state.trim()) return "Select a state.";
    if (!draft.city.trim()) return "Select a city/town.";
    if (!draft.address.trim()) return "Enter the property address.";
    if (!draft.units.length) return "Add at least one unit detail.";
    if (draft.units.some((unit) => !unit.label.trim())) return "Enter a label for each unit detail.";
    if (draft.units.some((unit) => unit.bedroomCount < 1)) return "Enter a valid number of rooms for each unit.";
    if (draft.units.some((unit) => unit.bathroomCount < 1)) return "Enter a valid number of bathrooms for each unit.";
    if (draft.units.some((unit) => unit.isOccupied && !unit.currentTenantName.trim())) {
      return "Enter the current tenant name for each occupied unit.";
    }
    if (draft.units.some((unit) => unit.isOccupied && !unit.currentTenantPhone.trim())) {
      return "Enter the current tenant phone number for each occupied unit.";
    }

    return null;
  }

  async function saveProperty() {
    const validationError = validateDraft();
    if (validationError) {
      toast.error(validationError);
      return;
    }

    try {
      setSaving(true);
      const payload = {
        name: draft.name.trim(),
        ownerName: draft.ownerName.trim(),
        landlordEmail: draft.landlordEmail.trim(),
        propertyType: draft.propertyType,
        bedroomCount: draft.units[0]?.bedroomCount ?? 1,
        bathroomCount: draft.units[0]?.bathroomCount ?? 1,
        state: draft.state.trim(),
        city: draft.city.trim(),
        address: draft.address.trim(),
        units: draft.units.map((unit) => ({
          label: unit.label.trim(),
          bedroomCount: unit.bedroomCount,
          bathroomCount: unit.bathroomCount,
          isOccupied: unit.isOccupied,
          currentTenantName: unit.isOccupied ? unit.currentTenantName.trim() : undefined,
          currentTenantEmail: unit.isOccupied ? unit.currentTenantEmail.trim() : undefined,
          currentTenantPhone: unit.isOccupied ? unit.currentTenantPhone.trim() : undefined
        }))
      };

      if (editingPropertyId) {
        const response = await updateWorkspaceProperty(editingPropertyId, payload);
        setItems(response.items);
        toast.success("Property updated");
      } else {
        const response = await createWorkspaceProperty(payload);
        setItems(response.properties);
        toast.success("Property added to workspace");
      }

      resetForm();
    } catch (saveError: unknown) {
      toast.error(getErrorMessage(saveError, editingPropertyId ? "Failed to update property" : "Failed to create property"));
    } finally {
      setSaving(false);
    }
  }

  async function shareProperty(propertyId: string) {
    const email = shareEmailById[propertyId]?.trim();
    if (!email) {
      toast.error("Enter the agent email to share this property");
      return;
    }

    try {
      const response = await shareWorkspaceProperty(propertyId, email);
      setItems(response.items);
      setShareEmailById((current) => ({ ...current, [propertyId]: "" }));
      toast.success("Property shared with agent");
    } catch (shareError: unknown) {
      toast.error(getErrorMessage(shareError, "Failed to share property"));
    }
  }

  const visibleCitySuggestions = citySuggestions.length
    ? citySuggestions.map((suggestion) => ({
        key: suggestion.mapbox_id,
        city: mapboxCityLabel(suggestion),
        state: mapboxStateLabel(suggestion)
      }))
    : filteredCities.map((city) => ({
        key: city,
        city,
        state: draft.state
      }));

  const visibleAddressSuggestions = addressSuggestions.length
    ? addressSuggestions.map((suggestion) => ({
        key: suggestion.mapbox_id,
        address: formatNigeriaAddressSuggestion(suggestion, { city: draft.city, state: draft.state }),
        city: mapboxResolvedCity(suggestion) || draft.city,
        state: mapboxStateLabel(suggestion) || draft.state
      }))
    : filteredAddresses.map((suggestion) => ({
        key: suggestion.value,
        address: formatNigeriaFallbackAddress(suggestion.value, suggestion.city, suggestion.state),
        city: suggestion.city,
        state: suggestion.state
      }));

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-950 md:text-2xl">Properties</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isLandlord
              ? "Track each linked property by location. Add one property per address, then add another entry when you want to capture a different building, a new location, or another same-location property separately."
              : "Track the properties your linked landlords have attached to your workspace."}
          </p>
        </div>

        {isLandlord ? (
          <Button
            onClick={() => {
              if (showAddForm) {
                resetForm();
                return;
              }

              setShowAddForm(true);
            }}
            className="bg-[var(--rentsure-blue)] hover:bg-[var(--rentsure-blue-deep)]"
          >
            {showAddForm ? <X className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
            {showAddForm ? "Close form" : "Add property"}
          </Button>
        ) : null}
      </div>

      {showAddForm && isLandlord ? (
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">{editingPropertyId ? "Edit property" : "Add property"}</CardTitle>
            <p className="text-sm text-muted-foreground">
              Capture one property location at a time. If the property is already occupied, add the current tenant
              details so the record is easier to identify later.
            </p>
          </CardHeader>
          <CardContent className="space-y-4 md:space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                label="Property description"
                value={draft.name}
                onChange={(value) => setDraft((current) => ({ ...current, name: value }))}
                placeholder="3 bedroom flat at Forthright Estate"
              />
              <div className="space-y-2">
                <Label>Property type</Label>
                <Select
                  value={draft.propertyType}
                  onValueChange={(value: PropertyType) => setDraft((current) => ({ ...current, propertyType: value }))}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Select property type" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {propertyTypeOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>State</Label>
                <div className="relative">
                  <Input
                    className="bg-white"
                    value={stateQuery}
                    onChange={(event) => {
                      const nextValue = event.target.value;
                      setStateQuery(nextValue);
                      setShowStateLov(true);
                      setDraft((current) => ({
                        ...current,
                        state: nextValue,
                        city: current.state === nextValue ? current.city : "",
                        address: current.state === nextValue ? current.address : ""
                      }));
                      if (draft.state !== nextValue) {
                        setCityQuery("");
                      }
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
                            {normalizeLocationName(draft.state) === normalizeLocationName(state) ? <SelectedPill /> : null}
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
                <div className="relative">
                  <Input
                    className="bg-white"
                    value={cityQuery}
                    onChange={(event) => {
                      const nextValue = event.target.value;
                      setCityQuery(nextValue);
                      setShowCityLov(true);
                      setDraft((current) => ({
                        ...current,
                        city: nextValue,
                        address: nextValue === current.city ? current.address : ""
                      }));
                    }}
                    onFocus={() => setShowCityLov(true)}
                    placeholder={draft.state ? `Type to search cities in ${draft.state}` : "Type to search city/town"}
                  />
                  {showCityLov ? (
                    <LovPanel>
                      {cityLookupLoading ? <LovEmpty text="Searching city/town suggestions..." /> : null}
                      {!cityLookupLoading && visibleCitySuggestions.length ? (
                        visibleCitySuggestions.map((suggestion) => (
                          <LovButton key={suggestion.key} onClick={() => selectCity(suggestion.city, suggestion.state || undefined)}>
                            <div className="flex items-center justify-between gap-3">
                              <span>{suggestion.city}</span>
                              {suggestion.state ? (
                                <span className="text-xs uppercase tracking-[0.12em] text-slate-400">{suggestion.state}</span>
                              ) : null}
                            </div>
                            {draft.city === suggestion.city ? <SelectedPill /> : null}
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
              <div className="space-y-2 sm:col-span-2">
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
                    value={draft.address}
                    onChange={(event) => {
                      setDraft((current) => ({ ...current, address: event.target.value }));
                      setShowAddressLov(true);
                    }}
                    onFocus={() => setShowAddressLov(true)}
                    placeholder={NIGERIA_ADDRESS_PLACEHOLDER}
                  />
                  {showAddressLov && (addressLookupLoading || visibleAddressSuggestions.length > 0) ? (
                    <LovPanel>
                      {addressLookupLoading ? <LovEmpty text="Searching address suggestions..." /> : null}
                      {!addressLookupLoading && visibleAddressSuggestions.length ? (
                        visibleAddressSuggestions.map((suggestion) => (
                          <LovButton
                            key={suggestion.key}
                            onClick={() => selectAddress(suggestion.address, suggestion.city || undefined, suggestion.state || undefined)}
                          >
                            <span>{suggestion.address}</span>
                            <span className="text-xs uppercase tracking-[0.12em] text-slate-400">
                              {suggestion.city}, {suggestion.state}
                            </span>
                          </LovButton>
                        ))
                      ) : null}
                    </LovPanel>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                label="Property owner"
                value={draft.ownerName}
                onChange={(value) => setDraft((current) => ({ ...current, ownerName: value }))}
                placeholder={isLandlord ? "Defaults to your landlord profile" : "Enter landlord name"}
              />
              <TextField
                label="Landlord email"
                value={draft.landlordEmail}
                onChange={(value) => setDraft((current) => ({ ...current, landlordEmail: value }))}
                placeholder={isLandlord ? "Defaults to your verified landlord email" : "Enter landlord email"}
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-slate-950">Unit details</p>
                  <p className="text-sm text-muted-foreground">
                    Add the units in this same location, for example Ground Floor, First Floor, or Second Floor.
                  </p>
                </div>
                <Button type="button" variant="outline" onClick={addUnit}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add unit
                </Button>
              </div>

              <div className="space-y-3">
                {draft.units.map((unit, index) => (
                  <div key={`unit-${index}`} className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-3 md:p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-950">
                          {index === 0 ? "Primary unit" : `Additional unit ${index + 1}`}
                        </p>
                        <p className="text-sm text-muted-foreground">Capture the unit detail and occupancy for this specific space.</p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => removeUnit(index)}
                        disabled={draft.units.length === 1}
                        className="text-slate-500 hover:text-rose-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-3">
                      <NumberField
                        label="No of rooms"
                        value={unit.bedroomCount}
                        onChange={(value) =>
                          setDraft((current) => ({
                            ...current,
                            units: current.units.map((entry, unitIndex) =>
                              unitIndex === index ? { ...entry, bedroomCount: value } : entry
                            )
                          }))
                        }
                      />
                      <NumberField
                        label="No of bathrooms"
                        value={unit.bathroomCount}
                        onChange={(value) =>
                          setDraft((current) => ({
                            ...current,
                            units: current.units.map((entry, unitIndex) =>
                              unitIndex === index ? { ...entry, bathroomCount: value } : entry
                            )
                          }))
                        }
                      />
                      <TextField
                        label="Unit detail"
                        value={unit.label}
                        onChange={(value) => updateUnit(index, value)}
                        placeholder={index === 0 ? "Ground Floor" : `Unit ${index + 1}`}
                      />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-[220px_1fr]">
                      <div className="space-y-2">
                        <Label>Occupancy status</Label>
                        <Select
                          value={unit.isOccupied ? "OCCUPIED" : "VACANT"}
                          onValueChange={(value) =>
                            setDraft((current) => ({
                              ...current,
                              units: current.units.map((entry, unitIndex) =>
                                unitIndex === index
                                  ? {
                                      ...entry,
                                      isOccupied: value === "OCCUPIED",
                                      currentTenantName: value === "OCCUPIED" ? entry.currentTenantName : "",
                                      currentTenantEmail: value === "OCCUPIED" ? entry.currentTenantEmail : "",
                                      currentTenantPhone: value === "OCCUPIED" ? entry.currentTenantPhone : ""
                                    }
                                  : entry
                              )
                            }))
                          }
                        >
                          <SelectTrigger className="bg-white">
                            <SelectValue placeholder="Select occupancy status" />
                          </SelectTrigger>
                          <SelectContent className="bg-white">
                            <SelectItem value="VACANT">Vacant</SelectItem>
                            <SelectItem value="OCCUPIED">Occupied</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {unit.isOccupied ? (
                        <div className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-3 md:p-4 sm:grid-cols-3">
                          <TextField
                            label="Current tenant name"
                            value={unit.currentTenantName}
                            onChange={(value) =>
                              setDraft((current) => ({
                                ...current,
                                units: current.units.map((entry, unitIndex) =>
                                  unitIndex === index ? { ...entry, currentTenantName: value } : entry
                                )
                              }))
                            }
                            placeholder="Enter tenant full name"
                          />
                          <TextField
                            label="Current tenant email"
                            value={unit.currentTenantEmail}
                            onChange={(value) =>
                              setDraft((current) => ({
                                ...current,
                                units: current.units.map((entry, unitIndex) =>
                                  unitIndex === index ? { ...entry, currentTenantEmail: value } : entry
                                )
                              }))
                            }
                            placeholder="Enter tenant email"
                          />
                          <TextField
                            label="Current tenant phone"
                            value={unit.currentTenantPhone}
                            onChange={(value) =>
                              setDraft((current) => ({
                                ...current,
                                units: current.units.map((entry, unitIndex) =>
                                  unitIndex === index ? { ...entry, currentTenantPhone: value } : entry
                                )
                              }))
                            }
                            placeholder="Enter tenant phone"
                          />
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                onClick={() => void saveProperty()}
                disabled={saving}
                className="bg-[var(--rentsure-blue)] hover:bg-[var(--rentsure-blue-deep)]"
              >
                {saving ? "Saving..." : editingPropertyId ? "Update property" : "Save property"}
              </Button>
              <Button variant="outline" onClick={resetForm} disabled={saving}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Linked properties</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 md:space-y-4">
          {loading ? <p className="text-sm text-muted-foreground">Loading properties...</p> : null}
          {!loading && error ? <p className="text-sm text-rose-600">{error}</p> : null}
          {!loading && !items.length && !error ? (
            <p className="text-sm text-muted-foreground">No properties linked yet. Use the button above to add your first property.</p>
          ) : null}

          {items.map((property) => (
            <div key={property.id} className="rounded-2xl border border-slate-200 bg-white px-3 py-3 md:px-4 md:py-4">
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,0.8fr)_minmax(0,0.9fr)]">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-slate-950">{property.summaryLabel}</p>
                    <Badge variant="outline">{property.membershipRole}</Badge>
                    {property.isOccupied ? (
                      <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Occupied</Badge>
                    ) : (
                      <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Vacant</Badge>
                    )}
                  </div>
                  <p className="text-sm text-slate-600">{property.address}</p>
                  <p className="text-sm text-slate-500">
                    {property.city}, {property.state}
                  </p>
                  <p className="text-sm text-slate-600">
                    Owner: {property.ownerName} · Landlord email: {property.landlordEmail}
                  </p>
                </div>

                <div className="space-y-2 text-sm text-slate-600">
                  <RowLabel label="Type" value={property.propertyType || "Property"} />
                  <RowLabel label="Rooms" value={`${property.bedroomCount}`} />
                  <RowLabel label="Bathrooms" value={`${property.bathroomCount}`} />
                  <RowLabel
                    label="Unit details"
                    value={property.units.map((unit) => unit.label).join(", ") || "Main property"}
                  />
                </div>

                <div className="space-y-3">
                  {isLandlord ? (
                    <div className="flex justify-end">
                      <Button variant="outline" onClick={() => startEditingProperty(property)}>
                        Edit property
                      </Button>
                    </div>
                  ) : null}

                  {property.isOccupied ? (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Current tenant</p>
                      <p className="mt-2 font-medium text-slate-950">{property.currentTenantName || "Tenant linked"}</p>
                      {property.currentTenantEmail ? <p>{property.currentTenantEmail}</p> : null}
                      {property.currentTenantPhone ? <p>{property.currentTenantPhone}</p> : null}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-500">
                      No current tenant details attached.
                    </div>
                  )}

                  {isLandlord ? (
                    <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                      <Input
                        value={shareEmailById[property.id] || ""}
                        onChange={(event) =>
                          setShareEmailById((current) => ({ ...current, [property.id]: event.target.value }))
                        }
                        placeholder="Share with agent email"
                        className="bg-white"
                      />
                      <Button variant="outline" onClick={() => void shareProperty(property.id)}>
                        Share
                      </Button>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input value={value} onChange={(event) => onChange(event.target.value)} className="bg-white" placeholder={placeholder} />
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input
        className="bg-white"
        type="number"
        min={1}
        value={value}
        onChange={(event) => onChange(Math.max(1, Number(event.target.value) || 1))}
      />
    </div>
  );
}

function RowLabel({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-2 last:border-b-0 last:pb-0">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-900">{value}</span>
    </div>
  );
}

function LovPanel({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-20 max-h-64 overflow-y-auto rounded-[1.25rem] border border-slate-200 bg-white p-2 shadow-[0_22px_40px_-26px_rgba(15,23,42,0.35)]">
      {children}
    </div>
  );
}

function LovButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
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

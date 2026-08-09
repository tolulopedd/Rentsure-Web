import { useEffect, useMemo, useState } from "react";
import { Minus, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { digitsOnly, formatNairaInput } from "@/lib/currency";
import { getErrorMessage } from "@/lib/errors";
import {
  addressSearchMatches,
  formatNigeriaAddressSuggestion,
  formatNigeriaFallbackAddress,
  NIGERIA_ADDRESS_PLACEHOLDER
} from "@/lib/nigeria-address";
import { availableForRentLabel, occupancyBadgeClass, occupancyLabel } from "@/lib/property-display";
import { searchMapboxSuggestions, type MapboxSearchSuggestion } from "@/lib/mapbox-search";
import { fallbackNigeriaAddressSuggestions, nigerianStates, nigeriaStateCityMap } from "@/lib/nigeria-locations";
import {
  createWorkspaceProperty,
  listWorkspaceProperties,
  respondToWorkspaceAgentInvite,
  searchWorkspaceAgents,
  shareWorkspaceProperty,
  updateWorkspaceProperty,
  type PendingWorkspaceAgentInvite,
  type WorkspaceAgentSearchResult,
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
    annualRentAmountNgn: string;
    isOccupied: boolean;
    availableForRentInMonths: string;
    currentTenantName: string;
    currentTenantEmail: string;
    currentTenantPhone: string;
  }>;
};

const propertyTypeOptions: PropertyType[] = ["Duplex", "Flats", "Self Contain", "Mansion", "Boys Quater"];

function rentBandFromAnnualRent(value: string) {
  const amount = Number(digitsOnly(value));
  if (!Number.isFinite(amount) || amount <= 0) {
    return {
      code: "-",
      label: "Set annual rent to preview band",
      range: ""
    };
  }

  if (amount < 500_000) {
    return { code: "D", label: "Band D", range: "Below ₦500,000" };
  }
  if (amount <= 1_000_000) {
    return { code: "C", label: "Band C", range: "₦500,000 - ₦1,000,000" };
  }
  if (amount <= 2_500_000) {
    return { code: "B", label: "Band B", range: "₦1,000,001 - ₦2,500,000" };
  }
  return { code: "A", label: "Band A", range: "Above ₦2,500,000" };
}

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
        annualRentAmountNgn: "",
        isOccupied: false,
        availableForRentInMonths: "",
        currentTenantName: "",
        currentTenantEmail: "",
        currentTenantPhone: ""
      }
    ]
  };
}

export default function PublicWorkspaceProperties() {
  const [items, setItems] = useState<WorkspaceProperty[]>([]);
  const [pendingAgentInvites, setPendingAgentInvites] = useState<PendingWorkspaceAgentInvite[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState("");
  const [draft, setDraft] = useState<PropertyDraft>(() => createInitialDraft());
  const [shareEmailById, setShareEmailById] = useState<Record<string, string>>({});
  const [shareSuggestionsById, setShareSuggestionsById] = useState<Record<string, WorkspaceAgentSearchResult[]>>({});
  const [shareLookupLoadingById, setShareLookupLoadingById] = useState<Record<string, boolean>>({});
  const [shareOpenById, setShareOpenById] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [respondingInviteId, setRespondingInviteId] = useState<string | null>(null);
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

  async function loadProperties(preferredPropertyId?: string) {
    try {
      setLoading(true);
      setError(null);
      const response = await listWorkspaceProperties();
      setItems(response.items);
      setPendingAgentInvites(response.pendingAgentInvites);
      setSelectedPropertyId((current) =>
        preferredPropertyId && response.items.some((item) => item.id === preferredPropertyId)
          ? preferredPropertyId
          : current && response.items.some((item) => item.id === current)
            ? current
            : (response.items[0]?.id ?? "")
      );
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
            annualRentAmountNgn: unit.annualRentAmountNgn == null ? "" : String(unit.annualRentAmountNgn),
            isOccupied: unit.isOccupied,
            availableForRentInMonths: unit.availableForRentInMonths == null ? "" : String(unit.availableForRentInMonths),
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
          annualRentAmountNgn: "",
          isOccupied: false,
          availableForRentInMonths: "",
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
    if (draft.units.some((unit) => unit.annualRentAmountNgn.trim() && Number(unit.annualRentAmountNgn) <= 0)) {
      return "Enter a valid annual rent amount for each unit.";
    }
    if (draft.units.some((unit) => unit.isOccupied && !unit.currentTenantName.trim())) {
      return "Enter the current tenant name for each occupied unit.";
    }
    if (draft.units.some((unit) => unit.isOccupied && !unit.currentTenantPhone.trim())) {
      return "Enter the current tenant phone number for each occupied unit.";
    }
    if (
      draft.units.some(
        (unit) =>
          unit.isOccupied &&
          unit.availableForRentInMonths.trim() &&
          (!Number.isFinite(Number(unit.availableForRentInMonths)) || Number(unit.availableForRentInMonths) < 1)
      )
    ) {
      return "Enter a valid future availability in months for occupied units.";
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
          annualRentAmountNgn: unit.annualRentAmountNgn.trim() ? Number(unit.annualRentAmountNgn) : null,
          isOccupied: unit.isOccupied,
          availableForRentInMonths:
            unit.isOccupied && unit.availableForRentInMonths.trim() ? Number(unit.availableForRentInMonths) : null,
          currentTenantName: unit.isOccupied ? unit.currentTenantName.trim() : undefined,
          currentTenantEmail: unit.isOccupied ? unit.currentTenantEmail.trim() : undefined,
          currentTenantPhone: unit.isOccupied ? unit.currentTenantPhone.trim() : undefined
        }))
      };

      if (editingPropertyId) {
        await updateWorkspaceProperty(editingPropertyId, payload);
        await loadProperties(editingPropertyId);
        toast.success("Property updated");
      } else {
        await createWorkspaceProperty(payload);
        await loadProperties();
        toast.success("Property added");
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
      await loadProperties(propertyId);
      setShareEmailById((current) => ({ ...current, [propertyId]: "" }));
      if (response.mode === "INVITE_SENT") {
        toast.success("Agent invite sent");
      } else {
        toast.success("This property is already accepted by that agent");
      }
    } catch (shareError: unknown) {
      toast.error(getErrorMessage(shareError, "Failed to share property"));
    }
  }

  async function respondToAgentInvite(inviteId: string, action: "ACCEPT" | "DECLINE") {
    try {
      setRespondingInviteId(inviteId);
      await respondToWorkspaceAgentInvite(inviteId, action);
      await loadProperties();
      toast.success(action === "ACCEPT" ? "Property accepted" : "Property declined");
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Failed to update property invite"));
    } finally {
      setRespondingInviteId(null);
    }
  }

  async function searchAgentEmails(propertyId: string, value: string) {
    const query = value.trim();
    if (query.length < 2) {
      setShareSuggestionsById((current) => ({ ...current, [propertyId]: [] }));
      setShareLookupLoadingById((current) => ({ ...current, [propertyId]: false }));
      return;
    }

    try {
      setShareLookupLoadingById((current) => ({ ...current, [propertyId]: true }));
      const response = await searchWorkspaceAgents(query);
      setShareSuggestionsById((current) => ({ ...current, [propertyId]: response.items }));
      setShareOpenById((current) => ({ ...current, [propertyId]: true }));
    } catch {
      setShareSuggestionsById((current) => ({ ...current, [propertyId]: [] }));
    } finally {
      setShareLookupLoadingById((current) => ({ ...current, [propertyId]: false }));
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

  const selectedProperty = items.find((item) => item.id === selectedPropertyId) || null;

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-950 md:text-2xl">Properties</h1>
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
            {showAddForm ? "Close form" : "Link property"}
          </Button>
        ) : null}
      </div>

      {showAddForm && isLandlord ? (
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">{editingPropertyId ? "Edit property" : "Link property"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 md:space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                label="Property description"
                value={draft.name}
                onChange={(value) => setDraft((current) => ({ ...current, name: value }))}
                placeholder="Block of Flats @ Ikeja"
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
                              ? "No matches found. Continue typing to enter your own city/town."
                              : "No matches found. Enter your city/town manually."
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
                placeholder={isLandlord ? "From your landlord profile" : "Enter landlord name"}
                readOnly={isLandlord}
              />
              <TextField
                label="Landlord email"
                value={draft.landlordEmail}
                onChange={(value) => setDraft((current) => ({ ...current, landlordEmail: value }))}
                placeholder={isLandlord ? "From your verified landlord profile" : "Enter landlord email"}
                readOnly={isLandlord}
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-slate-950">Unit details</p>
                  <p className="text-sm text-muted-foreground">Add each unit separately.</p>
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
                        <p className="text-sm text-muted-foreground">Add unit details and occupancy.</p>
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

                    <div className="grid gap-4 sm:grid-cols-2">
                      <CurrencyField
                        label="Annual rent amount"
                        value={unit.annualRentAmountNgn}
                        onChange={(value) =>
                          setDraft((current) => ({
                            ...current,
                            units: current.units.map((entry, unitIndex) =>
                              unitIndex === index ? { ...entry, annualRentAmountNgn: value } : entry
                            )
                          }))
                        }
                        placeholder="₦1,200,000"
                      />
                      <div className="rounded-2xl border border-slate-200 bg-white p-3 text-sm text-slate-600">
                        {(() => {
                          const band = rentBandFromAnnualRent(unit.annualRentAmountNgn);
                          return (
                            <>
                              <p className="font-medium text-slate-950">Band preview</p>
                              <div className="mt-2 flex items-center gap-2">
                                <span className="inline-flex min-w-9 items-center justify-center rounded-full border border-[var(--rentsure-blue-soft)] bg-[var(--rentsure-blue-soft)] px-3 py-1 text-xs font-semibold text-[var(--rentsure-blue)]">
                                  {band.code}
                                </span>
                                <span className="text-sm font-medium text-slate-950">{band.label}</span>
                              </div>
                              <p className="mt-2 text-xs text-slate-500">
                                {band.range || "The band is derived automatically from the annual rent amount."}
                              </p>
                            </>
                          );
                        })()}
                      </div>
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
                                      availableForRentInMonths: value === "OCCUPIED" ? entry.availableForRentInMonths : "",
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
                        <div className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-3 md:p-4 sm:grid-cols-2 lg:grid-cols-4">
                          <NumberField
                            label="Available in months"
                            value={Math.max(1, Number(unit.availableForRentInMonths || 1))}
                            onChange={(value) =>
                              setDraft((current) => ({
                                ...current,
                                units: current.units.map((entry, unitIndex) =>
                                  unitIndex === index ? { ...entry, availableForRentInMonths: String(value) } : entry
                                )
                              }))
                            }
                          />
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

      {!isLandlord && pendingAgentInvites.length ? (
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Pending property invites</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingAgentInvites.map((invite) => (
              <div key={invite.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-1">
                    <p className="font-semibold text-slate-950">{invite.property.summaryLabel}</p>
                    <p className="text-sm text-slate-600">{invite.property.address}</p>
                    <p className="text-sm text-slate-500">
                      {invite.property.city}, {invite.property.state}
                    </p>
                    <p className="text-sm text-slate-600">
                      Shared by {invite.invitedBy.name}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button
                      onClick={() => void respondToAgentInvite(invite.id, "ACCEPT")}
                      disabled={respondingInviteId === invite.id}
                      className="bg-[var(--rentsure-blue)] hover:bg-[var(--rentsure-blue-deep)]"
                    >
                      Accept
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => void respondToAgentInvite(invite.id, "DECLINE")}
                      disabled={respondingInviteId === invite.id}
                    >
                      Decline
                    </Button>
                  </div>
                </div>
              </div>
            ))}
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
            <p className="text-sm text-muted-foreground">No properties yet.</p>
          ) : null}

          {items.length ? (
            <div className="space-y-2">
              <Label>Property</Label>
              <Select value={selectedPropertyId} onValueChange={setSelectedPropertyId}>
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Select property" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  {items.map((property) => (
                    <SelectItem key={property.id} value={property.id}>
                      {property.summaryLabel}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          {selectedProperty ? (
            <div key={selectedProperty.id} className="rounded-2xl border border-slate-200 bg-white">
              <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-slate-950">{selectedProperty.summaryLabel}</p>
                    <Badge variant="outline">{selectedProperty.membershipRole}</Badge>
                  </div>
                  <p className="text-sm text-slate-600">{selectedProperty.address}</p>
                  <p className="text-sm text-slate-500">{selectedProperty.city}, {selectedProperty.state}</p>
                </div>

                <div className="flex flex-wrap items-center gap-3 lg:justify-end">
                  {isLandlord ? (
                    <Button variant="outline" onClick={() => startEditingProperty(selectedProperty)}>
                      Edit property
                    </Button>
                  ) : null}
                </div>
              </div>

              <div className="overflow-x-auto px-4 py-4">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-slate-500">
                      <th className="pb-3 font-medium">Units</th>
                      <th className="pb-3 font-medium">Details</th>
                      <th className="pb-3 font-medium">Status</th>
                      <th className="pb-3 font-medium">Annual rent</th>
                      <th className="pb-3 font-medium">Current tenant</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedProperty.units.map((unit) => (
                      <tr key={unit.id} className="border-b border-slate-200 last:border-b-0">
                        <td className="py-3 pr-4 text-slate-950">{unit.label}</td>
                        <td className="py-3 pr-4 text-slate-600">
                          {selectedProperty.propertyType || "Property"} · {unit.bedroomCount} rooms · {unit.bathroomCount} baths
                        </td>
                        <td className="py-3 pr-4">
                          <div className="space-y-1">
                            <Badge className={occupancyBadgeClass(unit.isOccupied)} variant="outline">
                              {occupancyLabel(unit.isOccupied)}
                            </Badge>
                            {unit.isOccupied && unit.availableForRentInMonths ? (
                              <p className="text-xs text-slate-500">{availableForRentLabel(unit.availableForRentInMonths)}</p>
                            ) : null}
                          </div>
                        </td>
                        <td className="py-3 pr-4 text-slate-600">
                          {unit.annualRentAmountNgn == null ? "Not set" : formatNgn(unit.annualRentAmountNgn)}
                        </td>
                        <td className="py-3 text-slate-600">
                          {unit.currentTenantName ? (
                            <div className="space-y-1">
                              <p className="font-medium text-slate-950">{unit.currentTenantName}</p>
                              {unit.currentTenantEmail ? <p>{unit.currentTenantEmail}</p> : null}
                              {unit.currentTenantPhone ? <p>{unit.currentTenantPhone}</p> : null}
                            </div>
                          ) : (
                            "No tenant linked"
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="border-t border-slate-200 px-4 py-4">
                <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] lg:items-start">
                  <div className="space-y-2 text-sm text-slate-600">
                    <RowLabel label="Owner" value={selectedProperty.ownerName} />
                    <RowLabel label="Landlord email" value={selectedProperty.landlordEmail} />
                    {selectedProperty.agentAssignment ? (
                      <RowLabel
                        label={selectedProperty.agentAssignment.status === "ACCEPTED" ? "Agent" : "Agent invite"}
                        value={
                          selectedProperty.agentAssignment.name
                            ? `${selectedProperty.agentAssignment.name} (${selectedProperty.agentAssignment.email})`
                            : selectedProperty.agentAssignment.email
                        }
                      />
                    ) : null}
                  </div>

                  {isLandlord ? (
                    <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                      <div
                        className="relative"
                        onBlur={(event) => {
                          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                            setShareOpenById((current) => ({ ...current, [selectedProperty.id]: false }));
                          }
                        }}
                      >
                        <Input
                          value={shareEmailById[selectedProperty.id] || ""}
                          onChange={(event) => {
                            const value = event.target.value;
                            setShareEmailById((current) => ({ ...current, [selectedProperty.id]: value }));
                            void searchAgentEmails(selectedProperty.id, value);
                          }}
                          onFocus={() => {
                            if ((shareSuggestionsById[selectedProperty.id] || []).length) {
                              setShareOpenById((current) => ({ ...current, [selectedProperty.id]: true }));
                            }
                          }}
                          placeholder={
                            selectedProperty.agentAssignment?.status === "ACCEPTED"
                              ? "This property is already assigned to an agent"
                              : "Search agent email"
                          }
                          className="bg-white"
                          disabled={selectedProperty.agentAssignment?.status === "ACCEPTED"}
                        />
                        {shareOpenById[selectedProperty.id] &&
                        (shareLookupLoadingById[selectedProperty.id] || (shareSuggestionsById[selectedProperty.id] || []).length > 0) ? (
                          <LovPanel>
                            {shareLookupLoadingById[selectedProperty.id] ? <LovEmpty text="Searching agents..." /> : null}
                            {!shareLookupLoadingById[selectedProperty.id] &&
                            (shareSuggestionsById[selectedProperty.id] || []).map((agent) => (
                              <LovButton
                                key={agent.id}
                                onClick={() => {
                                  setShareEmailById((current) => ({ ...current, [selectedProperty.id]: agent.email }));
                                  setShareOpenById((current) => ({ ...current, [selectedProperty.id]: false }));
                                }}
                              >
                                <span>{agent.email}</span>
                                <span className="text-xs uppercase tracking-[0.12em] text-slate-400">{agent.name}</span>
                              </LovButton>
                            ))}
                          </LovPanel>
                        ) : null}
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => void shareProperty(selectedProperty.id)}
                        disabled={selectedProperty.agentAssignment?.status === "ACCEPTED"}
                      >
                        Share with Agent
                      </Button>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  readOnly = false
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  readOnly?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={readOnly ? "bg-slate-50 text-slate-500" : "bg-white"}
        placeholder={placeholder}
        readOnly={readOnly}
        disabled={readOnly}
      />
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
      <div className="flex items-center overflow-hidden rounded-md border border-input bg-white shadow-sm">
        <button
          type="button"
          className="flex h-11 w-11 items-center justify-center border-r border-slate-200 text-slate-600 transition hover:bg-slate-50 active:bg-slate-100"
          onClick={() => onChange(Math.max(1, value - 1))}
          aria-label={`Decrease ${label.toLowerCase()}`}
        >
          <Minus className="h-4 w-4" />
        </button>
        <Input
          className="h-11 rounded-none border-0 text-center shadow-none focus-visible:ring-0"
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={value}
          onChange={(event) => onChange(Math.max(1, Number(event.target.value.replace(/\D/g, "")) || 1))}
        />
        <button
          type="button"
          className="flex h-11 w-11 items-center justify-center border-l border-slate-200 text-slate-600 transition hover:bg-slate-50 active:bg-slate-100"
          onClick={() => onChange(value + 1)}
          aria-label={`Increase ${label.toLowerCase()}`}
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function CurrencyField({
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
  const numericValue = digitsOnly(value);
  const displayValue = formatNairaInput(numericValue);

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input
        value={displayValue}
        onChange={(event) => onChange(digitsOnly(event.target.value))}
        className="bg-white"
        inputMode="numeric"
        placeholder={placeholder}
      />
    </div>
  );
}

function formatNgn(value: number) {
  return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(value);
}

function RowLabel({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 border-b border-slate-100 pb-2 last:border-b-0 last:pb-0">
      <span className="text-slate-500">{label}:</span>
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

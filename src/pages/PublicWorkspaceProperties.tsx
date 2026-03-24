import { useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getErrorMessage } from "@/lib/errors";
import { fallbackNigeriaAddressSuggestions, nigerianStates, nigeriaStateCityMap } from "@/lib/nigeria-locations";
import {
  createWorkspaceProperty,
  listWorkspaceProperties,
  shareWorkspaceProperty,
  type WorkspaceProperty
} from "@/lib/public-workspace-api";

type PropertyType = "Duplex" | "Flats" | "Self Contain" | "Mansion" | "Boys Quater";

type UnitDraft = {
  label: string;
  state: string;
  city: string;
  address: string;
};

type PropertyDraft = {
  name: string;
  ownerName: string;
  landlordEmail: string;
  propertyType: PropertyType;
  bedroomCount: number;
  bathroomCount: number;
  toiletCount: number;
  unitCount: number;
  units: UnitDraft[];
};

const propertyTypeOptions: PropertyType[] = ["Duplex", "Flats", "Self Contain", "Mansion", "Boys Quater"];

function makeEmptyUnit(index: number): UnitDraft {
  return {
    label: `Unit ${index + 1}`,
    state: "",
    city: "",
    address: ""
  };
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
    bedroomCount: 3,
    bathroomCount: 3,
    toiletCount: 4,
    unitCount: 1,
    units: [makeEmptyUnit(0)]
  };
}

export default function PublicWorkspaceProperties() {
  const [items, setItems] = useState<WorkspaceProperty[]>([]);
  const [draft, setDraft] = useState<PropertyDraft>(() => createInitialDraft());
  const [shareEmailById, setShareEmailById] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stateQueryByUnit, setStateQueryByUnit] = useState<Record<number, string>>({});
  const [cityQueryByUnit, setCityQueryByUnit] = useState<Record<number, string>>({});
  const [showStateLovByUnit, setShowStateLovByUnit] = useState<Record<number, boolean>>({});
  const [showCityLovByUnit, setShowCityLovByUnit] = useState<Record<number, boolean>>({});
  const [showAddressLovByUnit, setShowAddressLovByUnit] = useState<Record<number, boolean>>({});

  const rawRole = (localStorage.getItem("userRole") || "LANDLORD").toUpperCase();
  const isLandlord = rawRole === "LANDLORD";

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

  function syncUnits(nextCount: number) {
    setDraft((current) => {
      const units = Array.from({ length: nextCount }, (_, index) => current.units[index] ?? makeEmptyUnit(index)).map((unit, index) => ({
        ...unit,
        label: unit.label || `Unit ${index + 1}`
      }));
      return {
        ...current,
        unitCount: nextCount,
        units
      };
    });
  }

  function updateUnit(index: number, patch: Partial<UnitDraft>) {
    setDraft((current) => ({
      ...current,
      units: current.units.map((unit, unitIndex) => (unitIndex === index ? { ...unit, ...patch } : unit))
    }));
  }

  function selectState(index: number, state: string) {
    setStateQueryByUnit((current) => ({ ...current, [index]: state }));
    setCityQueryByUnit((current) => ({ ...current, [index]: "" }));
    setShowStateLovByUnit((current) => ({ ...current, [index]: false }));
    setShowAddressLovByUnit((current) => ({ ...current, [index]: false }));
    updateUnit(index, { state, city: "", address: "" });
  }

  function selectCity(index: number, city: string) {
    setCityQueryByUnit((current) => ({ ...current, [index]: city }));
    setShowCityLovByUnit((current) => ({ ...current, [index]: false }));
    setShowAddressLovByUnit((current) => ({ ...current, [index]: false }));
    updateUnit(index, { city, address: "" });
  }

  function selectAddress(index: number, address: string) {
    setShowAddressLovByUnit((current) => ({ ...current, [index]: false }));
    updateUnit(index, { address });
  }

  function filteredStates(index: number) {
    const query = (stateQueryByUnit[index] ?? "").trim().toLowerCase();
    if (!query) return nigerianStates;
    return nigerianStates.filter((state) => state.toLowerCase().includes(query));
  }

  function filteredCities(index: number) {
    const query = (cityQueryByUnit[index] ?? "").trim().toLowerCase();
    const state = draft.units[index]?.state;
    const cities = state ? nigeriaStateCityMap[state] ?? [] : [];
    return cities.filter((city) => !query || city.toLowerCase().includes(query));
  }

  function filteredAddresses(index: number) {
    const unit = draft.units[index];
    if (!unit?.state || !unit.city) return [];
    const query = unit.address.trim().toLowerCase();
    return Array.from(
      new Map(
        fallbackNigeriaAddressSuggestions
          .filter((item) => item.state === unit.state && item.city === unit.city)
          .filter((item) => !query || item.value.toLowerCase().includes(query))
          .map((item) => [item.value, item])
      ).values()
    ).slice(0, 6);
  }

  function validateDraft() {
    if (!draft.name.trim()) return "Enter a property name.";
    if (!draft.ownerName.trim()) return "Enter the property owner name.";
    if (!draft.landlordEmail.trim()) return "Enter the landlord email.";
    if (!draft.bedroomCount || draft.bedroomCount < 1) return "Enter a valid number of bedrooms.";
    if (!draft.bathroomCount || draft.bathroomCount < 1) return "Enter a valid number of bathrooms.";
    if (!draft.toiletCount || draft.toiletCount < 1) return "Enter a valid number of toilets.";
    if (!draft.unitCount || draft.unitCount < 1) return "Enter a valid number of units.";
    if (draft.units.length !== draft.unitCount) return "Unit count must match the unit entries.";

    for (const [index, unit] of draft.units.entries()) {
      if (!unit.label.trim()) return `Enter a label for unit ${index + 1}.`;
      if (!unit.state.trim()) return `Select a state for unit ${index + 1}.`;
      if (!unit.city.trim()) return `Select a city/town for unit ${index + 1}.`;
      if (!unit.address.trim()) return `Enter an address for unit ${index + 1}.`;
    }

    return null;
  }

  async function createProperty() {
    const validationError = validateDraft();
    if (validationError) {
      toast.error(validationError);
      return;
    }

    try {
      setSaving(true);
      const response = await createWorkspaceProperty({
        name: draft.name.trim(),
        ownerName: draft.ownerName.trim(),
        landlordEmail: draft.landlordEmail.trim(),
        propertyType: draft.propertyType,
        bedroomCount: draft.bedroomCount,
        bathroomCount: draft.bathroomCount,
        toiletCount: draft.toiletCount,
        unitCount: draft.unitCount,
        units: draft.units.map((unit) => ({
          label: unit.label.trim(),
          address: unit.address.trim(),
          state: unit.state.trim(),
          city: unit.city.trim()
        }))
      });
      setItems(response.properties);
      setDraft(createInitialDraft());
      setStateQueryByUnit({});
      setCityQueryByUnit({});
      setShowStateLovByUnit({});
      setShowCityLovByUnit({});
      setShowAddressLovByUnit({});
      toast.success("Property added to workspace");
    } catch (saveError: unknown) {
      toast.error(getErrorMessage(saveError, "Failed to create property"));
    } finally {
      setSaving(false);
    }
  }

  async function shareProperty(propertyId: string) {
    const email = shareEmailById[propertyId]?.trim();
    if (!email) {
      toast.error("Enter the landlord or agent email to share this property");
      return;
    }

    try {
      const response = await shareWorkspaceProperty(propertyId, email);
      setItems(response.items);
      setShareEmailById((current) => ({ ...current, [propertyId]: "" }));
      toast.success("Property shared");
    } catch (shareError: unknown) {
      toast.error(getErrorMessage(shareError, "Failed to share property"));
    }
  }

  const propertySummary = useMemo(
    () =>
      `Create a landlord-linked ${draft.bedroomCount} bedroom ${draft.propertyType === "Flats" ? "flat" : draft.propertyType.toLowerCase()} with ${draft.unitCount} unit${
        draft.unitCount === 1 ? "" : "s"
      } and a verified Nigerian address trail.`,
    [draft.bedroomCount, draft.propertyType, draft.unitCount]
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-950">Properties</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Add landlord-linked properties, define property type and unit count, and capture each unit address clearly for review and payment operations.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_1.15fr]">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Linked properties</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? <p className="text-sm text-muted-foreground">Loading properties...</p> : null}
            {!loading && error ? <p className="text-sm text-rose-600">{error}</p> : null}
            {!loading && !items.length && !error ? <p className="text-sm text-muted-foreground">No properties linked yet.</p> : null}
            {items.map((property) => (
              <div key={property.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-slate-950">{property.summaryLabel}</p>
                      <Badge variant="outline">{property.membershipRole}</Badge>
                      <Badge variant="outline">{property.propertyType}</Badge>
                    </div>
                    <p className="mt-2 text-sm text-slate-600">Owner: {property.ownerName}</p>
                    <p className="text-sm text-slate-600">Landlord email: {property.landlordEmail}</p>
                    <p className="text-sm text-slate-600">
                      {property.bedroomCount} room{property.bedroomCount === 1 ? "" : "s"} · {property.bathroomCount} bathroom{property.bathroomCount === 1 ? "" : "s"} · {property.toiletCount} toilet{property.toiletCount === 1 ? "" : "s"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {property.unitCount} unit{property.unitCount === 1 ? "" : "s"} linked to this property
                    </p>
                  </div>
                  <div className="text-sm text-slate-600">{property.proposedRenterCount ?? 0} proposed renters</div>
                </div>

                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Unit addresses</p>
                  <div className="mt-3 space-y-3">
                    {property.units.map((unit) => (
                      <div key={unit.id} className="rounded-xl border border-slate-200 bg-white p-3">
                        <p className="text-sm font-semibold text-slate-950">{unit.label}</p>
                        <p className="mt-1 text-sm text-slate-600">{unit.address}</p>
                        <p className="text-xs text-muted-foreground">{unit.city}, {unit.state}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Linked accounts</p>
                  <div className="mt-3 space-y-2">
                    {property.members.map((member) => (
                      <div key={`${property.id}-${member.accountId}-${member.role}`} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                        <div>
                          <span className="font-medium text-slate-950">{member.name}</span>
                          <span className="ml-2 text-slate-500">{member.email}</span>
                        </div>
                        <Badge variant="outline">{member.role}</Badge>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
                  <Input
                    value={shareEmailById[property.id] || ""}
                    onChange={(event) => setShareEmailById((current) => ({ ...current, [property.id]: event.target.value }))}
                    placeholder="Share with landlord or agent email"
                    className="bg-white"
                  />
                  <Button variant="outline" onClick={() => void shareProperty(property.id)}>
                    Share property
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Add property</CardTitle>
            <p className="text-sm text-muted-foreground">{propertySummary}</p>
          </CardHeader>
          <CardContent className="space-y-5">
            <TextField label="Property name" value={draft.name} onChange={(value) => setDraft((current) => ({ ...current, name: value }))} />
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

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Property type</Label>
                <Select value={draft.propertyType} onValueChange={(value) => setDraft((current) => ({ ...current, propertyType: value as PropertyType }))}>
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

              <div className="space-y-2">
                <Label>No of units</Label>
                <Input
                  className="bg-white"
                  min={1}
                  type="number"
                  value={draft.unitCount}
                  onChange={(event) => syncUnits(Math.max(1, Number(event.target.value) || 1))}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>No of rooms</Label>
                <Input
                  className="bg-white"
                  min={1}
                  type="number"
                  value={draft.bedroomCount}
                  onChange={(event) => setDraft((current) => ({ ...current, bedroomCount: Math.max(1, Number(event.target.value) || 1) }))}
                />
              </div>

              <div className="space-y-2">
                <Label>No of bathrooms</Label>
                <Input
                  className="bg-white"
                  min={1}
                  type="number"
                  value={draft.bathroomCount}
                  onChange={(event) => setDraft((current) => ({ ...current, bathroomCount: Math.max(1, Number(event.target.value) || 1) }))}
                />
              </div>

              <div className="space-y-2">
                <Label>No of toilets</Label>
                <Input
                  className="bg-white"
                  min={1}
                  type="number"
                  value={draft.toiletCount}
                  onChange={(event) => setDraft((current) => ({ ...current, toiletCount: Math.max(1, Number(event.target.value) || 1) }))}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="text-sm font-semibold text-slate-950">Unit addresses</div>
              {draft.units.map((unit, index) => (
                <div key={`unit-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <TextField
                      label="Unit label"
                      value={unit.label}
                      onChange={(value) => updateUnit(index, { label: value })}
                      placeholder={`Unit ${index + 1}`}
                    />
                    <div className="space-y-2">
                      <Label>State</Label>
                      <div className="relative">
                        <Input
                          className="bg-white"
                          value={stateQueryByUnit[index] ?? unit.state}
                          onChange={(event) => {
                            setStateQueryByUnit((current) => ({ ...current, [index]: event.target.value }));
                            setShowStateLovByUnit((current) => ({ ...current, [index]: true }));
                            updateUnit(index, { state: "", city: "", address: "" });
                            setCityQueryByUnit((current) => ({ ...current, [index]: "" }));
                          }}
                          onFocus={() => setShowStateLovByUnit((current) => ({ ...current, [index]: true }))}
                          placeholder="Type to search states in Nigeria"
                        />
                        {showStateLovByUnit[index] ? (
                          <LovPanel>
                            {filteredStates(index).map((state) => (
                              <LovButton key={state} onClick={() => selectState(index, state)}>
                                <span>{state}</span>
                                {unit.state === state ? <SelectedPill /> : null}
                              </LovButton>
                            ))}
                          </LovPanel>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>City/Town</Label>
                      <div className="relative">
                        <Input
                          className="bg-white"
                          value={cityQueryByUnit[index] ?? unit.city}
                          disabled={!unit.state}
                          onChange={(event) => {
                            const nextValue = event.target.value;
                            setCityQueryByUnit((current) => ({ ...current, [index]: nextValue }));
                            setShowCityLovByUnit((current) => ({ ...current, [index]: true }));
                            updateUnit(index, { city: nextValue, address: nextValue === unit.city ? unit.address : "" });
                          }}
                          onFocus={() => setShowCityLovByUnit((current) => ({ ...current, [index]: true }))}
                          placeholder={unit.state ? `Type to search cities in ${unit.state}` : "Select a state first"}
                        />
                        {showCityLovByUnit[index] ? (
                          <LovPanel>
                            {filteredCities(index).length ? (
                              filteredCities(index).map((city) => (
                                <LovButton key={city} onClick={() => selectCity(index, city)}>
                                  <span>{city}</span>
                                  {unit.city === city ? <SelectedPill /> : null}
                                </LovButton>
                              ))
                            ) : (
                              <LovEmpty text="No Nigerian city or town matches that search. Continue typing to use your own city/town." />
                            )}
                          </LovPanel>
                        ) : null}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Address</Label>
                      <div className="relative">
                        <Input
                          className="bg-white"
                          disabled={!unit.city}
                          value={unit.address}
                          onChange={(event) => {
                            updateUnit(index, { address: event.target.value });
                            setShowAddressLovByUnit((current) => ({ ...current, [index]: true }));
                          }}
                          onFocus={() => setShowAddressLovByUnit((current) => ({ ...current, [index]: true }))}
                          placeholder={unit.city ? `Start typing an address in ${unit.city}` : "Select a city before entering address"}
                        />
                        {showAddressLovByUnit[index] && filteredAddresses(index).length ? (
                          <LovPanel>
                            {filteredAddresses(index).map((suggestion) => (
                              <LovButton key={suggestion.value} onClick={() => selectAddress(index, suggestion.value)}>
                                <span>{suggestion.value}</span>
                                <span className="text-xs uppercase tracking-[0.12em] text-slate-400">
                                  {suggestion.city}, {suggestion.state}
                                </span>
                              </LovButton>
                            ))}
                          </LovPanel>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <Button onClick={() => void createProperty()} disabled={saving} className="bg-[var(--rentsure-blue)] hover:bg-[var(--rentsure-blue-deep)]">
              {saving ? "Saving..." : "Add property"}
            </Button>
          </CardContent>
        </Card>
      </div>
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

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fallbackNigeriaAddressSuggestions, nigerianStates, nigeriaStateCityMap } from "@/lib/nigeria-locations";

type NigeriaAddressFieldsProps = {
  stateValue: string;
  cityValue: string;
  addressValue: string;
  onStateChange: (value: string) => void;
  onCityChange: (value: string) => void;
  onAddressChange: (value: string) => void;
};

export function NigeriaAddressFields({
  stateValue,
  cityValue,
  addressValue,
  onStateChange,
  onCityChange,
  onAddressChange
}: NigeriaAddressFieldsProps) {
  const [stateQuery, setStateQuery] = useState(stateValue);
  const [cityQuery, setCityQuery] = useState(cityValue);
  const [showStateLov, setShowStateLov] = useState(false);
  const [showCityLov, setShowCityLov] = useState(false);
  const [showAddressLov, setShowAddressLov] = useState(false);

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
    const stateCities = stateValue ? nigeriaStateCityMap[stateValue] ?? [] : [];
    return stateCities.filter((city) => !query || city.toLowerCase().includes(query));
  }, [cityQuery, stateValue]);

  const filteredAddresses = useMemo(() => {
    if (!stateValue || !cityValue) return [];
    const query = addressValue.trim().toLowerCase();
    return Array.from(
      new Map(
        fallbackNigeriaAddressSuggestions
          .filter((item) => item.state === stateValue && item.city === cityValue)
          .filter((item) => !query || item.value.toLowerCase().includes(query))
          .map((item) => [item.value, item])
      ).values()
    ).slice(0, 6);
  }, [addressValue, cityValue, stateValue]);

  function selectState(state: string) {
    setStateQuery(state);
    setCityQuery("");
    setShowStateLov(false);
    setShowAddressLov(false);
    onStateChange(state);
    onCityChange("");
    onAddressChange("");
  }

  function selectCity(city: string) {
    setCityQuery(city);
    setShowCityLov(false);
    setShowAddressLov(false);
    onCityChange(city);
    onAddressChange("");
  }

  function selectAddress(address: string) {
    setShowAddressLov(false);
    onAddressChange(address);
  }

  return (
    <>
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
                onStateChange("");
                onCityChange("");
                onAddressChange("");
                setCityQuery("");
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
          <div className="relative">
            <Input
              className="bg-white"
              value={cityQuery}
              disabled={!stateValue}
              onChange={(event) => {
                const nextValue = event.target.value;
                setCityQuery(nextValue);
                setShowCityLov(true);
                onCityChange(nextValue);
                onAddressChange(nextValue === cityValue ? addressValue : "");
              }}
              onFocus={() => setShowCityLov(true)}
              placeholder={stateValue ? `Type to search cities in ${stateValue}` : "Select a state first"}
            />
            {showCityLov ? (
              <LovPanel>
                {filteredCities.length ? (
                  filteredCities.map((city) => (
                    <LovButton key={city} onClick={() => selectCity(city)}>
                      <span>{city}</span>
                      {cityValue === city ? <SelectedPill /> : null}
                    </LovButton>
                  ))
                ) : (
                  <LovEmpty text="No Nigerian city or town matches that search. Continue typing to use your own city/town." />
                )}
              </LovPanel>
            ) : null}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Address</Label>
        <div className="relative">
          <Input
            className="bg-white"
            value={addressValue}
            disabled={!cityValue}
            onChange={(event) => {
              onAddressChange(event.target.value);
              setShowAddressLov(true);
            }}
            onFocus={() => setShowAddressLov(true)}
            placeholder={cityValue ? `Start typing an address in ${cityValue}` : "Select a city before entering address"}
          />
          {showAddressLov && filteredAddresses.length ? (
            <LovPanel>
              {filteredAddresses.map((suggestion) => (
                <LovButton key={suggestion.value} onClick={() => selectAddress(suggestion.value)}>
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

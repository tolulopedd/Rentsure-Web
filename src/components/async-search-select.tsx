import { useEffect, useId, useRef, useState } from "react";
import { Input } from "@/components/ui/input";

export type LookupOption = { id: string; label: string };
export function AsyncSearchSelect({ label, placeholder, value, onChange, search, disabled = false }: {
  label: string; placeholder: string; value: LookupOption | null;
  onChange: (value: LookupOption | null) => void;
  search: (query: string) => Promise<LookupOption[]>; disabled?: boolean;
}) {
  const id = useId();
  const [query, setQuery] = useState("");
  const [revision, setRevision] = useState(0);
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<LookupOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [active, setActive] = useState(0);
  const generation = useRef(0);
  useEffect(() => {
    if (!open) return;
    const version = ++generation.current;
    setLoading(true); setError(false); setResults([]); setActive(0);
    const timer = setTimeout(() => {
      void search(query).then(items => {
        if (generation.current === version) setResults(items);
      }).catch(() => { if (generation.current === version) setError(true); })
        .finally(() => { if (generation.current === version) setLoading(false); });
    }, 250);
    return () => { clearTimeout(timer); generation.current++; };
  }, [query, open, search, revision]);
  function choose(option: LookupOption) { onChange(option); setOpen(false); }
  function move(next: number) {
    const index = Math.max(0, Math.min(next, results.length - 1));
    setActive(index);
    document.getElementById(id + "-option-" + index)?.scrollIntoView({ block: "nearest" });
  }
  return <div className="relative space-y-1 text-sm" onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false);
  }}>
    <label htmlFor={id}>{label}</label>
    <Input id={id} role="combobox" autoComplete="off" disabled={disabled} maxLength={160}
      placeholder={placeholder} value={value?.label ?? query} aria-expanded={open}
      aria-controls={id + "-list"} aria-autocomplete="list" aria-required="true"
      aria-activedescendant={open && !loading && results[active] ? id + "-option-" + active : undefined}
      onFocus={event => { setOpen(true); if (value) event.target.select(); }}
      onChange={event => {
        generation.current++; setLoading(true); setResults([]); setActive(0);
        setQuery(event.target.value.slice(0, 100)); setRevision(current => current + 1); onChange(null); setOpen(true);
      }}
      onKeyDown={event => {
        if (event.key === "ArrowDown") { event.preventDefault(); if (!open) setOpen(true); else move(active + 1); }
        if (event.key === "ArrowUp") { event.preventDefault(); move(active - 1); }
        if (event.key === "Enter") { event.preventDefault(); if (open && !loading && results[active]) choose(results[active]); }
        if (event.key === "Escape") { event.preventDefault(); setOpen(false); }
      }} />
    {open && <div className="absolute z-50 mt-1 w-full rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
      <div id={id + "-list"} role="listbox" aria-label={label} aria-busy={loading} className="max-h-60 overflow-y-auto">
        {!loading && results.map((option, index) => <div id={id + "-option-" + index} key={option.id}
          role="option" aria-selected={value?.id === option.id}
          className={`cursor-pointer rounded-md px-3 py-2 break-words ${active === index ? "bg-blue-50 text-blue-800" : "hover:bg-slate-50"}`}
          onMouseDown={event => event.preventDefault()} onMouseMove={() => setActive(index)} onClick={() => choose(option)}>
          {option.label}
        </div>)}
      </div>
      {loading ? <p role="status" className="p-3 text-slate-500">Searching…</p>
        : error ? <p role="alert" className="p-3 text-rose-700">Could not load results. Type again or reopen this field to retry.</p>
        : !results.length ? <p role="status" className="p-3 text-slate-500">No matching recipients. Try another name.</p> : null}
    </div>}
  </div>;
}

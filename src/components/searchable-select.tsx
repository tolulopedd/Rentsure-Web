import { useId, useRef, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
const normalize = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase();

export type SearchableOption = { id: string; label: string; description?: string; searchText?: string };
export function SearchableSelect({ items, value, onValueChange, placeholder, searchPlaceholder, emptyMessage, disabled = false }: {
  items: SearchableOption[]; value: string; onValueChange: (id: string) => void;
  placeholder: string; searchPlaceholder: string; emptyMessage: string; disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const selected = items.find(item => item.id === value);
  const terms = normalize(query).trim().split(/\s+/).filter(Boolean);
  const filtered = items.filter(item => {
    const text = normalize([item.label, item.description, item.searchText].filter(Boolean).join(" "));
    return terms.every(term => text.includes(term));
  });
  function choose(id: string) { onValueChange(id); setOpen(false); }
  function move(index: number) {
    const next = Math.max(0, Math.min(index, filtered.length - 1));
    setActive(next);
    document.getElementById(listId + "-" + next)?.scrollIntoView({ block: "nearest" });
  }
  return <Popover open={open} onOpenChange={value => { setOpen(value); if (value) { setQuery(""); setActive(0); } }}>
    <PopoverTrigger asChild>
      <Button variant="outline" className="h-auto min-h-9 w-full justify-between bg-white text-left font-normal" type="button" disabled={disabled} aria-label={placeholder}>
        <span className="min-w-0 truncate">{selected ? selected.label : placeholder}</span><ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>
    </PopoverTrigger>
    <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] max-w-[calc(100vw-2rem)] p-2" onOpenAutoFocus={event => { event.preventDefault(); inputRef.current?.focus(); }}>
      <Input ref={inputRef} role="combobox" aria-label={searchPlaceholder} aria-expanded={open} aria-controls={listId} aria-autocomplete="list"
        aria-activedescendant={filtered[active] ? listId + "-" + active : undefined}
        placeholder={searchPlaceholder} value={query}
        onChange={event => { setQuery(event.target.value); setActive(0); }}
        onKeyDown={event => {
          if (event.key === "ArrowDown") { event.preventDefault(); move(active + 1); }
          if (event.key === "ArrowUp") { event.preventDefault(); move(active - 1); }
          if (event.key === "Enter") { event.preventDefault(); if (filtered[active]) choose(filtered[active].id); }
          if (event.key === "Escape") setOpen(false);
        }} />
      <p className="px-2 py-2 text-xs text-slate-500" role="status">{filtered.length} matching option{filtered.length === 1 ? "" : "s"}</p>
      <div id={listId} role="listbox" aria-label={placeholder} className="max-h-64 overflow-y-auto">
        {filtered.map((item, index) => <div key={item.id} id={listId + "-" + index} role="option" aria-selected={item.id === value}
          className={`flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm ${active === index ? "bg-slate-100" : "hover:bg-slate-50"}`}
          onMouseDown={event => event.preventDefault()} onClick={() => choose(item.id)} onMouseMove={() => setActive(index)}>
          <Check aria-hidden className={`h-4 w-4 shrink-0 ${value === item.id ? "opacity-100" : "opacity-0"}`} />
          <span className="min-w-0 break-words">{item.label}{item.description && <span className="block text-xs text-slate-500">{item.description}</span>}</span>
        </div>)}
        {!filtered.length && <p className="p-3 text-sm text-slate-500">{emptyMessage}</p>}
      </div>
    </PopoverContent>
  </Popover>;
}

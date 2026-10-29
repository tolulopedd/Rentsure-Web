import { SearchableSelect } from "@/components/searchable-select";
import { propertyDisplayName, propertyUnitDisplayName } from "@/lib/property-display";
import type { QueueListItem } from "@/lib/public-workspace-api";

export function LinkedTenantSelect({ items, value, onValueChange }: {
  items: QueueListItem[]; value: string; onValueChange: (id: string) => void;
}) {
  return <SearchableSelect value={value} onValueChange={onValueChange}
    placeholder="Select linked tenant" searchPlaceholder="Search name, email, phone, property or unit…"
    emptyMessage="No matching linked tenants. Try another name or property."
    items={items.map(item => ({
      id: item.id,
      label: [item.organizationName?.trim() || [item.firstName, item.lastName].filter(Boolean).join(" "),
        propertyDisplayName(item.property), propertyUnitDisplayName(item.propertyUnit)].join(" · "),
      description: [item.email, item.phone].filter(Boolean).join(" · "),
      searchText: [item.firstName, item.lastName, item.property.name, item.property.address, item.property.city, item.property.state, item.propertyUnit?.label].filter(Boolean).join(" ")
    }))} />;
}

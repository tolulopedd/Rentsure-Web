import { apiFetch } from "@/lib/api";

export type Customer = {
  id: string;
  firstName: string;
  lastName: string;
  customerType: "RENTER" | "LANDLORD" | "AGENT";
  email: string;
  phone: string;
  address: string;
  accountStatus: string;
  dateRegistered: string;
};

export function listCustomers(params: Record<string, string | number | undefined>) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => value !== undefined && value !== "" && query.set(key, String(value)));
  return apiFetch<{ items: Customer[]; pagination: { page: number; pageSize: number; total: number; totalPages: number }; totalCustomers: number }>(`/api/admin/customers?${query.toString()}`);
}

export function exportCustomers(params: Record<string, string | undefined>) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => value && query.set(key, value));
  return apiFetch<string>(`/api/admin/customers/export?${query.toString()}`, { headers: { Accept: "text/csv" } });
}


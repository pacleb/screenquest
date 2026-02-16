"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";

interface FamilyItem {
  id: string;
  name: string;
  familyCode: string;
  plan: string;
  subscriptionStatus: string | null;
  subscriptionExpiresAt: string | null;
  createdAt: string;
  owner: { id: string; name: string; email: string } | null;
  _count: { members: number };
}

interface ListResponse {
  items: FamilyItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function FamiliesPage() {
  const { toast } = useToast();
  const [data, setData] = useState<ListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);

  const fetchFamilies = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, limit: 50 };
      if (search) params.search = search;
      if (planFilter) params.plan = planFilter;
      if (statusFilter) params.subscriptionStatus = statusFilter;
      const res = await api.get("/admin/families", { params });
      setData(res.data);
    } catch {
      toast("Failed to load families", "error");
    } finally {
      setLoading(false);
    }
  }, [page, search, planFilter, statusFilter, toast]);

  useEffect(() => {
    fetchFamilies();
  }, [fetchFamilies]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getStatusBadge = (status: string | null) => {
    if (status === "active") return <Badge variant="success">Active</Badge>;
    if (status === "expired") return <Badge variant="warning">Expired</Badge>;
    return <Badge variant="secondary">None</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Families</h1>
          <p className="text-sm text-gray-500">
            {data?.total ?? 0} families total
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by name or code..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9"
          />
        </div>
        <Select
          value={planFilter}
          onChange={(e) => {
            setPlanFilter(e.target.value);
            setPage(1);
          }}
          className="w-40"
        >
          <option value="">All Plans</option>
          <option value="free">Free</option>
          <option value="premium">Premium</option>
        </Select>
        <Select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="w-48"
        >
          <option value="">All Subscriptions</option>
          <option value="active">Active</option>
          <option value="expired">Expired</option>
          <option value="none">None</option>
        </Select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-left text-gray-500">
              <th className="px-4 py-3 font-medium">Family</th>
              <th className="px-4 py-3 font-medium">Code</th>
              <th className="px-4 py-3 font-medium">Owner</th>
              <th className="px-4 py-3 font-medium">Members</th>
              <th className="px-4 py-3 font-medium">Plan</th>
              <th className="px-4 py-3 font-medium">Subscription</th>
              <th className="px-4 py-3 font-medium">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                  Loading...
                </td>
              </tr>
            ) : data?.items.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                  No families found
                </td>
              </tr>
            ) : (
              data?.items.map((family) => (
                <tr key={family.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <Link
                      href={`/families/${family.id}`}
                      className="font-medium text-gray-900 hover:text-brand-600"
                    >
                      {family.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <code className="rounded bg-gray-100 px-2 py-0.5 text-xs font-mono text-gray-600">
                      {family.familyCode}
                    </code>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {family.owner?.name ?? "No owner"}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {family._count.members}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={family.plan === "premium" ? "success" : "secondary"}>
                      {family.plan === "premium" ? "Premium" : "Free"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    {getStatusBadge(family.subscriptionStatus)}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {formatDate(family.createdAt)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Page {data.page} of {data.totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= data.totalPages}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

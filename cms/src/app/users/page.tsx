"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Search, Check, X } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";

interface UserItem {
  id: string;
  name: string;
  email: string | null;
  role: string;
  age: number | null;
  avatarUrl: string | null;
  authProvider: string;
  emailVerified: boolean;
  isAppAdmin: boolean;
  createdAt: string;
  family: { id: string; name: string } | null;
}

interface ListResponse {
  items: UserItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function UsersPage() {
  const { toast } = useToast();
  const [data, setData] = useState<ListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [providerFilter, setProviderFilter] = useState("");
  const [page, setPage] = useState(1);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, limit: 50 };
      if (search) params.search = search;
      if (roleFilter) params.role = roleFilter;
      if (providerFilter) params.authProvider = providerFilter;
      const res = await api.get("/admin/users", { params });
      setData(res.data);
    } catch {
      toast("Failed to load users", "error");
    } finally {
      setLoading(false);
    }
  }, [page, search, roleFilter, providerFilter, toast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="text-sm text-gray-500">
            {data?.total ?? 0} users total
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9"
          />
        </div>
        <Select
          value={roleFilter}
          onChange={(e) => {
            setRoleFilter(e.target.value);
            setPage(1);
          }}
          className="w-40"
        >
          <option value="">All Roles</option>
          <option value="guardian">Guardian</option>
          <option value="child">Child</option>
        </Select>
        <Select
          value={providerFilter}
          onChange={(e) => {
            setProviderFilter(e.target.value);
            setPage(1);
          }}
          className="w-40"
        >
          <option value="">All Providers</option>
          <option value="email">Email</option>
          <option value="google">Google</option>
          <option value="apple">Apple</option>
        </Select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-left text-gray-500">
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Family</th>
              <th className="px-4 py-3 font-medium">Age</th>
              <th className="px-4 py-3 font-medium">Provider</th>
              <th className="px-4 py-3 font-medium">Verified</th>
              <th className="px-4 py-3 font-medium">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                  Loading...
                </td>
              </tr>
            ) : data?.items.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                  No users found
                </td>
              </tr>
            ) : (
              data?.items.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-medium text-gray-900">
                      {user.name}
                    </span>
                    {user.isAppAdmin && (
                      <Badge variant="destructive" className="ml-2">
                        Admin
                      </Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {user.email || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant={user.role === "guardian" ? "default" : "secondary"}
                    >
                      {user.role === "guardian" ? "Guardian" : "Child"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    {user.family ? (
                      <Link
                        href={`/families/${user.family.id}`}
                        className="text-brand-600 hover:text-brand-700"
                      >
                        {user.family.name}
                      </Link>
                    ) : (
                      <span className="text-gray-400">No family</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {user.age ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary">{user.authProvider}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    {user.emailVerified ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <X className="h-4 w-4 text-gray-300" />
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {formatDate(user.createdAt)}
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

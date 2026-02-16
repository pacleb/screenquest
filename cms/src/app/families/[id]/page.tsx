"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { api } from "@/lib/api";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";

interface FamilyMember {
  id: string;
  name: string;
  email: string | null;
  role: string;
  age: number | null;
  avatarUrl: string | null;
  authProvider: string;
  emailVerified: boolean;
  createdAt: string;
}

interface FamilyDetail {
  id: string;
  name: string;
  familyCode: string;
  plan: string;
  subscriptionStatus: string | null;
  subscriptionExpiresAt: string | null;
  subscriptionPeriod: string | null;
  gracePeriodEndsAt: string | null;
  leaderboardEnabled: boolean;
  createdAt: string;
  owner: { id: string; name: string; email: string } | null;
  members: FamilyMember[];
}

export default function FamilyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [family, setFamily] = useState<FamilyDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get(`/admin/families/${id}`)
      .then((res) => setFamily(res.data))
      .catch(() => toast("Failed to load family", "error"))
      .finally(() => setLoading(false));
  }, [id, toast]);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  if (!family) {
    return (
      <div className="text-center py-20 text-gray-400">Family not found</div>
    );
  }

  const isGuardian = (role: string) => role === "guardian" || role === "parent";
  const guardians = family.members.filter((m) => isGuardian(m.role));
  const children = family.members.filter((m) => m.role === "child");

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/families"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Families
      </Link>

      {/* Header */}
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-gray-900">{family.name}</h1>
        <code className="rounded bg-gray-100 px-2 py-0.5 text-xs font-mono text-gray-600">
          {family.familyCode}
        </code>
        <Badge variant={family.plan === "premium" ? "success" : "secondary"}>
          {family.plan === "premium" ? "Premium" : "Free"}
        </Badge>
        {getStatusBadge(family.subscriptionStatus)}
      </div>

      {/* Info Card */}
      <Card>
        <CardTitle>Family Details</CardTitle>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <p className="text-sm font-medium text-gray-500">Owner</p>
            <p className="mt-1 text-gray-900">
              {family.owner?.name ?? "No owner"}
            </p>
            {family.owner?.email && (
              <p className="text-sm text-gray-500">{family.owner.email}</p>
            )}
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Created</p>
            <p className="mt-1 text-gray-900">{formatDate(family.createdAt)}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Members</p>
            <p className="mt-1 text-gray-900">
              {guardians.length} guardian{guardians.length !== 1 ? "s" : ""},{" "}
              {children.length} child{children.length !== 1 ? "ren" : ""}
            </p>
          </div>
          {family.subscriptionExpiresAt && (
            <div>
              <p className="text-sm font-medium text-gray-500">
                Subscription Expires
              </p>
              <p className="mt-1 text-gray-900">
                {formatDate(family.subscriptionExpiresAt)}
              </p>
            </div>
          )}
          {family.subscriptionPeriod && (
            <div>
              <p className="text-sm font-medium text-gray-500">
                Billing Period
              </p>
              <p className="mt-1 text-gray-900 capitalize">
                {family.subscriptionPeriod}
              </p>
            </div>
          )}
          <div>
            <p className="text-sm font-medium text-gray-500">Leaderboard</p>
            <p className="mt-1 text-gray-900">
              {family.leaderboardEnabled ? "Enabled" : "Disabled"}
            </p>
          </div>
        </div>
      </Card>

      {/* Members Table */}
      <Card>
        <CardTitle>Members ({family.members.length})</CardTitle>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-500">
                <th className="pb-3 font-medium">Name</th>
                <th className="pb-3 font-medium">Email</th>
                <th className="pb-3 font-medium">Role</th>
                <th className="pb-3 font-medium">Age</th>
                <th className="pb-3 font-medium">Provider</th>
                <th className="pb-3 font-medium">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {family.members.map((member) => (
                <tr key={member.id}>
                  <td className="py-3 font-medium text-gray-900">
                    {member.name}
                  </td>
                  <td className="py-3 text-gray-600">{member.email || "—"}</td>
                  <td className="py-3">
                    <Badge
                      variant={
                        isGuardian(member.role) ? "default" : "secondary"
                      }
                    >
                      {isGuardian(member.role) ? "Guardian" : "Child"}
                    </Badge>
                  </td>
                  <td className="py-3 text-gray-600">{member.age ?? "—"}</td>
                  <td className="py-3">
                    <Badge variant="secondary">{member.authProvider}</Badge>
                  </td>
                  <td className="py-3 text-gray-500">
                    {formatDate(member.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BookOpen, Upload, Plus, FolderTree } from 'lucide-react';
import { api } from '@/lib/api';
import { Card, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface Stats {
  totalQuests: number;
  publishedQuests: number;
  draftQuests: number;
  totalCategories: number;
  topUsed: { id: string; name: string; icon: string; category: string; usageCount: number }[];
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/admin/quest-library/stats')
      .then((res) => setStats(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500">Quest Library overview</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <p className="text-sm font-medium text-gray-500">Total Quests</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">{stats?.totalQuests ?? 0}</p>
        </Card>
        <Card>
          <p className="text-sm font-medium text-gray-500">Published</p>
          <p className="mt-1 text-3xl font-bold text-green-600">{stats?.publishedQuests ?? 0}</p>
        </Card>
        <Card>
          <p className="text-sm font-medium text-gray-500">Drafts</p>
          <p className="mt-1 text-3xl font-bold text-yellow-600">{stats?.draftQuests ?? 0}</p>
        </Card>
        <Card>
          <p className="text-sm font-medium text-gray-500">Categories</p>
          <p className="mt-1 text-3xl font-bold text-brand-600">{stats?.totalCategories ?? 0}</p>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <Link href="/quests/new">
          <Button>
            <Plus className="h-4 w-4" />
            Add Quest
          </Button>
        </Link>
        <Link href="/quests/import">
          <Button variant="outline">
            <Upload className="h-4 w-4" />
            Import CSV
          </Button>
        </Link>
        <Link href="/quests">
          <Button variant="outline">
            <BookOpen className="h-4 w-4" />
            View All Quests
          </Button>
        </Link>
        <Link href="/categories">
          <Button variant="outline">
            <FolderTree className="h-4 w-4" />
            Manage Categories
          </Button>
        </Link>
      </div>

      {/* Top Used Quests */}
      {stats?.topUsed && stats.topUsed.length > 0 && (
        <Card>
          <CardTitle>Most Used Library Quests</CardTitle>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-500">
                  <th className="pb-3 font-medium">Quest</th>
                  <th className="pb-3 font-medium">Category</th>
                  <th className="pb-3 text-right font-medium">Families Using</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {stats.topUsed.map((q) => (
                  <tr key={q.id}>
                    <td className="py-3">
                      <span className="mr-2">{q.icon}</span>
                      <Link href={`/quests/${q.id}`} className="font-medium text-gray-900 hover:text-brand-600">
                        {q.name}
                      </Link>
                    </td>
                    <td className="py-3">
                      <Badge variant="secondary">{q.category}</Badge>
                    </td>
                    <td className="py-3 text-right font-medium text-gray-700">{q.usageCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

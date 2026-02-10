'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Upload, MoreHorizontal, Eye, EyeOff, Pencil, Trash2, Search } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';

interface LibraryQuest {
  id: string;
  name: string;
  icon: string | null;
  category: string;
  suggestedRewardMinutes: number;
  suggestedStackingType: string;
  ageRange: string | null;
  isPublished: boolean;
  sortOrder: number;
}

interface ListResponse {
  items: LibraryQuest[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function QuestsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [data, setData] = useState<ListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const fetchQuests = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, limit: 50 };
      if (search) params.search = search;
      if (categoryFilter) params.category = categoryFilter;
      if (statusFilter) params.status = statusFilter;
      const res = await api.get('/admin/quest-library', { params });
      setData(res.data);
    } catch {
      toast('Failed to load quests', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, search, categoryFilter, statusFilter, toast]);

  useEffect(() => {
    fetchQuests();
  }, [fetchQuests]);

  const togglePublish = async (quest: LibraryQuest) => {
    try {
      const action = quest.isPublished ? 'unpublish' : 'publish';
      await api.put(`/admin/quest-library/${quest.id}/${action}`);
      toast(`Quest ${action}ed`, 'success');
      fetchQuests();
    } catch {
      toast('Action failed', 'error');
    }
    setOpenMenuId(null);
  };

  const deleteQuest = async (id: string) => {
    if (!confirm('Delete this quest? This cannot be undone.')) return;
    try {
      await api.delete(`/admin/quest-library/${id}`);
      toast('Quest deleted', 'success');
      fetchQuests();
    } catch {
      toast('Delete failed', 'error');
    }
    setOpenMenuId(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quest Library</h1>
          <p className="text-sm text-gray-500">{data?.total ?? 0} quests total</p>
        </div>
        <div className="flex gap-3">
          <Link href="/quests/import">
            <Button variant="outline">
              <Upload className="h-4 w-4" />
              Import CSV
            </Button>
          </Link>
          <Link href="/quests/new">
            <Button>
              <Plus className="h-4 w-4" />
              Add Quest
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search quests..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="w-40">
          <option value="">All Status</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
        </Select>
        <Select value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }} className="w-40">
          <option value="">All Categories</option>
        </Select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-left text-gray-500">
              <th className="px-4 py-3 font-medium">Quest</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Reward</th>
              <th className="px-4 py-3 font-medium">Stacking</th>
              <th className="px-4 py-3 font-medium">Age Range</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 w-12"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-gray-400">Loading...</td>
              </tr>
            ) : data?.items.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-gray-400">No quests found</td>
              </tr>
            ) : (
              data?.items.map((quest) => (
                <tr key={quest.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/quests/${quest.id}`} className="flex items-center gap-2 hover:text-brand-600">
                      <span className="text-lg">{quest.icon || '⭐'}</span>
                      <span className="font-medium text-gray-900">{quest.name}</span>
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary">{quest.category}</Badge>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{quest.suggestedRewardMinutes}m</td>
                  <td className="px-4 py-3">
                    <Badge variant={quest.suggestedStackingType === 'stackable' ? 'success' : 'warning'}>
                      {quest.suggestedStackingType === 'stackable' ? 'Stackable' : 'Non-stack'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{quest.ageRange || '—'}</td>
                  <td className="px-4 py-3">
                    <Badge variant={quest.isPublished ? 'success' : 'warning'}>
                      {quest.isPublished ? 'Published' : 'Draft'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="relative">
                      <button
                        onClick={() => setOpenMenuId(openMenuId === quest.id ? null : quest.id)}
                        className="rounded p-1 hover:bg-gray-100"
                      >
                        <MoreHorizontal className="h-4 w-4 text-gray-500" />
                      </button>
                      {openMenuId === quest.id && (
                        <>
                          <div className="fixed inset-0 z-30" onClick={() => setOpenMenuId(null)} />
                          <div className="absolute right-0 top-8 z-40 w-44 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                            <button
                              onClick={() => { router.push(`/quests/${quest.id}`); setOpenMenuId(null); }}
                              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            >
                              <Pencil className="h-4 w-4" /> Edit
                            </button>
                            <button
                              onClick={() => togglePublish(quest)}
                              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            >
                              {quest.isPublished ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              {quest.isPublished ? 'Unpublish' : 'Publish'}
                            </button>
                            <button
                              onClick={() => deleteQuest(quest.id)}
                              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" /> Delete
                            </button>
                          </div>
                        </>
                      )}
                    </div>
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
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              Previous
            </Button>
            <Button variant="outline" size="sm" disabled={page >= data.totalPages} onClick={() => setPage(page + 1)}>
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

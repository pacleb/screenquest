'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/components/ui/toast';
import { QuestForm, QuestFormData } from '@/components/quest-form';

export default function EditQuestPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { toast } = useToast();
  const [quest, setQuest] = useState<QuestFormData | null>(null);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get(`/admin/quest-library/${id}`),
      api.get('/admin/categories'),
    ])
      .then(([questRes, catRes]) => {
        setQuest(questRes.data);
        setCategories(catRes.data);
      })
      .catch(() => toast('Failed to load quest', 'error'))
      .finally(() => setLoading(false));
  }, [id, toast]);

  const handleSubmit = async (data: QuestFormData) => {
    setSaving(true);
    try {
      await api.put(`/admin/quest-library/${id}`, data);
      toast('Quest updated!', 'success');
      router.push('/quests');
    } catch {
      toast('Failed to update quest', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this quest? This cannot be undone.')) return;
    try {
      await api.delete(`/admin/quest-library/${id}`);
      toast('Quest deleted', 'success');
      router.push('/quests');
    } catch {
      toast('Failed to delete quest', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/quests" className="rounded-lg p-2 hover:bg-gray-100 transition-colors">
          <ArrowLeft className="h-5 w-5 text-gray-500" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Quest</h1>
          <p className="text-sm text-gray-500">Update quest details</p>
        </div>
      </div>

      {quest && (
        <QuestForm
          initialData={quest}
          categories={categories}
          onSubmit={handleSubmit}
          onDelete={handleDelete}
          saving={saving}
          isEdit
        />
      )}
    </div>
  );
}

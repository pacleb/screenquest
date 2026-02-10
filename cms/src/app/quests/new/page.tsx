'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/components/ui/toast';
import { QuestForm, QuestFormData } from '@/components/quest-form';

export default function NewQuestPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    api.get('/admin/categories').then((res) => setCategories(res.data)).catch(() => {});
  }, []);

  const handleSubmit = async (data: QuestFormData) => {
    setSaving(true);
    try {
      await api.post('/admin/quest-library', data);
      toast('Quest created!', 'success');
      router.push('/quests');
    } catch {
      toast('Failed to create quest', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/quests" className="rounded-lg p-2 hover:bg-gray-100 transition-colors">
          <ArrowLeft className="h-5 w-5 text-gray-500" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Quest</h1>
          <p className="text-sm text-gray-500">Create a new library quest</p>
        </div>
      </div>

      <QuestForm categories={categories} onSubmit={handleSubmit} saving={saving} />
    </div>
  );
}

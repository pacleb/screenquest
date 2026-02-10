'use client';

import { useEffect, useState, useCallback } from 'react';
import { Plus, Pencil, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { EmojiPicker } from '@/components/emoji-picker';
import { useToast } from '@/components/ui/toast';

interface Category {
  id: string;
  name: string;
  icon: string | null;
  sortOrder: number;
}

export default function CategoriesPage() {
  const { toast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [formName, setFormName] = useState('');
  const [formIcon, setFormIcon] = useState('📁');
  const [saving, setSaving] = useState(false);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await api.get('/admin/categories');
      setCategories(res.data);
    } catch {
      toast('Failed to load categories', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const openDialog = (cat?: Category) => {
    if (cat) {
      setEditing(cat);
      setFormName(cat.name);
      setFormIcon(cat.icon || '📁');
    } else {
      setEditing(null);
      setFormName('');
      setFormIcon('📁');
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) return;
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/admin/categories/${editing.id}`, { name: formName.trim(), icon: formIcon });
        toast('Category updated', 'success');
      } else {
        await api.post('/admin/categories', { name: formName.trim(), icon: formIcon });
        toast('Category created', 'success');
      }
      setDialogOpen(false);
      fetchCategories();
    } catch {
      toast('Failed to save category', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this category?')) return;
    try {
      await api.delete(`/admin/categories/${id}`);
      toast('Category deleted', 'success');
      fetchCategories();
    } catch {
      toast('Failed to delete category', 'error');
    }
  };

  const moveCategory = async (index: number, direction: 'up' | 'down') => {
    const newList = [...categories];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= newList.length) return;
    [newList[index], newList[swapIndex]] = [newList[swapIndex], newList[index]];
    setCategories(newList);

    try {
      await api.put('/admin/categories/reorder', { ids: newList.map((c) => c.id) });
    } catch {
      toast('Failed to reorder', 'error');
      fetchCategories();
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
          <p className="text-sm text-gray-500">{categories.length} categories</p>
        </div>
        <Button onClick={() => openDialog()}>
          <Plus className="h-4 w-4" />
          Add Category
        </Button>
      </div>

      {categories.length === 0 ? (
        <Card>
          <div className="py-8 text-center text-gray-400">
            <p className="text-lg font-medium">No categories yet</p>
            <p className="text-sm">Create categories to organize your quest library</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-2">
          {categories.map((cat, index) => (
            <Card key={cat.id} className="!p-4">
              <div className="flex items-center gap-4">
                {/* Reorder buttons */}
                <div className="flex flex-col gap-0.5">
                  <button
                    onClick={() => moveCategory(index, 'up')}
                    disabled={index === 0}
                    className="rounded p-0.5 hover:bg-gray-100 disabled:opacity-30 transition-colors"
                  >
                    <ArrowUp className="h-3.5 w-3.5 text-gray-500" />
                  </button>
                  <button
                    onClick={() => moveCategory(index, 'down')}
                    disabled={index === categories.length - 1}
                    className="rounded p-0.5 hover:bg-gray-100 disabled:opacity-30 transition-colors"
                  >
                    <ArrowDown className="h-3.5 w-3.5 text-gray-500" />
                  </button>
                </div>

                {/* Category info */}
                <span className="text-2xl">{cat.icon || '📁'}</span>
                <span className="flex-1 font-medium text-gray-900">{cat.name}</span>

                {/* Actions */}
                <button onClick={() => openDialog(cat)} className="rounded p-2 hover:bg-gray-100 transition-colors">
                  <Pencil className="h-4 w-4 text-gray-500" />
                </button>
                <button onClick={() => handleDelete(cat.id)} className="rounded p-2 hover:bg-red-50 transition-colors">
                  <Trash2 className="h-4 w-4 text-red-500" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit Category' : 'New Category'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-start gap-4">
            <div>
              <Label>Icon</Label>
              <EmojiPicker value={formIcon} onChange={setFormIcon} />
            </div>
            <div className="flex-1">
              <Label htmlFor="catName">Name</Label>
              <Input
                id="catName"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Chores"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !formName.trim()}>
            {saving ? 'Saving...' : editing ? 'Update' : 'Create'}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}

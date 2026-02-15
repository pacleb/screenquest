"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { EmojiPicker } from "./emoji-picker";
import { QuestPreview } from "./quest-preview";

const REWARD_PRESETS = [300, 600, 900, 1200, 1800, 2700, 3600];
const AGE_RANGES = ["3-5", "6-8", "9-12", "13+", "all"];

export interface QuestFormData {
  name: string;
  description: string;
  icon: string;
  category: string;
  suggestedRewardSeconds: number;
  suggestedStackingType: string;
  ageRange: string;
  isPublished: boolean;
}

interface QuestFormProps {
  initialData?: Partial<QuestFormData>;
  categories: { id: string; name: string }[];
  onSubmit: (data: QuestFormData) => Promise<void>;
  onDelete?: () => void;
  saving: boolean;
  isEdit?: boolean;
}

export function QuestForm({
  initialData,
  categories,
  onSubmit,
  onDelete,
  saving,
  isEdit,
}: QuestFormProps) {
  const [form, setForm] = useState<QuestFormData>({
    name: initialData?.name || "",
    description: initialData?.description || "",
    icon: initialData?.icon || "⭐",
    category: initialData?.category || "",
    suggestedRewardSeconds: initialData?.suggestedRewardSeconds || 900,
    suggestedStackingType: initialData?.suggestedStackingType || "stackable",
    ageRange: initialData?.ageRange || "all",
    isPublished: initialData?.isPublished || false,
  });

  const update = (partial: Partial<QuestFormData>) =>
    setForm((f) => ({ ...f, ...partial }));

  const handleSubmit = async (publish?: boolean) => {
    const data = { ...form };
    if (publish !== undefined) data.isPublished = publish;
    await onSubmit(data);
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      {/* Form */}
      <div className="space-y-6">
        {/* Icon + Name */}
        <div className="flex items-start gap-4">
          <div>
            <Label>Icon</Label>
            <EmojiPicker
              value={form.icon}
              onChange={(icon) => update({ icon })}
            />
          </div>
          <div className="flex-1">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => update({ name: e.target.value })}
              placeholder="e.g. Clean Your Room"
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <Label htmlFor="desc">Description</Label>
          <Textarea
            id="desc"
            value={form.description}
            onChange={(e) => update({ description: e.target.value })}
            placeholder="What does this quest involve?"
            rows={3}
          />
        </div>

        {/* Category */}
        <div>
          <Label htmlFor="cat">Category</Label>
          <Select
            id="cat"
            value={form.category}
            onChange={(e) => update({ category: e.target.value })}
          >
            <option value="">Select a category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>

        {/* Reward */}
        <div>
          <Label>Reward Time</Label>
          <div className="flex flex-wrap gap-2 mb-2">
            {REWARD_PRESETS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => update({ suggestedRewardSeconds: s })}
                className={`rounded-full px-3 py-1 text-sm font-medium border transition-colors ${
                  form.suggestedRewardSeconds === s
                    ? "bg-brand-600 text-white border-brand-600"
                    : "bg-white text-gray-600 border-gray-300 hover:border-brand-500"
                }`}
              >
                {Math.floor(s / 60)}m
              </button>
            ))}
          </div>
          <Input
            type="number"
            min={60}
            max={28800}
            value={form.suggestedRewardSeconds}
            onChange={(e) =>
              update({ suggestedRewardSeconds: parseInt(e.target.value) || 60 })
            }
            className="w-32"
          />
        </div>

        {/* Stacking Type */}
        <div className="flex items-center gap-3">
          <Switch
            checked={form.suggestedStackingType === "stackable"}
            onCheckedChange={(checked) =>
              update({
                suggestedStackingType: checked ? "stackable" : "non_stackable",
              })
            }
          />
          <Label className="mb-0">
            {form.suggestedStackingType === "stackable"
              ? "Stackable"
              : "Non-stackable"}{" "}
            time
          </Label>
        </div>

        {/* Age Range */}
        <div>
          <Label>Age Range</Label>
          <div className="flex flex-wrap gap-2">
            {AGE_RANGES.map((ar) => (
              <button
                key={ar}
                type="button"
                onClick={() => update({ ageRange: ar })}
                className={`rounded-full px-3 py-1 text-sm font-medium border transition-colors ${
                  form.ageRange === ar
                    ? "bg-brand-600 text-white border-brand-600"
                    : "bg-white text-gray-600 border-gray-300 hover:border-brand-500"
                }`}
              >
                {ar}
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-200">
          <Button
            onClick={() => handleSubmit(false)}
            disabled={saving || !form.name || !form.category}
          >
            {saving ? "Saving..." : isEdit ? "Save Changes" : "Save as Draft"}
          </Button>
          <Button
            variant="secondary"
            onClick={() => handleSubmit(true)}
            disabled={saving || !form.name || !form.category}
          >
            {saving ? "Saving..." : "Publish"}
          </Button>
          {isEdit && onDelete && (
            <Button variant="destructive" onClick={onDelete} disabled={saving}>
              Delete
            </Button>
          )}
        </div>
      </div>

      {/* Preview sidebar */}
      <div className="lg:sticky lg:top-8 h-fit">
        <QuestPreview
          name={form.name}
          description={form.description}
          icon={form.icon}
          category={form.category}
          rewardSeconds={form.suggestedRewardSeconds}
          stackingType={form.suggestedStackingType}
          ageRange={form.ageRange}
        />
      </div>
    </div>
  );
}

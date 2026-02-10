import { Badge } from '@/components/ui/badge';

interface QuestPreviewProps {
  name: string;
  description?: string;
  icon?: string;
  category: string;
  rewardMinutes: number;
  stackingType: string;
  ageRange?: string;
}

export function QuestPreview({
  name,
  description,
  icon,
  category,
  rewardMinutes,
  stackingType,
  ageRange,
}: QuestPreviewProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="mb-2 text-xs font-medium text-gray-400 uppercase">Live Preview</p>
      <div className="flex items-start gap-3">
        <span className="text-3xl">{icon || '⭐'}</span>
        <div className="flex-1">
          <h4 className="font-semibold text-gray-900">{name || 'Quest Name'}</h4>
          {description && <p className="mt-0.5 text-sm text-gray-500 line-clamp-2">{description}</p>}
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant="secondary">{category || 'Category'}</Badge>
            <Badge variant="default">{rewardMinutes}m</Badge>
            <Badge variant={stackingType === 'stackable' ? 'success' : 'warning'}>
              {stackingType === 'stackable' ? 'Stackable' : 'Non-stackable'}
            </Badge>
            {ageRange && <Badge variant="secondary">{ageRange}</Badge>}
          </div>
        </div>
      </div>
    </div>
  );
}

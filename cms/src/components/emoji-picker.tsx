'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

const EMOJI_GROUPS = {
  Activities: ['⭐', '🎯', '🏆', '🎨', '📚', '🎵', '🎮', '🏃', '🧹', '🍳', '🛏️', '🪥', '📝', '🧩', '🎭', '🎪'],
  Animals: ['🐶', '🐱', '🐰', '🦊', '🐼', '🦁', '🐸', '🦋', '🐝', '🐢', '🐬', '🦄', '🐧', '🐨', '🐮', '🐷'],
  Nature: ['🌟', '🌈', '☀️', '🌙', '⚡', '🔥', '💧', '🌊', '🌸', '🌻', '🌲', '🍀', '🌍', '❄️', '🌺', '🍁'],
  Objects: ['🎒', '📖', '✏️', '🔧', '🧰', '💡', '🔔', '🎁', '🏠', '🚗', '✈️', '🚀', '⚽', '🏀', '🎾', '🏈'],
  Food: ['🍎', '🍕', '🥗', '🥕', '🍇', '🥦', '🥚', '🧁', '🍌', '🍓', '🥤', '🍪'],
};

interface EmojiPickerProps {
  value: string;
  onChange: (emoji: string) => void;
}

export function EmojiPicker({ value, onChange }: EmojiPickerProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex h-14 w-14 items-center justify-center rounded-lg border-2 border-dashed border-gray-300 text-2xl hover:border-brand-500 transition-colors"
      >
        {value || '✨'}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-16 left-0 z-50 w-80 rounded-xl border border-gray-200 bg-white p-4 shadow-xl">
            {Object.entries(EMOJI_GROUPS).map(([group, emojis]) => (
              <div key={group} className="mb-3">
                <p className="mb-1 text-xs font-medium text-gray-400 uppercase">{group}</p>
                <div className="flex flex-wrap gap-1">
                  {emojis.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => {
                        onChange(emoji);
                        setOpen(false);
                      }}
                      className={cn(
                        'flex h-8 w-8 items-center justify-center rounded text-lg hover:bg-gray-100 transition-colors',
                        value === emoji && 'bg-brand-100 ring-2 ring-brand-500',
                      )}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

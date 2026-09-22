import React, { useState } from 'react';
import { Check, LayoutGrid } from 'lucide-react';
import { Button } from './ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from './ui/sheet';
import type { DiscoveryChannelId } from '../types';

interface DiscoveryChannel {
  id: DiscoveryChannelId;
  name: string;
  nameEn: string;
  icon: React.ReactNode;
}

interface DiscoveryChannelPickerProps {
  channels: DiscoveryChannel[];
  selectedChannel: DiscoveryChannelId;
  onChannelSelect: (channel: DiscoveryChannelId) => void;
  language: 'zh' | 'en';
}

export const DiscoveryChannelPicker: React.FC<DiscoveryChannelPickerProps> = ({
  channels,
  selectedChannel,
  onChannelSelect,
  language,
}) => {
  const [open, setOpen] = useState(false);
  const t = (zh: string, en: string) => (language === 'zh' ? zh : en);

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        className="touch-target-44 h-11 w-11 shrink-0 rounded-none"
        aria-label={t('全部频道', 'All channels')}
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <LayoutGrid className="h-4 w-4" />
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="bottom"
          showClose={false}
          className="max-h-[85dvh] gap-3 overflow-hidden rounded-t-2xl p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
        >
          <SheetHeader className="pr-0">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <SheetTitle className="text-base">{t('全部频道', 'All channels')}</SheetTitle>
                <SheetDescription>{t('选择一个发现频道', 'Choose a discovery channel')}</SheetDescription>
              </div>
              <Button
                type="button"
                variant="ghost"
                className="touch-target-44 h-11 shrink-0 px-3"
                onClick={() => setOpen(false)}
              >
                {t('完成', 'Done')}
              </Button>
            </div>
          </SheetHeader>
          <div className="min-h-0 flex-1 space-y-1 overflow-y-auto">
            {channels.map((channel) => {
              const selected = channel.id === selectedChannel;
              const label = language === 'zh' ? channel.name : channel.nameEn;
              return (
                <button
                  key={channel.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => {
                    onChannelSelect(channel.id);
                    setOpen(false);
                  }}
                  className={`flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm ${
                    selected ? 'bg-primary/10 font-medium text-primary' : 'hover:bg-accent'
                  }`}
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center" aria-hidden="true">{channel.icon}</span>
                  <span className="min-w-0 flex-1 truncate">{label}</span>
                  {selected && <Check className="h-4 w-4 shrink-0" aria-hidden="true" />}
                </button>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};

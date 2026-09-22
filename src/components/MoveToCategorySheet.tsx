import React from 'react';
import { Check, FolderTree } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from './ui/sheet';
import { Button } from './ui/button';
import type { Category, Repository } from '../types';
import { useAppStore } from '../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { useCategorySyncActions } from '../features/repositories/hooks/useCategorySyncActions';
import { buildRepositoryCategoryAssignment, getAICategory, getDefaultCategory } from '../utils/categoryUtils';
import { useDialog } from '../hooks/useDialog';

interface MoveToCategorySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  repository: Repository;
  categories: Category[];
}

export const MoveToCategorySheet: React.FC<MoveToCategorySheetProps> = ({
  open,
  onOpenChange,
  repository,
  categories,
}) => {
  const { language, updateRepository } = useAppStore(useShallow((state) => ({
    language: state.language,
    updateRepository: state.updateRepository,
  })));
  const { forceSyncToBackend } = useCategorySyncActions();
  const { toast } = useDialog();
  const t = (zh: string, en: string) => (language === 'zh' ? zh : en);
  const effectiveName = repository.custom_category?.trim()
    ? repository.custom_category
    : (getAICategory(repository, categories) || getDefaultCategory(repository, categories));

  const assign = async (category: Category) => {
    const next = buildRepositoryCategoryAssignment(repository, category, categories);
    if (!next) {
      onOpenChange(false);
      return;
    }
    updateRepository(next);
    try {
      await forceSyncToBackend();
      onOpenChange(false);
    } catch {
      updateRepository(repository);
      toast(t('同步到后端失败，已恢复分类更改。', 'Failed to sync to backend. Category change has been reverted.'), 'error');
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        showClose={false}
        className="max-h-[85dvh] gap-3 overflow-hidden rounded-t-2xl p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
        onClick={(event) => event.stopPropagation()}
      >
        <SheetHeader className="pr-0">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <SheetTitle className="flex items-center gap-2 text-base">
                <FolderTree className="h-4 w-4 shrink-0" aria-hidden="true" />
                {t('移到分类', 'Move to category')}
              </SheetTitle>
              <SheetDescription className="truncate">
                {repository.full_name}
              </SheetDescription>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="touch-target-44 h-11 w-11 shrink-0"
              onClick={() => onOpenChange(false)}
              aria-label={t('关闭分类选择', 'Close category picker')}
            >
              <span aria-hidden="true">×</span>
            </Button>
          </div>
        </SheetHeader>
        <div className="min-h-0 flex-1 space-y-1 overflow-y-auto">
          {categories.map((category) => {
            const selected = category.id === 'all' ? !effectiveName : category.name === effectiveName;
            return (
              <button
                key={category.id}
                type="button"
                onClick={() => void assign(category)}
                aria-pressed={selected}
                className={`flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm ${
                  selected ? 'bg-primary/10 font-medium text-primary' : 'hover:bg-accent'
                }`}
              >
                <span className="w-6 shrink-0 text-center text-base" aria-hidden="true">{category.icon}</span>
                <span className="min-w-0 flex-1 truncate">{category.name}</span>
                {selected && <Check className="h-4 w-4 shrink-0" aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
};

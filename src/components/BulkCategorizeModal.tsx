import { Button } from './ui/button';
import React, { useId, useState, useEffect } from 'react';
import { Check } from 'lucide-react';
import { Modal } from './Modal';
import { Repository } from '../types';
import { useAppStore, getAllCategories } from '../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';

interface BulkCategorizeModalProps {
  isOpen: boolean;
  onClose: () => void;
  repositories: Repository[];
  onCategorize: (categoryName: string) => Promise<void>;
}

export const BulkCategorizeModal: React.FC<BulkCategorizeModalProps> = ({
  isOpen,
  onClose,
  repositories,
  onCategorize
}) => {
  const { customCategories, hiddenDefaultCategoryIds, defaultCategoryOverrides, language } = useAppStore(useShallow((state) => ({
    customCategories: state.customCategories,
    hiddenDefaultCategoryIds: state.hiddenDefaultCategoryIds,
    defaultCategoryOverrides: state.defaultCategoryOverrides,
    language: state.language,
  })));
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const categorySelectionLabelId = useId();

  const allCategories = getAllCategories(customCategories, language, hiddenDefaultCategoryIds, defaultCategoryOverrides);

  useEffect(() => {
    if (isOpen) {
      setSelectedCategory(null);
    }
  }, [isOpen]);

  const [error, setError] = useState<string | null>(null);

  const handleCategorize = async () => {
    if (!selectedCategory) return;

    const category = allCategories.find(cat => cat.id === selectedCategory);
    if (!category) return;

    setIsProcessing(true);
    setError(null);
    try {
      await onCategorize(category.name);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('分类失败', 'Categorization failed'));
    } finally {
      setIsProcessing(false);
    }
  };

  const t = (zh: string, en: string) => language === 'zh' ? zh : en;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('批量分类', 'Bulk Categorize')}
    >
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground dark:text-muted-foreground">
          {t(`将为 ${repositories.length} 个仓库设置分类：`, `Will set category for ${repositories.length} repositories:`)}
        </p>

        <div className="space-y-2">
          <h3 id={categorySelectionLabelId} className="mb-2 block text-sm font-medium text-foreground dark:text-foreground">
            {t('选择分类', 'Select Category')}
          </h3>

          <div
            role="group"
            aria-labelledby={categorySelectionLabelId}
            className="max-h-64 overflow-y-auto space-y-2"
          >
            {allCategories.filter(cat => cat.id !== 'all').map(category => (
              <Button
                key={category.id}
                variant="ghost"
                aria-pressed={selectedCategory === category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`flex h-auto min-h-11 w-full items-center justify-between rounded-lg border px-4 py-3 transition-colors ${
                  selectedCategory === category.id
                    ? 'border-primary bg-muted dark:bg-primary/10'
                    : 'border-border dark:hover:border-border-strong'
                }`}
              >
                <div className="flex min-w-0 items-center space-x-3">
                  <span className="min-w-0 break-words text-left text-sm font-medium text-foreground dark:text-foreground">
                    {category.name}
                  </span>
                </div>
                {selectedCategory === category.id && (
                  <Check className="w-5 h-5 text-primary" />
                )}
              </Button>
            ))}
          </div>
        </div>

        {error && (
          <div role="alert" className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-destructive dark:bg-destructive/10">
            <p className="text-sm text-destructive">
              {error}
            </p>
          </div>
        )}

        <div className="bg-muted dark:bg-warning/10 border border-border dark:border-warning/20 rounded-lg p-3">
          <p className="text-sm text-muted-foreground dark:text-muted-foreground ">
            {t('提示：此操作将覆盖这些仓库现有的自定义分类。', 'Note: This operation will overwrite the existing custom categories of these repositories.')}
          </p>
        </div>

        <div className="flex flex-col-reverse gap-2 pt-4 sm:flex-row sm:justify-end">
          <Button
            onClick={onClose}
            disabled={isProcessing}
            className="h-11 w-full rounded-lg bg-muted px-4 text-foreground hover:bg-accent disabled:opacity-50 sm:h-9 sm:w-auto dark:bg-muted/40 dark:text-foreground dark:hover:bg-accent"
          >
            {t('取消', 'Cancel')}
          </Button>
          <Button
            onClick={handleCategorize}
            disabled={!selectedCategory || isProcessing}
            className="h-11 w-full rounded-lg bg-primary px-4 text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50 sm:h-9 sm:w-auto dark:bg-primary dark:hover:bg-primary/80"
          >
            {isProcessing ? t('处理中…', 'Processing…') : t('确认分类', 'Confirm Categorize')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import React, { useState, useEffect } from 'react';
import { X, Plus } from 'lucide-react';
import { Modal } from './Modal';
import { AssetFilter } from '../types';

interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  filter?: AssetFilter;
  onSave: (filter: AssetFilter) => void;
}

export const FilterModal: React.FC<FilterModalProps> = ({
  isOpen,
  onClose,
  filter,
  onSave
}) => {
  const [name, setName] = useState('');
  const [keywords, setKeywords] = useState<string[]>([]);
  const [newKeyword, setNewKeyword] = useState('');

  useEffect(() => {
    if (filter) {
      setName(filter.name);
      setKeywords([...filter.keywords]);
    } else {
      setName('');
      setKeywords([]);
    }
    setNewKeyword('');
  }, [filter, isOpen]);

  const handleAddKeyword = () => {
    const trimmed = newKeyword.trim();
    if (trimmed && !keywords.includes(trimmed)) {
      setKeywords([...keywords, trimmed]);
      setNewKeyword('');
    }
  };

  const handleRemoveKeyword = (index: number) => {
    setKeywords(keywords.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    if (!name.trim() || keywords.length === 0) {
      return;
    }

    const savedFilter: AssetFilter = {
      id: filter?.id || Date.now().toString(),
      name: name.trim(),
      keywords: keywords.filter(k => k.trim())
    };

    onSave(savedFilter);
    onClose();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleAddKeyword();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={filter ? '编辑过滤器' : '新建过滤器'}
      mobileFullScreen
      scrollable
      footer={(
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            onClick={onClose}
            className="h-11 w-full bg-muted text-foreground hover:bg-accent sm:w-auto dark:border dark:border-border dark:bg-muted/40 dark:hover:bg-accent"
          >
            取消
          </Button>
          <Button
            onClick={handleSave}
            disabled={!name.trim() || keywords.length === 0}
            className="h-11 w-full sm:w-auto"
          >
            {filter ? '保存' : '创建'}
          </Button>
        </div>
      )}
    >
      <div className="space-y-4">
        {/* Filter Name */}
        <div>
          <label htmlFor="filter-name" className="block text-sm font-medium text-foreground dark:text-foreground mb-2">
            过滤器名称
          </label>
          <Input
            id="filter-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例如: macOS"
            className="h-11 w-full border-border bg-card px-3 text-base text-foreground dark:border-border dark:bg-muted/40 dark:text-foreground sm:h-10 sm:text-sm"
          />
        </div>

        {/* Keywords */}
        <div>
          <label htmlFor="filter-keywords" className="block text-sm font-medium text-foreground dark:text-foreground mb-2">
            匹配关键词
          </label>
          
          {/* Add keyword input */}
          <div className="mb-3 flex flex-col gap-2 sm:flex-row">
            <Input
              id="filter-keywords"
              type="text"
              value={newKeyword}
              onChange={(e) => setNewKeyword(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="输入关键词，如: mac, dmg"
              className="h-11 w-full border-border bg-card px-3 text-base text-foreground dark:border-border dark:bg-muted/40 dark:text-foreground sm:h-10 sm:flex-1 sm:text-sm"
            />
            <Button
              onClick={handleAddKeyword}
              disabled={!newKeyword.trim()}
              className="h-11 w-full sm:w-auto"
            >
              <Plus className="w-4 h-4" />
              <span>添加</span>
            </Button>
          </div>

          {/* Keywords list */}
          {keywords.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground dark:text-muted-foreground">
                已添加的关键词:
              </p>
              <div className="flex flex-wrap gap-2">
                {keywords.map((keyword, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-1 rounded-md border border-border bg-muted px-2 py-1"
                  >
                    <Badge variant="secondary" className="h-auto rounded-sm border-0 bg-transparent px-0 text-sm font-medium text-secondary-foreground">
                      {keyword}
                    </Badge>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => handleRemoveKeyword(index)}
                      aria-label={`删除关键词 ${keyword}`}
                      className="h-11 w-11 p-0 text-muted-foreground transition-colors hover:text-foreground dark:text-muted-foreground dark:hover:text-foreground"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {keywords.length === 0 && (
            <p className="text-sm text-muted-foreground dark:text-muted-foreground">
              请添加至少一个关键词用于匹配文件名
            </p>
          )}
        </div>

        {/* Help text */}
        <div className="bg-muted dark:bg-muted/40 border border-border dark:border-border rounded-lg p-3">
          <p className="text-sm text-muted-foreground dark:text-muted-foreground">
            <strong>提示:</strong> 关键词将用于匹配 GitHub Release 中的文件名。例如，添加 "mac" 和 "dmg" 关键词可以匹配包含这些字符的文件。
          </p>
        </div>

      </div>
    </Modal>
  );
};
import { Key } from 'lucide-react';
import type { FC } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { Switch } from '../ui/switch';

interface IncludeKeysToggleProps {
  t: (zh: string, en: string) => string;
}

export const IncludeKeysToggle: FC<IncludeKeysToggleProps> = ({ t }) => {
  const { includeKeysInBackup, setIncludeKeysInBackup } = useAppStore(useShallow((state) => ({
    includeKeysInBackup: state.includeKeysInBackup,
    setIncludeKeysInBackup: state.setIncludeKeysInBackup,
  })));
  const label = t('备份/导出时包含密钥', 'Include keys in backup/export');

  return (
    <div className="rounded-md border border-border bg-card p-4">
      <label className="flex min-h-11 cursor-pointer items-center justify-between gap-4">
        <span className="flex min-w-0 items-center space-x-3">
          <Key className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="min-w-0">
            <span className="block text-sm font-medium text-foreground">{label}</span>
            <span className="block text-sm text-muted-foreground">{t('包含 AI 配置、WebDAV、代理、远程下载和后端服务器的密钥', 'Includes keys for AI configs, WebDAV, proxy, remote download, and backend server')}</span>
          </span>
        </span>
        <Switch checked={includeKeysInBackup} onCheckedChange={setIncludeKeysInBackup} aria-label={label} className="after:-inset-y-3" />
      </label>
    </div>
  );
};

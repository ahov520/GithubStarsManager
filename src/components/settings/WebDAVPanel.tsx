import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import React, { useState } from 'react';
import { Cloud, Plus, Edit3, Trash2, Save, X, TestTube, RefreshCw } from 'lucide-react';
import { WebDAVConfig } from '../../types';
import { useAppStore } from '../../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { useWebDAVActions } from '../../features/settings/hooks/useWebDAVActions';
import { useDialog } from '../../hooks/useDialog';

interface WebDAVPanelProps {
  t: (zh: string, en: string) => string;
}

export const WebDAVPanel: React.FC<WebDAVPanelProps> = ({ t }) => {
  const {
    webdavConfigs,
    activeWebDAVConfig,
    deleteWebDAVConfig,
    setActiveWebDAVConfig,
  } = useAppStore(useShallow((state) => ({
    webdavConfigs: state.webdavConfigs,
    activeWebDAVConfig: state.activeWebDAVConfig,
    deleteWebDAVConfig: state.deleteWebDAVConfig,
    setActiveWebDAVConfig: state.setActiveWebDAVConfig,
  })));

  const { confirm } = useDialog();
  const { testingId, save, test } = useWebDAVActions({ t });

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '',
    url: '',
    username: '',
    password: '',
    path: '/',
  });

  const resetForm = () => {
    setForm({
      name: '',
      url: '',
      username: '',
      password: '',
      path: '/',
    });
    setShowForm(false);
    setEditingId(null);
  };

  const handleSave = () => {
    if (save(form, editingId)) resetForm();
  };

  const handleEdit = (config: WebDAVConfig) => {
    setForm({
      name: config.name,
      url: config.url,
      username: config.username,
      password: config.password,
      path: config.path,
    });
    setEditingId(config.id);
    setShowForm(true);
  };

  const handleTest = (config: WebDAVConfig) => test(config);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center space-x-3">
          <Cloud className="w-6 h-6 text-muted-foreground dark:text-muted-foreground" />
          <h3 className="text-lg font-semibold text-foreground dark:text-foreground">
            {t('WebDAV配置', 'WebDAV Configuration')}
          </h3>
        </div>
        <Button
          onClick={() => setShowForm(true)}
          className="touch-target-44 flex h-11 items-center gap-2 rounded-lg bg-primary px-4 text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Plus className="w-4 h-4" />
          <span>{t('添加WebDAV', 'Add WebDAV')}</span>
        </Button>
      </div>

      {showForm && (
        <div className="p-4 bg-background dark:bg-muted/40 rounded-lg border border-border dark:border-border">
          <h4 className="font-medium text-foreground dark:text-foreground mb-4">
            {editingId ? t('编辑WebDAV配置', 'Edit WebDAV Configuration') : t('添加WebDAV配置', 'Add WebDAV Configuration')}
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label htmlFor="webdav-name" className="block text-sm font-medium text-foreground dark:text-muted-foreground mb-1">
                {t('配置名称', 'Configuration Name')} *
              </label>
              <Input
                id="webdav-name"
                type="text"
                value={form.name}
                onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                className="h-11 w-full rounded-lg border border-border bg-card px-3 text-base text-foreground focus:border-transparent focus:outline-none focus:ring-2 focus:ring-ring dark:border-border dark:bg-card dark:text-foreground sm:h-9 sm:text-sm"
                placeholder={t('例如: 坚果云', 'e.g., Nutstore')}
              />
            </div>
            
            <div>
              <label htmlFor="webdav-url" className="block text-sm font-medium text-foreground dark:text-muted-foreground mb-1">
                {t('WebDAV URL', 'WebDAV URL')} *
              </label>
              <Input
                id="webdav-url"
                type="url"
                value={form.url}
                onChange={(e) => setForm(prev => ({ ...prev, url: e.target.value }))}
                className="h-11 w-full rounded-lg border border-border bg-card px-3 text-base text-foreground focus:border-transparent focus:outline-none focus:ring-2 focus:ring-ring dark:border-border dark:bg-card dark:text-foreground sm:h-9 sm:text-sm"
                placeholder="https://dav.jianguoyun.com/dav/"
              />
            </div>
            
            <div>
              <label htmlFor="webdav-username" className="block text-sm font-medium text-foreground dark:text-muted-foreground mb-1">
                {t('用户名', 'Username')} *
              </label>
              <Input
                id="webdav-username"
                type="text"
                value={form.username}
                onChange={(e) => setForm(prev => ({ ...prev, username: e.target.value }))}
                className="h-11 w-full rounded-lg border border-border bg-card px-3 text-base text-foreground focus:border-transparent focus:outline-none focus:ring-2 focus:ring-ring dark:border-border dark:bg-card dark:text-foreground sm:h-9 sm:text-sm"
                placeholder={t('WebDAV用户名', 'WebDAV username')}
              />
            </div>
            
            <div>
              <label htmlFor="webdav-password" className="block text-sm font-medium text-foreground dark:text-muted-foreground mb-1">
                {t('密码', 'Password')} *
              </label>
              <Input
                id="webdav-password"
                type="password"
                value={form.password}
                onChange={(e) => setForm(prev => ({ ...prev, password: e.target.value }))}
                className="h-11 w-full rounded-lg border border-border bg-card px-3 text-base text-foreground focus:border-transparent focus:outline-none focus:ring-2 focus:ring-ring dark:border-border dark:bg-card dark:text-foreground sm:h-9 sm:text-sm"
                placeholder={t('WebDAV密码', 'WebDAV password')}
              />
            </div>
            
            <div className="md:col-span-2">
              <label htmlFor="webdav-path" className="block text-sm font-medium text-foreground dark:text-muted-foreground mb-1">
                {t('路径', 'Path')} *
              </label>
              <Input
                id="webdav-path"
                type="text"
                value={form.path}
                onChange={(e) => setForm(prev => ({ ...prev, path: e.target.value }))}
                className="h-11 w-full rounded-lg border border-border bg-card px-3 text-base text-foreground focus:border-transparent focus:outline-none focus:ring-2 focus:ring-ring dark:border-border dark:bg-card dark:text-foreground sm:h-9 sm:text-sm"
                placeholder="/github-stars-manager/"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              onClick={handleSave}
              className="touch-target-44 flex h-11 items-center gap-2 rounded-lg bg-primary px-4 text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Save className="w-4 h-4" />
              <span>{t('保存', 'Save')}</span>
            </Button>
            <Button
              onClick={resetForm}
              className="touch-target-44 flex h-11 items-center gap-2 rounded-lg border border-border bg-muted px-4 text-foreground transition-colors hover:bg-accent dark:border-border dark:bg-muted/40 dark:text-foreground dark:hover:bg-accent"
            >
              <X className="w-4 h-4" />
              <span>{t('取消', 'Cancel')}</span>
            </Button>
          </div>
        </div>
      )}

      <RadioGroup
        value={activeWebDAVConfig || ''}
        onValueChange={setActiveWebDAVConfig}
        aria-label={t('当前 WebDAV 配置', 'Active WebDAV configuration')}
        className="space-y-3"
      >
        {webdavConfigs.map(config => (
          <div
            key={config.id}
            className={`p-4 rounded-lg border transition-colors ${
              config.id === activeWebDAVConfig
                ? 'border-border bg-accent/50 dark:border-border/[0.12] dark:bg-accent/60'
                : 'border-border dark:border-border hover:border-border dark:hover:border-border-strong'
            }`}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <RadioGroupItem
                  value={config.id}
                  id={`active-webdav-${config.id}`}
                  aria-label={config.name || t('WebDAV 配置', 'WebDAV configuration')}
                  className="relative mt-1 h-5 w-5 before:absolute before:-inset-3 before:content-['']"
                />
                <div className="min-w-0">
                  <h4 className="font-medium text-foreground dark:text-foreground">{config.name}</h4>
                  <p className="break-all text-sm text-muted-foreground dark:text-muted-foreground">
                    {config.url} • {config.path}
                  </p>
                  {config.passwordStatus === 'decrypt_failed' && (
                    <p className="mt-1 text-sm text-muted-foreground dark:text-muted-foreground ">
                      {t(
                        '存储的 WebDAV 密码无法解密，请重新输入并保存该配置。',
                        'The stored WebDAV password could not be decrypted. Please re-enter and save this configuration.'
                      )}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-2 self-end sm:shrink-0">
                <Button
                  onClick={() => handleTest(config)}
                  disabled={testingId === config.id}
                  className="touch-target-44 h-11 w-11 rounded-lg bg-muted p-0 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50 dark:bg-muted/40 dark:text-muted-foreground dark:hover:bg-accent dark:hover:text-foreground sm:h-9 sm:w-9"
                  aria-label={t('测试连接', 'Test Connection')}
                  title={t('测试连接', 'Test Connection')}
                >
                  {testingId === config.id ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <TestTube className="w-4 h-4" />
                  )}
                </Button>
                <Button
                  onClick={() => handleEdit(config)}
                  className="touch-target-44 h-11 w-11 rounded-lg bg-muted p-0 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground dark:bg-muted/40 dark:text-muted-foreground dark:hover:bg-accent dark:hover:text-foreground sm:h-9 sm:w-9"
                  aria-label={t('编辑', 'Edit')}
                  title={t('编辑', 'Edit')}
                >
                  <Edit3 className="w-4 h-4" />
                </Button>
                <Button
                  onClick={async () => {
                    const confirmed = await confirm(
                      t('确定要删除这个WebDAV配置吗？', 'Delete WebDAV Configuration?'),
                      t('此操作无法撤销。', 'This action cannot be undone.'),
                      { type: 'danger', confirmText: t('删除', 'Delete') }
                    );
                    if (confirmed) {
                      deleteWebDAVConfig(config.id);
                    }
                  }}
                  className="touch-target-44 h-11 w-11 rounded-lg bg-muted p-0 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground dark:bg-muted/40 dark:text-muted-foreground dark:hover:bg-accent dark:hover:text-foreground sm:h-9 sm:w-9"
                  aria-label={t('删除', 'Delete')}
                  title={t('删除', 'Delete')}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </RadioGroup>
        {webdavConfigs.length === 0 && (
          <div className="text-center py-8 text-muted-foreground dark:text-muted-foreground">
            <Cloud className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>{t('还没有配置WebDAV服务', 'No WebDAV services configured yet')}</p>
            <p className="text-sm">{t('点击上方按钮添加WebDAV配置', 'Click the button above to add WebDAV configuration')}</p>
          </div>
        )}
    </div>
  );
};

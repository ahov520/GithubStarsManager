import { useEffect } from 'react';
import { installAndroidBackButton } from '../utils/androidBack';

/** 仅由 Android MainActivity 在系统返回时调用 window.__gsmAndroidBack。 */
export function useAndroidBackButton(): void {
  useEffect(() => installAndroidBackButton(), []);
}

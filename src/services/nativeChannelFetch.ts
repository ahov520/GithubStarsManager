/**
 * 安卓（Capacitor）上的 Telegram / X 传输层。
 *
 * WebView 里的 fetch 受 CORS 限制，不能直连 t.me 与 x.com。CapacitorHttp
 * 走系统 HttpURLConnection，不经过 WebView 的跨域检查。只在原生平台启用；
 * 网页版仍依赖桌面 IPC 或服务端代抓。
 */

import { Capacitor, CapacitorHttp } from '@capacitor/core';
import type { XTweetAuth } from '../types';
import { isAllowedXGraphQLUrl } from './electronProxy';

/** 与桌面端、服务端代抓使用同一套浏览器 UA，避免上游返回另一套页面。 */
const BROWSER_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';
const X_WEB_BEARER = 'AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA';
const X_COOKIE_VALUE_PATTERN = /^[\w%+/=.~-]+$/;
const TELEGRAM_CHANNEL_PATTERN = /^[A-Za-z0-9_]{3,64}$/;
const BEFORE_PATTERN = /^\d{1,20}$/;
const X_HANDLE_PATTERN = /^[A-Za-z0-9_]{1,15}$/;

export const isNativeChannelFetchAvailable = (): boolean => {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
};

const browserHeaders = (accept: string): Record<string, string> => ({
  'User-Agent': BROWSER_UA,
  // Android WebView 会丢掉脚本设置的 User-Agent，原生层认这个头。
  'x-cap-user-agent': BROWSER_UA,
  Accept: accept,
  'Accept-Language': 'en-US,en;q=0.9',
});

const bodyToString = (data: unknown): string => {
  if (typeof data === 'string') return data;
  if (data == null) return '';
  return JSON.stringify(data);
};

const nativeGet = async (
  url: string,
  headers: Record<string, string>,
  disableRedirects: boolean,
): Promise<{ status: number; body: string; url: string }> => {
  const response = await CapacitorHttp.get({
    url,
    headers,
    responseType: 'text',
    connectTimeout: 20_000,
    readTimeout: 20_000,
    disableRedirects,
  });
  return {
    status: response.status,
    body: bodyToString(response.data),
    url: typeof response.url === 'string' && response.url ? response.url : url,
  };
};

export const fetchTelegramChannelViaNative = async (channel: string, before?: string): Promise<string> => {
  if (!TELEGRAM_CHANNEL_PATTERN.test(channel)) {
    throw new Error('invalid channel');
  }
  if (before && !BEFORE_PATTERN.test(before)) {
    throw new Error('invalid before cursor');
  }
  const url = before
    ? `https://t.me/s/${channel}?before=${encodeURIComponent(before)}`
    : `https://t.me/s/${channel}`;
  const response = await nativeGet(url, browserHeaders('text/html,application/xhtml+xml'), false);
  if (response.status < 200 || response.status >= 300) {
    throw new Error(`t.me responded ${response.status}`);
  }
  return response.body;
};

export const fetchXTimelineViaNative = async (handle: string): Promise<string> => {
  if (!X_HANDLE_PATTERN.test(handle)) {
    throw new Error('invalid handle');
  }
  const response = await nativeGet(
    `https://x.com/${handle}`,
    browserHeaders('text/html,application/xhtml+xml'),
    false,
  );
  if (response.status < 200 || response.status >= 300) {
    throw new Error(`x.com responded ${response.status}`);
  }
  return response.body;
};

const cleanCookie = (value: string): string => value.trim().replace(/^["']|["']$/g, '').trim();

export const fetchXGraphQLViaNative = async (url: string, auth: XTweetAuth): Promise<string> => {
  if (!isAllowedXGraphQLUrl(url)) {
    throw new Error('invalid url for x.com fetch');
  }
  const authToken = cleanCookie(auth.authToken);
  const ct0 = cleanCookie(auth.ct0);
  if (!authToken || !ct0 || !X_COOKIE_VALUE_PATTERN.test(authToken) || !X_COOKIE_VALUE_PATTERN.test(ct0)) {
    throw new Error('invalid auth cookies');
  }
  const isApiCall = url.startsWith('https://x.com/i/api/');
  const headers = isApiCall
    ? {
        ...browserHeaders('*/*'),
        Authorization: `Bearer ${X_WEB_BEARER}`,
        'X-CSRF-Token': ct0,
        'X-Twitter-Auth-Type': 'OAuth2Session',
        'X-Twitter-Active-User': 'yes',
        Cookie: `auth_token=${authToken}; ct0=${ct0}`,
      }
    : {
        ...browserHeaders('text/html,application/xhtml+xml,*/*;q=0.8'),
        ...(url.startsWith('https://x.com/') ? { Cookie: `auth_token=${authToken}; ct0=${ct0}` } : {}),
      };
  const response = await nativeGet(url, headers, true);
  if (!isAllowedXGraphQLUrl(response.url)) {
    throw new Error('redirect blocked');
  }
  if (response.status < 200 || response.status >= 300) {
    throw new Error(`x.com responded ${response.status}`);
  }
  return response.body;
};

import { getState } from "@/lib/storage";

export interface PopupModel {
  supported: boolean;
  origin?: string;
  hostname?: string;
  master: boolean;
  siteEnabled: boolean;
  forceEnabled: boolean;
}

const RESTRICTED_URL_PATTERNS: RegExp[] = [
  /^chrome:\/\//i,
  /^chrome-extension:\/\//i,
  /^chrome-untrusted:\/\//i,
  /^edge:\/\//i,
  /^about:/i,
  /^view-source:/i,
  /^devtools:\/\//i,
  /^https?:\/\/chrome\.google\.com\/webstore/i,
  /^https?:\/\/chromewebstore\.google\.com/i,
];

function isRestrictedUrl(url: string | undefined): boolean {
  if (!url) return false;
  return RESTRICTED_URL_PATTERNS.some((pattern) => pattern.test(url));
}

function supportedUrlOf(url: string | undefined): URL | undefined {
  if (!url || isRestrictedUrl(url)) return undefined;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:")
      return undefined;
    if (parsed.pathname.toLowerCase().endsWith(".pdf")) return undefined;
    return parsed;
  } catch {
    return undefined;
  }
}

export function supportedOriginOf(url: string | undefined): string | undefined {
  return supportedUrlOf(url)?.origin;
}

async function getActiveTabUrl(): Promise<string | undefined> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab?.url;
}

export async function loadPopupModel(): Promise<PopupModel> {
  const [state, url] = await Promise.all([getState(), getActiveTabUrl()]);
  const supportedUrl = supportedUrlOf(url);
  const origin = supportedUrl?.origin;
  const supported = origin !== undefined;
  return {
    supported,
    origin,
    hostname: supportedUrl?.hostname,
    master: state.master,
    siteEnabled: origin !== undefined ? state.sites[origin] === true : false,
    forceEnabled:
      origin !== undefined ? state.forceSites[origin] === true : false,
  };
}

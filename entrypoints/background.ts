import { defineBackground } from "#imports";
import { getState, setSiteEnabled } from "@/lib/storage";
import { supportedOriginOf } from "@/lib/rtl";

const TOGGLE_RTL = "toggle-rtl";

async function toggleActiveTabRtl(): Promise<void> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const origin = supportedOriginOf(tab?.url);
  if (!origin) return;
  const state = await getState();
  if (!state.master) return;
  await setSiteEnabled(origin, state.sites[origin] !== true);
}

export default defineBackground(() => {
  chrome.commands.onCommand.addListener((command) => {
    if (command !== TOGGLE_RTL) return;
    void toggleActiveTabRtl();
  });
});

import { defineContentScript } from "#imports";
import {
  getState,
  isActiveFor,
  isForceActiveFor,
  subscribe,
  type RtlState,
} from "@/lib/storage";
import { RtlEngine } from "@/lib/rtl-engine";
import { ForceRtl } from "@/lib/force-rtl";

export default defineContentScript({
  matches: ["<all_urls>"],
  allFrames: true,
  runAt: "document_idle",
  main() {
    const origin = location.origin;
    const engine = new RtlEngine();
    const force = new ForceRtl();

    const sync = (state: RtlState): void => {
      if (isActiveFor(state, origin)) engine.apply();
      else engine.teardown();
      if (isForceActiveFor(state, origin)) force.apply();
      else force.teardown();
    };

    void (async () => {
      sync(await getState());
    })();
    subscribe(sync);
  },
});

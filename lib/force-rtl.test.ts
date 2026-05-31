import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ForceRtl } from "./force-rtl";

let force: ForceRtl;

beforeEach(() => {
  document.documentElement.removeAttribute("dir");
  force = new ForceRtl();
});

afterEach(() => {
  force.teardown();
  document.documentElement.removeAttribute("dir");
});

describe("ForceRtl", () => {
  it("sets dir=rtl on the document element when applied", () => {
    force.apply();
    expect(document.documentElement.getAttribute("dir")).toBe("rtl");
  });

  it("removes a dir attribute it added on teardown", () => {
    force.apply();
    force.teardown();
    expect(document.documentElement.hasAttribute("dir")).toBe(false);
  });

  it("restores a pre-existing dir value on teardown", () => {
    document.documentElement.setAttribute("dir", "ltr");
    force.apply();
    expect(document.documentElement.getAttribute("dir")).toBe("rtl");
    force.teardown();
    expect(document.documentElement.getAttribute("dir")).toBe("ltr");
  });

  it("applies once even if apply is called twice", () => {
    document.documentElement.setAttribute("dir", "ltr");
    force.apply();
    force.apply();
    force.teardown();
    expect(document.documentElement.getAttribute("dir")).toBe("ltr");
  });

  it("is a no-op when torn down before being applied", () => {
    expect(() => force.teardown()).not.toThrow();
    expect(document.documentElement.hasAttribute("dir")).toBe(false);
  });
});

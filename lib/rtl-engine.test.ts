import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { RtlEngine } from "./rtl-engine";

const HE = "שלום עולם";
const AR = "مرحبا بالعالم";
const EN = "hello world 12345";

const frame = (): Promise<void> =>
  new Promise((resolve) => {
    requestAnimationFrame(() => resolve());
  });

const tick = (): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, 0);
  });

async function settle(): Promise<void> {
  for (let i = 0; i < 6; i += 1) {
    await Promise.resolve();
    await frame();
    await tick();
  }
}

function setBody(markup: string): void {
  document.body.innerHTML = markup;
}

function byId(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`missing #${id}`);
  return el;
}

let engine: RtlEngine;

beforeEach(() => {
  document.documentElement.removeAttribute("data-rtl-mode");
  document.documentElement.removeAttribute("dir");
  document.body.removeAttribute("dir");
  document.body.innerHTML = "";
  engine = new RtlEngine();
});

afterEach(() => {
  engine.teardown();
});

describe("apply: mode flag and block detection", () => {
  it("marks the document element when applied", async () => {
    engine.apply();
    await settle();
    expect(document.documentElement.getAttribute("data-rtl-mode")).toBe("on");
  });

  it("sets dir=rtl on a block containing Hebrew text", async () => {
    setBody(`<p id="t">${HE}</p>`);
    engine.apply();
    await settle();
    expect(byId("t").getAttribute("dir")).toBe("rtl");
  });

  it("sets dir=rtl on a block containing Arabic text", async () => {
    setBody(`<p id="t">${AR}</p>`);
    engine.apply();
    await settle();
    expect(byId("t").getAttribute("dir")).toBe("rtl");
  });

  it("leaves a Latin-only block untouched", async () => {
    setBody(`<p id="t">${EN}</p>`);
    engine.apply();
    await settle();
    expect(byId("t").hasAttribute("dir")).toBe(false);
  });

  it("walks up inline ancestors to the nearest block", async () => {
    setBody(
      `<div id="b"><span id="s" style="display:inline">${HE}</span></div>`,
    );
    engine.apply();
    await settle();
    expect(byId("b").getAttribute("dir")).toBe("rtl");
    expect(byId("s").hasAttribute("dir")).toBe(false);
  });

  it("marks an enclosing list when its item holds Hebrew", async () => {
    setBody(`<ul id="l"><li id="i">${HE}</li></ul>`);
    engine.apply();
    await settle();
    expect(byId("i").getAttribute("dir")).toBe("rtl");
    expect(byId("l").getAttribute("dir")).toBe("rtl");
  });

  it("keeps Latin siblings from inheriting an RTL list direction", async () => {
    setBody(`<ul id="l"><li id="he">${HE}</li><li id="en">${EN}</li></ul>`);
    engine.apply();
    await settle();
    expect(byId("he").getAttribute("dir")).toBe("rtl");
    expect(byId("en").getAttribute("dir")).toBe("auto");
    expect(byId("l").getAttribute("dir")).toBe("rtl");
  });

  it("leaves list items inside UI chrome untouched", async () => {
    setBody(
      `<nav><ul id="l"><li id="he">${HE}</li><li id="en">${EN}</li></ul></nav>`,
    );
    engine.apply();
    await settle();
    expect(byId("he").hasAttribute("dir")).toBe(false);
    expect(byId("en").hasAttribute("dir")).toBe(false);
    expect(byId("l").hasAttribute("dir")).toBe(false);
  });

  it("aligns a left-aligned Hebrew block to start", async () => {
    setBody(`<p id="t" style="text-align:left">${HE}</p>`);
    engine.apply();
    await settle();
    expect(byId("t").style.textAlign).toBe("start");
  });

  it("ignores text inside script and style elements", async () => {
    setBody(`<style id="s">${HE}</style><script id="j">${HE}</script>`);
    engine.apply();
    await settle();
    expect(byId("s").hasAttribute("dir")).toBe(false);
    expect(byId("j").hasAttribute("dir")).toBe(false);
  });
});

describe("fields and ui chrome", () => {
  it("sets dir=auto on text inputs and textareas", async () => {
    setBody(`<input id="i" type="text" /><textarea id="a"></textarea>`);
    engine.apply();
    await settle();
    expect(byId("i").getAttribute("dir")).toBe("auto");
    expect(byId("a").getAttribute("dir")).toBe("auto");
  });

  it("sets dir=auto on a contenteditable element", async () => {
    setBody(`<div id="e" contenteditable="true">x</div>`);
    engine.apply();
    await settle();
    expect(byId("e").getAttribute("dir")).toBe("auto");
  });

  it("keeps a Hebrew-filled field as auto rather than rtl", async () => {
    setBody(`<textarea id="a">${HE}</textarea>`);
    engine.apply();
    await settle();
    expect(byId("a").getAttribute("dir")).toBe("auto");
  });

  it("flips a text-only button containing Hebrew", async () => {
    setBody(
      `<button id="chip"><span></span><span style="display:inline">${HE}</span><span></span></button>`,
    );
    engine.apply();
    await settle();
    expect(byId("chip").getAttribute("dir")).toBe("rtl");
  });

  it("does not flip a multi-child control that contains Hebrew", async () => {
    setBody(`<nav id="n">${HE}<a href="#">a</a><a href="#">b</a></nav>`);
    engine.apply();
    await settle();
    expect(byId("n").hasAttribute("dir")).toBe(false);
  });
});

describe("teardown restores the page", () => {
  it("removes the mode flag", async () => {
    engine.apply();
    await settle();
    engine.teardown();
    expect(document.documentElement.hasAttribute("data-rtl-mode")).toBe(false);
  });

  it("restores a pre-existing dir value", async () => {
    setBody(`<p id="t" dir="ltr">${HE}</p>`);
    engine.apply();
    await settle();
    engine.teardown();
    expect(byId("t").getAttribute("dir")).toBe("ltr");
  });

  it("removes a dir attribute it added", async () => {
    setBody(`<p id="t">${HE}</p>`);
    engine.apply();
    await settle();
    engine.teardown();
    expect(byId("t").hasAttribute("dir")).toBe(false);
  });

  it("restores a pre-existing inline text-align", async () => {
    setBody(`<p id="t" style="text-align:left">${HE}</p>`);
    engine.apply();
    await settle();
    engine.teardown();
    expect(byId("t").style.textAlign).toBe("left");
  });

  it("leaves no rtlx bookkeeping attributes behind", async () => {
    setBody(`<p dir="ltr">${HE}</p><p style="text-align:left">${HE}</p>`);
    engine.apply();
    await settle();
    engine.teardown();
    expect(
      document.querySelectorAll("[data-rtlx-pd],[data-rtlx-pa]").length,
    ).toBe(0);
  });

  it("is a no-op when torn down before being applied", () => {
    expect(() => engine.teardown()).not.toThrow();
    expect(document.documentElement.hasAttribute("data-rtl-mode")).toBe(false);
  });
});

describe("dynamic content", () => {
  it("flips Hebrew added to the DOM after apply", async () => {
    setBody(`<div id="root"></div>`);
    engine.apply();
    await settle();
    const p = document.createElement("p");
    p.id = "added";
    p.textContent = HE;
    byId("root").appendChild(p);
    await settle();
    expect(byId("added").getAttribute("dir")).toBe("rtl");
  });

  it("flips a block when its text changes to Hebrew", async () => {
    setBody(`<p id="t">${EN}</p>`);
    engine.apply();
    await settle();
    const text = byId("t").firstChild;
    if (text) text.nodeValue = HE;
    await settle();
    expect(byId("t").getAttribute("dir")).toBe("rtl");
  });
});

describe("shadow dom", () => {
  it("flips Hebrew inside an open shadow root", async () => {
    setBody(`<div id="host"></div>`);
    const shadow = byId("host").attachShadow({ mode: "open" });
    shadow.innerHTML = `<p id="s">${HE}</p>`;
    engine.apply();
    await settle();
    expect(shadow.querySelector("#s")?.getAttribute("dir")).toBe("rtl");
  });

  it("restores shadow root elements on teardown", async () => {
    setBody(`<div id="host"></div>`);
    const shadow = byId("host").attachShadow({ mode: "open" });
    shadow.innerHTML = `<p id="s">${HE}</p>`;
    engine.apply();
    await settle();
    engine.teardown();
    expect(shadow.querySelector("#s")?.hasAttribute("dir")).toBe(false);
  });
});

describe("lifecycle", () => {
  it("applies once even if apply is called twice", async () => {
    setBody(`<p id="t">${HE}</p>`);
    engine.apply();
    engine.apply();
    await settle();
    expect(byId("t").getAttribute("dir")).toBe("rtl");
    expect(document.documentElement.getAttribute("data-rtl-mode")).toBe("on");
  });

  it("reapplies cleanly after a teardown", async () => {
    setBody(`<p id="t">${HE}</p>`);
    engine.apply();
    await settle();
    engine.teardown();
    expect(byId("t").hasAttribute("dir")).toBe(false);
    engine.apply();
    await settle();
    expect(byId("t").getAttribute("dir")).toBe("rtl");
  });
});

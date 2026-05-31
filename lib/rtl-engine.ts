const RTL_CHARS = /[\u0590-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF]/u;
const PREV_DIR_ATTR = "data-rtlx-pd";
const PREV_ALIGN_ATTR = "data-rtlx-pa";
const MODE_ATTR = "data-rtl-mode";

const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE"]);
const FIELD_SELECTOR =
  'textarea, input:not([type]), input[type="text"], input[type="search"], input[type="email"], input[type="url"], input[type="tel"], [contenteditable]:not([contenteditable="false"])';
const REORDERABLE_CONTROL_SELECTOR = 'button, [role="button"]';
const STRUCTURAL_UI_CHROME_SELECTOR =
  'select, option, summary, nav, [role="tab"], [role="menu"], [role="menubar"], [role="menuitem"], [role="toolbar"], [role="navigation"], [aria-haspopup]';
const UI_CHROME_SELECTOR = `${REORDERABLE_CONTROL_SELECTOR}, ${STRUCTURAL_UI_CHROME_SELECTOR}`;
const ORDERED_CONTROL_CHILD_SELECTOR =
  'svg, img, canvas, picture, video, [role="img"], [aria-label], [aria-labelledby]';

const FRAME_BUDGET_MS = 16;
const WRITE_BATCH = 50;

type ScanRoot = Document | ShadowRoot | Element;
type ObservedRoot = Document | ShadowRoot;

interface YieldingScheduler {
  yield(): Promise<void>;
}

function hasYield(value: unknown): value is YieldingScheduler {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { yield?: unknown }).yield === "function"
  );
}

async function yieldToMain(): Promise<void> {
  const scheduler = (globalThis as { scheduler?: unknown }).scheduler;
  if (hasYield(scheduler)) {
    await scheduler.yield();
    return;
  }
  await new Promise<void>((resolve) => {
    setTimeout(resolve, 0);
  });
}

function nextFrame(): Promise<void> {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}

function isSkippedText(parent: Element): boolean {
  const chrome = parent.closest(UI_CHROME_SELECTOR);
  return (
    SKIP_TAGS.has(parent.tagName) ||
    parent.closest(FIELD_SELECTOR) !== null ||
    (chrome !== null && wouldReorderControl(chrome))
  );
}

function affectsControlOrder(node: ChildNode): boolean {
  if (node.nodeType === Node.TEXT_NODE)
    return (node.nodeValue ?? "").trim() !== "";
  if (node.nodeType !== Node.ELEMENT_NODE) return false;
  const el = node as Element;
  return (
    (el.textContent ?? "").trim() !== "" ||
    el.matches(ORDERED_CONTROL_CHILD_SELECTOR) ||
    el.querySelector(ORDERED_CONTROL_CHILD_SELECTOR) !== null
  );
}

function wouldReorderControl(el: Element): boolean {
  if (!el.matches(UI_CHROME_SELECTOR)) return false;
  if (el.matches(STRUCTURAL_UI_CHROME_SELECTOR)) return true;
  let orderedChildren = 0;
  for (const child of el.childNodes) {
    if (affectsControlOrder(child)) orderedChildren += 1;
    if (orderedChildren > 1) return true;
  }
  return false;
}

function blockAncestor(el: Element): Element {
  let cur = el;
  while (
    cur.parentElement &&
    cur.parentElement !== document.body &&
    cur.parentElement !== document.documentElement &&
    getComputedStyle(cur).display === "inline"
  ) {
    cur = cur.parentElement;
  }
  return cur;
}

function hasRtlText(el: Element): boolean {
  return RTL_CHARS.test(el.textContent ?? "");
}

function isList(el: Element): boolean {
  return el.tagName === "UL" || el.tagName === "OL";
}

function setDir(el: Element, dir: "rtl" | "auto"): void {
  if (!(el instanceof HTMLElement)) return;
  if (!el.hasAttribute(PREV_DIR_ATTR))
    el.setAttribute(PREV_DIR_ATTR, el.getAttribute("dir") ?? "");
  el.setAttribute("dir", dir);
}

function setAutoDirIfInherited(el: Element): void {
  if (!(el instanceof HTMLElement)) return;
  if (!el.hasAttribute(PREV_DIR_ATTR) && el.hasAttribute("dir")) return;
  setDir(el, "auto");
}

function markNeutralListItem(el: Element): void {
  if (
    el.tagName === "LI" &&
    el.parentElement &&
    isList(el.parentElement) &&
    el.parentElement.hasAttribute(PREV_DIR_ATTR) &&
    !hasRtlText(el)
  ) {
    setAutoDirIfInherited(el);
  }
}

function markNeutralListItems(list: Element): void {
  for (const item of list.children) markNeutralListItem(item);
}

function alignToStart(el: Element): void {
  if (!(el instanceof HTMLElement) || el.hasAttribute(PREV_ALIGN_ATTR)) return;
  if (getComputedStyle(el).textAlign !== "left") return;
  el.setAttribute(PREV_ALIGN_ATTR, el.style.textAlign);
  el.style.textAlign = "start";
}

function restoreDir(el: Element): void {
  const prev = el.getAttribute(PREV_DIR_ATTR);
  if (prev) el.setAttribute("dir", prev);
  else el.removeAttribute("dir");
  el.removeAttribute(PREV_DIR_ATTR);
}

function restoreAlign(el: Element): void {
  if (el instanceof HTMLElement)
    el.style.textAlign = el.getAttribute(PREV_ALIGN_ATTR) ?? "";
  el.removeAttribute(PREV_ALIGN_ATTR);
}

export class RtlEngine {
  private applied = false;
  private version = 0;
  private flushing = false;
  private flushHandle = 0;
  private readonly pending = new Set<Node>();
  private readonly observers = new Map<ObservedRoot, MutationObserver>();
  private readonly roots = new Set<ObservedRoot>();

  apply(): void {
    if (this.applied) return;
    this.applied = true;
    const version = ++this.version;
    document.documentElement.setAttribute(MODE_ATTR, "on");
    this.observe(document);
    void this.scan(document, version);
  }

  teardown(): void {
    if (!this.applied) return;
    this.applied = false;
    this.version += 1;
    for (const observer of this.observers.values()) observer.disconnect();
    this.observers.clear();
    this.pending.clear();
    if (this.flushHandle !== 0) {
      cancelAnimationFrame(this.flushHandle);
      this.flushHandle = 0;
    }
    document.documentElement.removeAttribute(MODE_ATTR);
    for (const root of this.roots) {
      root.querySelectorAll(`[${PREV_DIR_ATTR}]`).forEach(restoreDir);
      root.querySelectorAll(`[${PREV_ALIGN_ATTR}]`).forEach(restoreAlign);
    }
    this.roots.clear();
  }

  private canContinue(version: number): boolean {
    return this.applied && version === this.version;
  }

  private observe(root: ObservedRoot): void {
    if (this.observers.has(root)) return;
    this.roots.add(root);
    const target = root instanceof Document ? root.documentElement : root;
    const observer = new MutationObserver((records) =>
      this.onMutations(records),
    );
    observer.observe(target, {
      childList: true,
      characterData: true,
      subtree: true,
    });
    this.observers.set(root, observer);
  }

  private onMutations(records: MutationRecord[]): void {
    for (const record of records) {
      if (record.type === "characterData") this.pending.add(record.target);
      else record.addedNodes.forEach((node) => this.pending.add(node));
    }
    this.schedule();
  }

  private schedule(): void {
    if (this.flushHandle === 0) {
      this.flushHandle = requestAnimationFrame(() => void this.flush());
    }
  }

  private async flush(): Promise<void> {
    this.flushHandle = 0;
    if (this.flushing) return;
    this.flushing = true;
    const version = this.version;
    try {
      while (this.pending.size > 0 && this.canContinue(version)) {
        const batch = [...this.pending];
        this.pending.clear();
        for (const node of batch) {
          if (!this.canContinue(version)) return;
          await this.processNode(node, version);
        }
      }
    } finally {
      this.flushing = false;
      if (this.pending.size > 0 && this.canContinue(version)) this.schedule();
    }
  }

  private async processNode(node: Node, version: number): Promise<void> {
    if (node.nodeType === Node.TEXT_NODE) {
      const parent = node.parentElement;
      if (
        parent &&
        node.nodeValue &&
        RTL_CHARS.test(node.nodeValue) &&
        !isSkippedText(parent)
      ) {
        this.markBlock(blockAncestor(parent));
      }
      return;
    }
    if (node.nodeType === Node.ELEMENT_NODE && node.isConnected) {
      await this.scan(node as Element, version);
    }
  }

  private async scan(root: ScanRoot, version: number): Promise<void> {
    const blocks = new Set<Element>();
    const shadowRoots: ShadowRoot[] = [];
    const startNode =
      root instanceof Document ? (root.body ?? root.documentElement) : root;

    const stack: Node[] = [];
    if (startNode instanceof Element) stack.push(startNode);
    else for (const child of startNode.childNodes) stack.push(child);

    let deadline = performance.now() + FRAME_BUDGET_MS;
    while (stack.length > 0) {
      if (!this.canContinue(version)) return;
      const node = stack.pop();
      if (!node) continue;

      if (node.nodeType === Node.TEXT_NODE) {
        const parent = node.parentElement;
        if (
          parent &&
          node.nodeValue &&
          RTL_CHARS.test(node.nodeValue) &&
          !isSkippedText(parent)
        ) {
          blocks.add(blockAncestor(parent));
        }
        continue;
      }
      if (node.nodeType !== Node.ELEMENT_NODE) continue;

      const el = node as Element;
      markNeutralListItem(el);
      if (SKIP_TAGS.has(el.tagName)) continue;
      if (el.shadowRoot) shadowRoots.push(el.shadowRoot);
      for (const child of el.childNodes) stack.push(child);

      if (performance.now() >= deadline) {
        await yieldToMain();
        if (!this.canContinue(version)) return;
        deadline = performance.now() + FRAME_BUDGET_MS;
      }
    }

    let writes = 0;
    for (const block of blocks) {
      if (!this.canContinue(version)) return;
      this.markBlock(block);
      if (++writes % WRITE_BATCH === 0) {
        await nextFrame();
        if (!this.canContinue(version)) return;
      }
    }

    this.markFields(root, version);

    for (const shadow of shadowRoots) {
      if (!this.canContinue(version)) return;
      this.observe(shadow);
      await this.scan(shadow, version);
    }
  }

  private markFields(root: ScanRoot, version: number): void {
    if (root instanceof Element && root.matches(FIELD_SELECTOR))
      setDir(root, "auto");
    for (const field of root.querySelectorAll(FIELD_SELECTOR)) {
      if (!this.canContinue(version)) return;
      setDir(field, "auto");
    }
  }

  private markBlock(block: Element): void {
    if (wouldReorderControl(block)) return;
    setDir(block, "rtl");
    alignToStart(block);
    let list = block.closest("ul, ol");
    while (list) {
      if (!wouldReorderControl(list)) {
        setDir(list, "rtl");
        markNeutralListItems(list);
      }
      list = list.parentElement?.closest("ul, ol") ?? null;
    }
  }
}

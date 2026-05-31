export class ForceRtl {
  private applied = false;
  private previousDir: string | null = null;

  apply(): void {
    if (this.applied) return;
    this.applied = true;
    const html = document.documentElement;
    this.previousDir = html.getAttribute("dir");
    html.setAttribute("dir", "rtl");
  }

  teardown(): void {
    if (!this.applied) return;
    this.applied = false;
    const html = document.documentElement;
    if (this.previousDir === null) html.removeAttribute("dir");
    else html.setAttribute("dir", this.previousDir);
    this.previousDir = null;
  }
}

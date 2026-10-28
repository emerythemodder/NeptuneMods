import DOMPurify from "dompurify";
import { Marked, type Token } from "marked";

// Project descriptions come from third parties, so everything goes through DOMPurify.
DOMPurify.addHook("afterSanitizeAttributes", (node) => {
  if (node.tagName === "A") {
    node.setAttribute("target", "_blank");
    node.setAttribute("rel", "noopener noreferrer");
  }
  if (node.tagName === "IMG") node.setAttribute("loading", "lazy");
});

export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, { FORBID_TAGS: ["style", "form", "input", "button"], FORBID_ATTR: ["style"] });
}

/** Where a README lives, so its relative links and images can be resolved. */
export interface GitHubBase {
  repo: string;
  branch: string;
}

const ABSOLUTE = /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i;

function resolver(base: GitHubBase) {
  const clean = (p: string) => p.replace(/^\.?\//, "");
  return {
    image: (p: string) => (ABSOLUTE.test(p) ? p : `https://raw.githubusercontent.com/${base.repo}/${base.branch}/${clean(p)}`),
    link: (p: string) => (ABSOLUTE.test(p) ? p : `https://github.com/${base.repo}/blob/${base.branch}/${clean(p)}`),
  };
}

export function renderMarkdown(md: string, base?: GitHubBase): string {
  const r = base && resolver(base);
  const marked = new Marked({
    gfm: true,
    walkTokens: r
      ? (t: Token) => {
          if (t.type === "image") t.href = r.image(t.href);
          if (t.type === "link") t.href = r.link(t.href);
        }
      : undefined,
  });
  const clean = sanitizeHtml(marked.parse(md, { async: false }));
  if (!r) return clean;

  // READMEs often use raw <img> tags too.
  const tpl = document.createElement("template");
  tpl.innerHTML = clean;
  tpl.content.querySelectorAll("img[src]").forEach((img) => img.setAttribute("src", r.image(img.getAttribute("src")!)));
  tpl.content.querySelectorAll("a[href]").forEach((a) => a.setAttribute("href", r.link(a.getAttribute("href")!)));
  return tpl.innerHTML;
}

/**
 * Browser helpers. Nothing here touches the DOM at import time, so the module
 * is safe to import in Node and on the server.
 */

/**
 * Inject the sprite into the document so that fragment references
 * (`<use href="#icon-001">`) resolve. Returns a function that removes it again.
 */
export function mountSprite(sprite, options = {}) {
  const doc = options.document ?? globalThis.document;
  if (!doc || !doc.body) throw new Error("mountSprite() needs a document with a <body>");
  const host = doc.createElement("div");
  host.setAttribute("data-generative-icons-sprite", "");
  host.style.cssText = "position:absolute;width:0;height:0;overflow:hidden";
  host.innerHTML = sprite;
  doc.body.append(host);
  return () => host.remove();
}

/**
 * Object URL for the sprite — handy for `<img src>`, CSS masks or a download
 * link. Remember to `URL.revokeObjectURL()` when you are done.
 */
export function spriteBlobUrl(sprite) {
  return URL.createObjectURL(new Blob([sprite], { type: "image/svg+xml" }));
}

/** Standalone markup for one icon, referencing a mounted sprite. */
export function iconMarkup(id, options = {}) {
  const { size = 64, label } = options;
  const a11y = label ? ` role="img" aria-label="${label}"` : ' aria-hidden="true"';
  return `<svg width="${size}" height="${size}" viewBox="0 0 64 64"${a11y}><use href="#${id}"/></svg>`;
}

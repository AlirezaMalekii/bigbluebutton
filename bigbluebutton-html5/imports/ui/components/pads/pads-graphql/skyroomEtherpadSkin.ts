/**
 * Runtime skin for the same-origin Etherpad iframe used by SafeMeet shared notes.
 * Injects skyroom/etherpad.css into the pad document and nested ACE frames, and
 * patches mobile-hostile Etherpad defaults (export _blank pages, native tooltips).
 */

const STYLE_ID = 'skyroom-etherpad-styles';
const TOOLTIP_ID = 'skyroom-etherpad-tooltip';
const EXPORT_FRAME_ID = 'skyroom-export-frame';
const SKIN_FLAG = 'data-skyroom-etherpad-skin';

const resolveEtherpadStylesheetHref = (): string | null => {
  const skyroomSheet = Array.from(document.styleSheets)
    .find((s) => s.href && s.href.includes('/stylesheets/skyroom/'));
  return skyroomSheet?.href
    ? skyroomSheet.href.replace(/[^/]+$/, 'etherpad.css')
    : null;
};

const injectStylesheet = (targetDoc: Document, href: string): void => {
  if (targetDoc.getElementById(STYLE_ID)) return;
  const link = targetDoc.createElement('link');
  link.id = STYLE_ID;
  link.rel = 'stylesheet';
  link.href = href;
  targetDoc.head?.appendChild(link);
};

const injectIntoAceFrames = (padDoc: Document, href: string): boolean => {
  const outer = padDoc.querySelector('iframe[name="ace_outer"]') as HTMLIFrameElement | null;
  const outerDoc = outer?.contentDocument;
  if (!outerDoc?.head) return false;

  injectStylesheet(outerDoc, href);

  const inner = outerDoc.querySelector('iframe[name="ace_inner"]') as HTMLIFrameElement | null;
  const innerDoc = inner?.contentDocument;
  if (!innerDoc?.head) return false;

  injectStylesheet(innerDoc, href);
  return true;
};

const revealToolbarItems = (doc: Document): void => {
  doc.querySelectorAll('.toolbar ul li, #editbar ul li').forEach((item) => {
    const el = item as HTMLElement;
    el.classList.remove('hidden', 'hide');
    el.style.removeProperty('display');
    el.style.removeProperty('visibility');
  });

  doc.querySelectorAll('.show-more-icon-btn, #showMoreIcon, .showMoreButton').forEach((btn) => {
    const el = btn as HTMLElement;
    el.style.display = 'none';
  });

  const popup = doc.querySelector('#toolbar-popup, .toolbar-popup, #editbarPopup');
  if (popup) {
    popup.querySelectorAll('li').forEach((item) => {
      const el = item as HTMLElement;
      const list = doc.querySelector('.toolbar .menu_left > ul, #editbar .menu_left > ul');
      if (list && !list.contains(el)) {
        list.appendChild(el);
      }
      el.classList.remove('hidden', 'hide');
      el.style.removeProperty('display');
    });
    (popup as HTMLElement).style.display = 'none';
  }
};

const ensureExportFrame = (doc: Document): HTMLIFrameElement => {
  let frame = doc.getElementById(EXPORT_FRAME_ID) as HTMLIFrameElement | null;
  if (!frame) {
    frame = doc.createElement('iframe');
    frame.id = EXPORT_FRAME_ID;
    frame.setAttribute('aria-hidden', 'true');
    frame.setAttribute('tabindex', '-1');
    doc.body.appendChild(frame);
  }
  return frame;
};

const patchExportLinks = (doc: Document): void => {
  doc.querySelectorAll('a.exportlink').forEach((node) => {
    const anchor = node as HTMLAnchorElement;
    anchor.removeAttribute('target');
    anchor.setAttribute('rel', 'noopener');
  });
};

const filenameFromExportHref = (href: string): string => {
  const type = href.split('/export/')[1]?.split(/[?#]/)[0] || 'export';
  const map: Record<string, string> = {
    html: 'notes.html',
    txt: 'notes.txt',
    etherpad: 'notes.etherpad',
    doc: 'notes.doc',
    pdf: 'notes.pdf',
    odt: 'notes.odt',
  };
  return map[type] || `notes.${type}`;
};

const downloadExport = async (doc: Document, href: string): Promise<void> => {
  try {
    const response = await fetch(href, { credentials: 'same-origin' });
    if (!response.ok) throw new Error(`export failed: ${response.status}`);
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const temp = doc.createElement('a');
    temp.href = objectUrl;
    temp.download = filenameFromExportHref(href);
    temp.style.display = 'none';
    doc.body.appendChild(temp);
    temp.click();
    temp.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  } catch (err) {
    // Fallback: load in a hidden iframe so the pad view never navigates away.
    ensureExportFrame(doc).src = href;
  }
};

const installExportClickGuard = (doc: Document): void => {
  if (doc.documentElement.getAttribute(`${SKIN_FLAG}-export`) === '1') return;
  doc.documentElement.setAttribute(`${SKIN_FLAG}-export`, '1');

  doc.addEventListener('click', (event) => {
    const target = event.target as Element | null;
    const anchor = target?.closest?.('a.exportlink') as HTMLAnchorElement | null;
    if (!anchor?.href) return;

    // Keep the pad iframe on the editor; never open a full-screen blank export page.
    event.preventDefault();
    event.stopPropagation();
    downloadExport(doc, anchor.href).catch(() => undefined);
  }, true);
};

const installToolbarTooltips = (doc: Document): void => {
  if (doc.documentElement.getAttribute(`${SKIN_FLAG}-tooltip`) === '1') return;
  doc.documentElement.setAttribute(`${SKIN_FLAG}-tooltip`, '1');

  let tip = doc.getElementById(TOOLTIP_ID) as HTMLDivElement | null;
  if (!tip) {
    tip = doc.createElement('div');
    tip.id = TOOLTIP_ID;
    tip.setAttribute('role', 'tooltip');
    doc.body.appendChild(tip);
  }

  const hide = () => {
    tip?.classList.remove('is-visible');
  };

  const showFor = (el: HTMLElement) => {
    const view = doc.defaultView;
    const text = el.getAttribute('data-skyroom-title') || el.getAttribute('title');
    if (!text || !tip || !view) return;

    if (el.hasAttribute('title')) {
      el.setAttribute('data-skyroom-title', text);
      el.removeAttribute('title');
    }

    tip.textContent = text;
    tip.classList.add('is-visible');

    const rect = el.getBoundingClientRect();
    const tipRect = tip.getBoundingClientRect();
    const pad = 8;
    let left = rect.left + (rect.width / 2) - (tipRect.width / 2);
    left = Math.max(pad, Math.min(left, view.innerWidth - tipRect.width - pad));
    let top = rect.bottom + 8;
    if (top + tipRect.height > view.innerHeight - pad) {
      top = Math.max(pad, rect.top - tipRect.height - 8);
    }
    tip.style.left = `${left}px`;
    tip.style.top = `${top}px`;
  };

  const findTitled = (eventTarget: EventTarget | null): HTMLElement | null => {
    const el = eventTarget as Element | null;
    return el?.closest?.(
      '.toolbar [title], #editbar [title], .toolbar [data-skyroom-title], #editbar [data-skyroom-title]',
    ) as HTMLElement | null;
  };

  doc.addEventListener('mouseover', (event) => {
    const el = findTitled(event.target);
    if (el) showFor(el);
  });

  doc.addEventListener('mouseout', (event) => {
    const el = findTitled(event.target);
    const related = event.relatedTarget as Node | null;
    if (el && (!related || !el.contains(related))) hide();
  });

  doc.addEventListener('focusin', (event) => {
    const el = findTitled(event.target);
    if (el) showFor(el);
  });

  doc.addEventListener('focusout', hide);
  doc.addEventListener('scroll', hide, true);
  doc.defaultView?.addEventListener('blur', hide);
};

const installTimesliderLinkGuard = (doc: Document): void => {
  if (doc.documentElement.getAttribute(`${SKIN_FLAG}-timeslider`) === '1') return;
  doc.documentElement.setAttribute(`${SKIN_FLAG}-timeslider`, '1');

  // Timeslider is not useful inside the BBB notes panel; keep users on the editor.
  doc.addEventListener('click', (event) => {
    const target = event.target as Element | null;
    const anchor = target?.closest?.('a[href*="timeslider"]') as HTMLAnchorElement | null;
    if (!anchor) return;
    event.preventDefault();
    event.stopPropagation();
  }, true);
};

const applySkyroomEtherpadSkin = (padDoc: Document): void => {
  const href = resolveEtherpadStylesheetHref();
  if (!href) return;

  injectStylesheet(padDoc, href);
  revealToolbarItems(padDoc);
  installExportClickGuard(padDoc);
  installToolbarTooltips(padDoc);
  installTimesliderLinkGuard(padDoc);
  patchExportLinks(padDoc);

  let tries = 0;
  const maxTries = 40;
  const sync = () => {
    tries += 1;
    revealToolbarItems(padDoc);
    patchExportLinks(padDoc);
    const aceReady = injectIntoAceFrames(padDoc, href);
    if (!aceReady && tries < maxTries) {
      window.setTimeout(sync, tries < 8 ? 200 : 500);
    }
  };

  sync();
  window.setTimeout(sync, 250);
  window.setTimeout(sync, 1000);

  // ACE frames are created asynchronously after pad load.
  const observer = new MutationObserver(() => {
    injectIntoAceFrames(padDoc, href);
    patchExportLinks(padDoc);
  });
  observer.observe(padDoc.body || padDoc.documentElement, {
    childList: true,
    subtree: true,
  });
  window.setTimeout(() => observer.disconnect(), 15000);
};

export default applySkyroomEtherpadSkin;

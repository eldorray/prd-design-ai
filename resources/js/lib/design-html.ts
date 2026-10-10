import type { DesignKind } from '@/types';

/**
 * Messages saved per canvas (about 20 versions). The save request accepts 60,
 * and each version is a whole HTML document.
 */
export const MAX_SAVED_MESSAGES = 40;

export function deriveTitle(prompt: string, kind: DesignKind) {
    const clean = prompt.replace(/\s+/g, ' ').trim();

    if (clean) {
        return clean.slice(0, 80);
    }

    if (kind === 'dashboard') {
        return 'Dashboard tanpa judul';
    }

    if (kind === 'mobile-app') {
        return 'Mobile app tanpa judul';
    }

    return 'Landing tanpa judul';
}

export function cleanHtml(rawHtml: string): string {
    let cleaned = rawHtml.trim();

    if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```[a-zA-Z]*\s*/, '');
    }

    if (cleaned.endsWith('```')) {
        cleaned = cleaned.replace(/\s*```$/, '');
    }

    // Strip any leaked chain-of-thought the model may have emitted.
    cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/gi, '');

    // Hard-cut anything that still precedes the document so the canvas never
    // shows preamble text from a reasoning-style model.
    const doctypeIdx = cleaned.toLowerCase().indexOf('<!doctype');

    if (doctypeIdx >= 0) {
        // Also taken at index 0: falling through to the `<html` cut dropped
        // the DOCTYPE and put the preview in quirks mode.
        cleaned = cleaned.slice(doctypeIdx);
    } else {
        const htmlIdx = cleaned.toLowerCase().indexOf('<html');

        if (htmlIdx > 0) {
            cleaned = cleaned.slice(htmlIdx);
        }
    }

    return cleaned.trim();
}

/**
 * Remove the injected editor bridge from a document. Older saved designs can
 * already carry one (or several) copies; injecting another on top would stack
 * duplicate click handlers inside the preview.
 */
export function stripEditBridge(rawHtml: string): string {
    return rawHtml.replace(
        /<script\b[^>]*data-design-edit-bridge[^>]*>[\s\S]*?<\/script>/gi,
        '',
    );
}

export const EDIT_BRIDGE = `<script data-design-edit-bridge>(function(){
  var editable = false;
  var selectedEl = null;

  function clearOutline(el){ if(el){ el.style.removeProperty('outline'); el.style.removeProperty('outline-offset'); } }

  function setEditable(on){
    editable = on;
    if(!on){
      clearOutline(selectedEl);
      selectedEl = null;
    }
    document.body.style.cursor = on ? 'default' : '';
  }

  function describe(el){
    var cs = getComputedStyle(el);
    var hasText = el.children.length === 0 && el.textContent.trim().length > 0;
    return {
      tag: el.tagName.toLowerCase(),
      text: hasText ? el.textContent : null,
      color: rgbToHex(cs.color),
      backgroundColor: rgbToHex(cs.backgroundColor),
      fontSize: Math.round(parseFloat(cs.fontSize)) || 16,
      fontWeight: parseInt(cs.fontWeight, 10) || 400,
      textAlign: ['left','center','right'].indexOf(cs.textAlign) >= 0 ? cs.textAlign : 'left'
    };
  }

  function rgbToHex(rgb){
    var m = rgb && rgb.match(/\\d+/g);
    if(!m || m.length < 3) return '#000000';
    return '#' + m.slice(0,3).map(function(n){
      var h = parseInt(n,10).toString(16);
      return h.length === 1 ? '0'+h : h;
    }).join('');
  }

  document.addEventListener('click', function(e){
    if(!editable) {
      var link = e.target.closest('a');
      if(link){
        var href = link.getAttribute('href') || '';
        var isAnchor = href.indexOf('#') === 0;

        if (isAnchor) {
          if (href === '#' || href === '#/') {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
          } else {
            try {
              var targetEl = document.querySelector(href);
              if (targetEl) {
                e.preventDefault();
                targetEl.scrollIntoView({ behavior: 'smooth' });
              } else {
                e.preventDefault();
                var text = link.textContent.trim() || link.innerText.trim() || 'Tautan';
                parent.postMessage({ type: 'link-clicked', href: href, text: text }, '*');
              }
            } catch(err) {
              e.preventDefault();
              var text = link.textContent.trim() || link.innerText.trim() || 'Tautan';
              parent.postMessage({ type: 'link-clicked', href: href, text: text }, '*');
            }
          }
        } else {
          e.preventDefault();
          e.stopPropagation();
          var text = link.textContent.trim() || link.innerText.trim() || 'Tautan';
          parent.postMessage({ type: 'link-clicked', href: href, text: text }, '*');
        }
      }
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    var el = e.target;
    if(!el || el === document.body || el === document.documentElement) return;
    clearOutline(selectedEl);
    selectedEl = el;
    el.style.setProperty('outline', '2px solid rgba(99,102,241,0.9)');
    el.style.setProperty('outline-offset', '1px');
    parent.postMessage({ type: 'element-selected', payload: describe(el) }, '*');
  }, true);

  document.addEventListener('submit', function(e){
    e.preventDefault();
    parent.postMessage({ type: 'form-submitted' }, '*');
  }, true);

  window.addEventListener('message', function(e){
    if(!e.data || typeof e.data !== 'object') return;
    var t = e.data.type;
    if(t === 'set-edit'){ setEditable(!!e.data.value); }
    else if(t === 'set-theme'){
      var isDark = e.data.value === 'dark' || e.data.value === true;
      document.documentElement.classList.toggle('dark', isDark);
      document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
    }
    else if(t === 'update-selected' && selectedEl){
      var p = e.data.payload || {};
      if(p.text !== undefined && p.text !== null) selectedEl.textContent = p.text;
      if(p.color !== undefined) selectedEl.style.color = p.color;
      if(p.backgroundColor !== undefined) selectedEl.style.backgroundColor = p.backgroundColor;
      if(p.fontSize !== undefined) selectedEl.style.fontSize = p.fontSize + 'px';
      if(p.fontWeight !== undefined) selectedEl.style.fontWeight = p.fontWeight;
      if(p.textAlign !== undefined) selectedEl.style.textAlign = p.textAlign;
    }
    else if(t === 'request-html'){
      var wasEditable = editable;
      clearOutline(selectedEl);
      var sel = selectedEl;
      // Never hand the injected editor script back to the parent: saved/exported
      // documents must stay free of it, otherwise it accumulates on every save
      // and blocks links/forms when the exported file is opened raw.
      var clone = document.documentElement.cloneNode(true);
      var bridgeScripts = clone.querySelectorAll('script[data-design-edit-bridge]');
      for(var i = 0; i < bridgeScripts.length; i++){ bridgeScripts[i].parentNode.removeChild(bridgeScripts[i]); }
      var doc = '<!doctype html>\\n' + clone.outerHTML;
      parent.postMessage({ type: 'html-result', html: doc }, '*');
      if(wasEditable && sel){
        sel.style.setProperty('outline', '2px solid rgba(99,102,241,0.9)');
        sel.style.setProperty('outline-offset', '1px');
      }
    }
  });

  parent.postMessage({ type: 'iframe-ready' }, '*');
})();</script>`;

function escapeHtml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function highlightTag(tag: string): string {
    const isCloseTag = tag.startsWith('</');
    const isDoctype = tag.toUpperCase().startsWith('<!DOCTYPE');

    if (isDoctype) {
        return `<span class="text-sky-400 font-semibold">${escapeHtml(tag)}</span>`;
    }

    if (isCloseTag) {
        const tagName = tag.substring(2, tag.length - 1);

        return `<span class="text-pink-500">&lt;/</span><span class="text-pink-500 font-semibold">${escapeHtml(tagName)}</span><span class="text-pink-500">&gt;</span>`;
    }

    const match = tag.match(/^<([a-zA-Z0-9:-]+)([\s\S]*?)(\/?>)$/);

    if (!match) {
        return escapeHtml(tag);
    }

    const tagName = match[1];
    const attributesPart = match[2];
    const closure = match[3];

    const highlightedAttributes = attributesPart.replace(
        /([a-zA-Z0-9:-]+)(=(?:(["'])([\s\S]*?)\3|([^\s>]+)))?/g,
        (m, name, equalsAndValue, quote, quotedVal, unquotedVal) => {
            let res = `<span class="text-amber-400">${name}</span>`;

            if (equalsAndValue) {
                res += '=';
                const val = quote
                    ? `${quote}${quotedVal}${quote}`
                    : unquotedVal;
                res += `<span class="text-emerald-400">${escapeHtml(val)}</span>`;
            }

            return res;
        },
    );

    return `<span class="text-pink-500">&lt;</span><span class="text-pink-500 font-semibold">${tagName}</span>${highlightedAttributes}<span class="text-pink-500">${closure}</span>`;
}

export function highlightHtml(code: string): string {
    if (!code) {
        return '';
    }

    const parts = code.split(/(<!--[\s\S]*?-->|<[^>]+>)/g);

    return parts
        .map((part) => {
            if (part.startsWith('<!--') && part.endsWith('-->')) {
                return `<span class="text-neutral-500 italic">${escapeHtml(part)}</span>`;
            } else if (part.startsWith('<') && part.endsWith('>')) {
                return highlightTag(part);
            } else {
                return escapeHtml(part);
            }
        })
        .join('');
}

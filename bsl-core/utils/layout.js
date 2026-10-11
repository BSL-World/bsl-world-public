// Product-neutral DOM measurements. Measure a copy outside the visible layout:
// the live window must not collapse while its natural size is being obtained.
export function measureNaturalSize(element, { width = element.getBoundingClientRect().width } = {}) {
  const copy = element.cloneNode(true);
  copy.setAttribute('aria-hidden', 'true');
  copy.inert = true;
  Object.assign(copy.style, {
    position: 'fixed', left: '-100000px', top: '0', visibility: 'hidden',
    pointerEvents: 'none', width: `${width}px`, height: 'auto',
    minHeight: '0', maxHeight: 'none', margin: '0', flex: 'none',
    transition: 'none', transform: 'none'
  });
  element.parentElement.append(copy);
  try {
    const rect = copy.getBoundingClientRect();
    let requiredWidth = Math.max(rect.width, copy.scrollWidth);
    const visit = (parent, ancestorInsets) => {
      const style = getComputedStyle(parent);
      const insets = ancestorInsets + parseFloat(style.paddingLeft)
        + parseFloat(style.paddingRight) + parseFloat(style.borderLeftWidth)
        + parseFloat(style.borderRightWidth);
      for (const child of parent.children) {
        if (!child.getClientRects().length) continue;
        const childStyle = getComputedStyle(child);
        const margin = parseFloat(childStyle.marginLeft) + parseFloat(childStyle.marginRight);
        const visibleOverflow = childStyle.overflowX === 'visible';
        const childWidth = Math.max(child.getBoundingClientRect().width,
          visibleOverflow ? child.scrollWidth : 0);
        // Include every containing field/card's padding, borders and margins.
        // Negative footer margins intentionally cancel an enclosing padding.
        requiredWidth = Math.max(requiredWidth, childWidth + insets + margin);
        if (visibleOverflow) visit(child, insets + margin);
      }
    };
    if (getComputedStyle(copy).overflowX === 'visible') visit(copy, 0);
    return { width: Math.ceil(requiredWidth),
      height: Math.ceil(Math.max(rect.height, copy.scrollHeight)) };
  } finally {
    copy.remove();
  }
}

export function applyActionButtonWidth(labels, reference, document_ = globalThis.document) {
  if (!reference || !document_) return;
  const style = getComputedStyle(reference);
  const probe = document_.createElement('span');
  Object.assign(probe.style, {
    position: 'fixed', left: '-100000px', whiteSpace: 'nowrap',
    visibility: 'hidden', font: style.font, letterSpacing: style.letterSpacing
  });
  document_.body.append(probe);
  try {
    // Multiword utility captions may wrap at a space. Never split a word or
    // shrink the font to fit the common action-button width.
    let width = 0;
    for (const word of labels.flatMap(label => label.split(/\s+/))) {
      probe.textContent = word;
      width = Math.max(width, probe.getBoundingClientRect().width);
    }
    width += parseFloat(style.paddingLeft) + parseFloat(style.paddingRight)
      + parseFloat(style.borderLeftWidth) + parseFloat(style.borderRightWidth);
    document_.documentElement.style.setProperty('--ui-action-button-width', `${Math.ceil(width)}px`);
  } finally {
    probe.remove();
  }
}

// Native inner sizes are physical pixels. CSS pixels can differ even after
// dividing by the monitor DPI (for example, when WebView2 uses a text zoom).
export function cssSizeToPhysical(size, physicalPerCssPixel) {
  return {
    width: Math.ceil(size.width * physicalPerCssPixel),
    height: Math.ceil(size.height * physicalPerCssPixel)
  };
}

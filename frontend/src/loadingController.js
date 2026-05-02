/**
 * Drives the static #loading-overlay element in index.html.
 * Used by the Run Pipeline button to show fake step progress while
 * the backend pipeline runs.
 */

export function showLoading(contextText, steps) {
  const overlay = document.getElementById('loading-overlay');
  const stepsEl = document.getElementById('loading-steps');
  const ctxEl = document.getElementById('loading-context');
  if (!overlay || !stepsEl || !ctxEl) return { advance() {}, finish() {} };

  ctxEl.textContent = contextText;
  overlay.classList.remove('hidden');
  stepsEl.innerHTML = '';

  const stepEls = steps.map((text, i) => {
    const el = document.createElement('div');
    el.className = 'loading-step';
    el.style.animationDelay = `${i * 100}ms`;
    el.innerHTML = `<div class="step-indicator"><div class="step-pending"></div></div><div class="step-text">${escapeHtml(text)}</div>`;
    stepsEl.appendChild(el);
    return el;
  });

  let cur = 0;
  let timer = null;

  function tickToNext() {
    if (cur > 0) {
      stepEls[cur - 1].classList.remove('active');
      stepEls[cur - 1].classList.add('done');
      const ind = stepEls[cur - 1].querySelector('.step-indicator');
      if (ind) ind.innerHTML = '<span class="step-check">✓</span>';
    }
    if (cur < stepEls.length) {
      stepEls[cur].classList.add('active');
      const ind = stepEls[cur].querySelector('.step-indicator');
      if (ind) ind.innerHTML = '<div class="step-spinner"></div>';
      cur++;
    }
  }

  function autoAdvance() {
    if (cur < stepEls.length - 1) {
      tickToNext();
      timer = setTimeout(autoAdvance, 600 + Math.random() * 500);
    }
  }

  setTimeout(() => {
    tickToNext();
    timer = setTimeout(autoAdvance, 600 + Math.random() * 500);
  }, 200);

  return {
    advance() {
      tickToNext();
    },
    finish() {
      if (timer) clearTimeout(timer);
      while (cur < stepEls.length) tickToNext();
      setTimeout(() => overlay.classList.add('hidden'), 350);
    },
    cancel() {
      if (timer) clearTimeout(timer);
      overlay.classList.add('hidden');
    },
  };
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

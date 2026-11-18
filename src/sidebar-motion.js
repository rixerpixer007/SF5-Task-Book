// A short, nearly settled spring feel. Pixel artwork only translates; it never
// stretches. A generation token prevents an interrupted close from hiding a reopen.
export function createSidebarMotion(
  panel,
  reducedMotion = matchMedia('(prefers-reduced-motion: reduce)'),
) {
  let animation = null;
  let generation = 0;
  let visible = !panel.hidden;
  function setVisible(open, { animate = true } = {}) {
    visible = open;
    const token = ++generation;
    const wasHidden = panel.hidden;
    const style = getComputedStyle(panel);
    const from = { opacity: style.opacity, transform: style.transform };
    animation?.cancel();
    animation = null;
    panel.inert = !open;
    panel.setAttribute('aria-hidden', String(!open));
    if (
      !animate ||
      reducedMotion.matches ||
      !panel.animate ||
      (wasHidden && !open)
    ) {
      panel.hidden = !open;
      return;
    }
    panel.hidden = false;
    animation = panel.animate(
      [
        wasHidden ? { opacity: 0, transform: 'translateX(-18px)' } : from,
        open
          ? { opacity: 1, transform: 'translateX(0)' }
          : { opacity: 0, transform: 'translateX(-12px)' },
      ],
      {
        duration: open ? 250 : 160,
        easing: open
          ? 'cubic-bezier(0.2, 1.12, 0.36, 1)'
          : 'cubic-bezier(0.4, 0, 1, 1)',
      },
    );
    animation.finished
      .then(() => {
        if (generation !== token) return;
        panel.hidden = !open;
        animation = null;
      })
      .catch(() => {
        /* Interrupted by a newer toggle or a reduced-motion change. */
      });
  }
  reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches) setVisible(visible, { animate: false });
  });
  return { setVisible };
}

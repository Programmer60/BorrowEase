// Utility to ensure the page scroll is not locked by lingering styles/classes
export function ensureScrollUnlocked() {
  try {
    const html = document.documentElement;
    const body = document.body;

    if (!html || !body) return;

    // Remove inline overflow styles
    if (html.style.overflow === 'hidden') html.style.overflow = '';
    if (body.style.overflow === 'hidden') body.style.overflow = '';

    // Remove common scroll-lock classes that libraries may add
    const classes = [
      'overflow-hidden',
      'no-scroll',
      'modal-open',
      'lock-scroll',
      'disable-scroll',
      'razorpay-stop-scrolling',
    ];
    classes.forEach((cls) => {
      html.classList.remove(cls);
      body.classList.remove(cls);
    });

    // As a safeguard, remove any Razorpay overlays if they were left behind
    const rogueIframes = document.querySelectorAll('iframe.rzp-checkout-frame, iframe.razorpay-checkout-frame');
    rogueIframes.forEach((el) => el.parentElement && el.parentElement.removeChild(el));

    const razorpayContainers = document.querySelectorAll('.razorpay-container');
    razorpayContainers.forEach((el) => el.parentElement && el.parentElement.removeChild(el));
  } catch (_) {
    // no-op: best effort cleanup only
  }
}

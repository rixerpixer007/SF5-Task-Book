import bookTexture from './assets/checklist/book.png';
import frameTexture from './assets/minecraft/book_back.png';
import dirtTexture from './assets/minecraft/dirt.png';

const status = document.getElementById('startup-status');
const retry = document.getElementById('startup-retry');
retry.addEventListener('click', () => window.location.reload());

// Offer a way out on a stalled connection without imposing a minimum load time.
const slowLoad = window.setTimeout(() => {
  status.textContent = 'Still opening… Check your connection or try again.';
  retry.hidden = false;
}, 10000);

async function prepareTexture(src) {
  const image = new Image();
  image.src = src;
  // A missing decorative image should not prevent reading the book.
  await image.decode().catch(() => {});
}

try {
  await Promise.all([
    import('./main.js'),
    ...[bookTexture, frameTexture, dirtTexture].map(prepareTexture),
  ]);
  document.body.removeAttribute('data-loading');
  document.getElementById('startup').hidden = true;
  document.body.classList.add('motion-ready');
} catch (error) {
  status.textContent = 'The book couldn’t open. Please try again.';
  retry.hidden = false;
  console.error('Task book startup failed:', error);
} finally {
  window.clearTimeout(slowLoad);
}

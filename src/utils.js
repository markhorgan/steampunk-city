export function loadJsFile(url) {
  const scriptEl = document.createElement('script');
  scriptEl.setAttribute('src', url);
  scriptEl.setAttribute('type', 'text/javascript');
  document.body.appendChild(scriptEl);

  return new Promise((resolve, reject) => {
    scriptEl.addEventListener('load', () => {
      resolve();
    });

    scriptEl.addEventListener('error', () => {
      reject(new Error(`Unable to load JS file: ${url}`));
    });
  });
};
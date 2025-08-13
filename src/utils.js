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

let _isIos;
export function isIos() {
  if (_isIos == null) {
    _isIos = [
      'iPad Simulator',
      'iPhone Simulator',
      'iPod Simulator',
      'iPad',
      'iPhone',
      'iPod'
    ].includes(navigator.platform)
    // iPad on iOS 13 detection. User Agent contains Intel Mac rather than iPad
    || (navigator.userAgent.includes('Mac') && 'ontouchend' in document);
  }
  return _isIos;
}
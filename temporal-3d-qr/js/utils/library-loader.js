/**
 * LIBRARY LOADER - Ensures QR libraries load with CDN fallback
 * Add this before other scripts that depend on QR libraries
 */

(function() {
  'use strict';

  // Check if QRCode library loaded
  function checkQRCode() {
    return typeof QRCode !== 'undefined';
  }

  // Check if jsQR library loaded
  function checkJsQR() {
    return typeof jsQR !== 'undefined';
  }

  // Load script from CDN
  function loadFromCDN(url, callback) {
    const script = document.createElement('script');
    script.src = url;
    script.onload = callback;
    script.onerror = function() {
      console.error('Failed to load from CDN:', url);
    };
    document.head.appendChild(script);
  }

  // Verify libraries after page load
  window.addEventListener('load', function() {
    // Check QRCode library
    if (!checkQRCode()) {
      console.warn('QRCode library not loaded, loading from CDN...');
      loadFromCDN('https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js', function() {
        console.log('✓ QRCode loaded from CDN');
      });
    } else {
      console.log('✓ QRCode library loaded');
    }

    // Check jsQR library
    if (!checkJsQR()) {
      console.warn('jsQR library not loaded, loading from CDN...');
      loadFromCDN('https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js', function() {
        console.log('✓ jsQR loaded from CDN');
      });
    } else {
      console.log('✓ jsQR library loaded');
    }
  });
})();

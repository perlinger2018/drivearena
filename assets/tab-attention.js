/**
 * Tab attention: cycling title + favicon when the user leaves the tab.
 * Configure per page: window.DA_TAB_ATTENTION = { titles: ['…', '…'] };
 */
(function () {
  if (typeof document === 'undefined') return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var cfg = window.DA_TAB_ATTENTION || {};
  var baseTitle = document.title;
  var titles = cfg.titles || [
    '👋 Komm zurück!',
    'Noch da?',
    'DRIVE ARENA …',
    'Q3 2026 · Frankfurt am Main'
  ];
  var favicons = cfg.favicons || [
    'assets/favicon.svg',
    'assets/favicon-alt.svg'
  ];

  var titleIdx = 0;
  var faviconIdx = 0;
  var titleTimer = null;
  var faviconTimer = null;

  function faviconLink() {
    var link = document.querySelector('link[rel="icon"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      link.type = 'image/svg+xml';
      document.head.appendChild(link);
    }
    return link;
  }

  function setFavicon(index) {
    var link = faviconLink();
    var href = favicons[index % favicons.length];
    link.href = href + (href.indexOf('?') >= 0 ? '&' : '?') + 'v=' + (index % favicons.length);
  }

  function startAttention() {
    if (titleTimer) return;
    titleTimer = window.setInterval(function () {
      document.title = titles[titleIdx % titles.length];
      titleIdx += 1;
    }, 1100);
    faviconTimer = window.setInterval(function () {
      setFavicon(faviconIdx);
      faviconIdx += 1;
    }, 550);
  }

  function stopAttention() {
    if (titleTimer) {
      window.clearInterval(titleTimer);
      titleTimer = null;
    }
    if (faviconTimer) {
      window.clearInterval(faviconTimer);
      faviconTimer = null;
    }
    titleIdx = 0;
    faviconIdx = 0;
    document.title = baseTitle;
    setFavicon(0);
  }

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      startAttention();
    } else {
      stopAttention();
    }
  });

  setFavicon(0);

  window.DA_TAB_ATTENTION_API = {
    setBaseTitle: function (t) {
      baseTitle = t;
      if (!document.hidden) document.title = baseTitle;
    }
  };
})();

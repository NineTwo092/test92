(() => {
  'use strict';
  // CSS acompanha a navegação SPA sem polling nem observadores do DOM.
  const site = location.hostname === 'music.youtube.com' ? 'music' : 'youtube';
  const style = document.createElement('style');
  style.textContent = 'ytd-ad-slot-renderer,ytd-display-ad-renderer,ytd-promoted-sparkles-web-renderer,ytd-promoted-video-renderer,ytd-in-feed-ad-layout-renderer,ytd-banner-promo-renderer,ytmusic-display-ad-renderer { display: none !important; }';
  let revision = 0;
  function apply(enabled) {
    if (enabled) {
      const root = document.head || document.documentElement;
      if (root && !style.isConnected) root.appendChild(style);
    } else style.remove();
  }
  chrome.storage.onChanged.addListener((changes, area)=>{
    if (area==='local' && Object.hasOwn(changes,site)) {
      revision++;
      apply(changes[site].newValue!==false);
    }
  });
  const initialRevision = revision;
  chrome.storage.local.get({[site]:true}).then(state=>{
    if(initialRevision===revision) apply(state[site]!==false);
  }).catch(()=>apply(false));
})();

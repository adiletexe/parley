// Fills every <div class="iphone" data-shot="path.png"> with the device markup iphone.css draws.
// Set size and crop on the element itself: style="--s:1.1; --shift:70".
(function () {
  const STATUS =
    '<div class="iphone__status"><span class="iphone__time">9:41</span><span class="iphone__icons">' +
    // cellular
    '<svg width="19" height="12" viewBox="0 0 19 12"><rect x="0" y="7.5" width="3.2" height="4.5" rx="1"/><rect x="5" y="5" width="3.2" height="7" rx="1"/><rect x="10" y="2.5" width="3.2" height="9.5" rx="1"/><rect x="15" y="0" width="3.2" height="12" rx="1"/></svg>' +
    // wi-fi
    '<svg width="17" height="12" viewBox="0 0 17 12"><path d="M8.5 2.3c2.4 0 4.6.9 6.3 2.5.1.1.3.1.4 0l1.2-1.2c.1-.1.1-.3 0-.4C14.3 1.2 11.5 0 8.5 0S2.7 1.2.6 3.2c-.1.1-.1.3 0 .4l1.2 1.2c.1.1.3.1.4 0C3.9 3.2 6.1 2.3 8.5 2.3zm0 3.8c1.3 0 2.6.5 3.6 1.4.1.1.3.1.4 0l1.2-1.2c.1-.1.1-.3 0-.4-1.4-1.3-3.2-2-5.2-2s-3.8.7-5.2 2c-.1.1-.1.3 0 .4l1.2 1.2c.1.1.3.1.4 0 1-.9 2.3-1.4 3.6-1.4zm2.3 2.6c.1-.1.1-.3 0-.4-.6-.6-1.4-.9-2.3-.9s-1.7.3-2.3.9c-.1.1-.1.3 0 .4l2.1 2.1c.1.1.3.1.4 0l2.1-2.1z"/></svg>' +
    // battery
    '<svg width="27" height="13" viewBox="0 0 27 13"><rect x=".5" y=".5" width="23" height="12" rx="3.8" fill="none" stroke="currentColor" stroke-opacity=".38"/><rect x="2" y="2" width="20" height="9" rx="2.5"/><path d="M25 4.5v4c.8-.3 1.4-1.1 1.4-2s-.6-1.7-1.4-2z" fill-opacity=".4"/></svg>' +
    '</span></div>';
  for (const el of document.querySelectorAll('.iphone[data-shot]')) {
    const src = el.dataset.shot;
    el.innerHTML =
      '<div class="iphone__body">' +
      '<i class="iphone__btn iphone__btn--action"></i><i class="iphone__btn iphone__btn--volup"></i>' +
      '<i class="iphone__btn iphone__btn--voldn"></i><i class="iphone__btn iphone__btn--power"></i>' +
      '<div class="iphone__frame"></div><div class="iphone__bezel"></div>' +
      '<div class="iphone__screen">' +
      `<img class="iphone__content" src="${src}" alt="">` +
      `<div class="iphone__tabbar"><img src="${src}" alt=""></div>` +
      STATUS +
      '<div class="iphone__island"></div><div class="iphone__home"></div><div class="iphone__glare"></div>' +
      '</div></div>';
  }
})();

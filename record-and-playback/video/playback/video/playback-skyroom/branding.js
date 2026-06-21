/** Shared Skyroom / SafeMeet branding for legacy playback players. */
(function (root) {
  var SKYROOM_PRODUCT_NAME = 'سیف میت';
  var SKYROOM_PRODUCT_NAME_EN = 'SafeMeet';
  var SKYROOM_PLATFORM_URL = 'https://safemeet.ir';

  root.SKYROOM_PLAYBACK_BRANDING = {
    productName: SKYROOM_PRODUCT_NAME,
    productNameEn: SKYROOM_PRODUCT_NAME_EN,
    platformUrl: SKYROOM_PLATFORM_URL,
    footerHtml: 'ضبط‌شده با <a href="' + SKYROOM_PLATFORM_URL + '">' + SKYROOM_PRODUCT_NAME + '</a>',
    defaultTitle: SKYROOM_PRODUCT_NAME + ' — پخش ضبط جلسه',
  };
}(typeof window !== 'undefined' ? window : this));

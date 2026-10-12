/* Покровский двор — корзина, поиск и меню.
   Сервера у сайта нет: корзина живёт в браузере покупателя, а заказ уходит
   готовым текстом в WhatsApp. Поэтому ни регистрации, ни оплаты на сайте нет —
   и врать про них на кнопках нельзя. */
(function () {
  'use strict';

  var КЛЮЧ = 'korzina-pokrovsky-dvor';
  var ТОВАРЫ = window.ТОВАРЫ || [];
  var ФЕРМА = window.ФЕРМА || {};

  function поТоварам(код) {
    for (var i = 0; i < ТОВАРЫ.length; i++) if (ТОВАРЫ[i]['код'] === код) return ТОВАРЫ[i];
    return null;
  }

  /* ---------- хранилище ----------
     localStorage может бросить исключение (режим инкогнито, запрет на данные
     сайтов), поэтому читаем и пишем только через try. Корзина — вещь приятная,
     но сайт обязан работать и без неё. */
  function прочитать() {
    try {
      var сырое = localStorage.getItem(КЛЮЧ);
      return сырое ? JSON.parse(сырое) : {};
    } catch (e) { return {}; }
  }
  function записать(корзина) {
    try { localStorage.setItem(КЛЮЧ, JSON.stringify(корзина)); } catch (e) { /* переживём */ }
    обновитьСчёт();
  }

  function округлить(ч) { return Math.round(ч * 10) / 10; }

  function количествоТекст(т, сколько) {
    if (т['единица'] === 'кг') {
      return сколько < 1 ? Math.round(сколько * 1000) + ' г' : округлить(сколько) + ' кг';
    }
    if (т['единица'] === 'десяток') return сколько + (сколько === 1 ? ' десяток' : ' десятка');
    if (т['единица'] === 'литр') return сколько + (сколько === 1 ? ' литр' : ' л');
    return сколько + ' шт';
  }

  function обновитьСчёт() {
    var корзина = прочитать();
    var всего = 0;
    for (var к in корзина) if (корзина[к] > 0) всего++;
    var значки = document.querySelectorAll('[data-schet-korziny]');
    for (var i = 0; i < значки.length; i++) {
      значки[i].textContent = всего;
      значки[i].hidden = всего === 0;
    }
  }

  /* ---------- кнопки «В корзину» ---------- */
  function повеситьКнопки() {
    var кнопки = document.querySelectorAll('[data-v-korzinu]');
    for (var i = 0; i < кнопки.length; i++) {
      (function (кнопка) {
        кнопка.addEventListener('click', function () {
          var код = кнопка.getAttribute('data-v-korzinu');
          var т = поТоварам(код);
          if (!т) return;
          var корзина = прочитать();
          корзина[код] = округлить((корзина[код] || 0) + (корзина[код] ? т['шаг'] : т['минимум']));
          записать(корзина);
          var было = кнопка.textContent;
          кнопка.textContent = 'В корзине ✓';
          кнопка.classList.add('knopka--dobavleno');
          setTimeout(function () {
            кнопка.textContent = было;
            кнопка.classList.remove('knopka--dobavleno');
          }, 1400);
        });
      })(кнопки[i]);
    }
  }

  /* ---------- страница корзины ---------- */
  function нарисоватьКорзину() {
    var тело = document.getElementById('korzina-telo');
    if (!тело) return;

    var корзина = прочитать();
    var коды = [];
    for (var к in корзина) if (корзина[к] > 0 && поТоварам(к)) коды.push(к);

    if (!коды.length) {
      тело.innerHTML =
        '<p class="pusto">Корзина пока пустая.</p>' +
        '<p><a class="knopka" href="syry.html">Перейти к сырам</a></p>';
      return;
    }

    var строки = '', итог = 0, есть_без_цены = false;
    for (var i = 0; i < коды.length; i++) {
      var т = поТоварам(коды[i]);
      var сколько = корзина[коды[i]];
      var сумма = т['цена'] === null ? null : Math.round(т['цена'] * сколько);
      if (сумма === null) есть_без_цены = true; else итог += сумма;

      строки +=
        '<div class="stroka-korziny">' +
          '<img src="img/' + т['картинка'] + '" alt="' + т['имя'] + '">' +
          '<div>' +
            '<a class="stroka-korziny__imya" href="tovar-' + т['код'] + '.html">' + т['имя'] + '</a>' +
            '<div class="stroka-korziny__pod">' +
              (т['цена'] === null ? 'цену уточним при заказе' : т['цена'] + ' ₽ / ' + т['единица']) +
            '</div>' +
          '</div>' +
          '<div class="schetchik">' +
            '<button type="button" data-menshe="' + т['код'] + '" aria-label="Меньше">−</button>' +
            '<span>' + количествоТекст(т, сколько) + '</span>' +
            '<button type="button" data-bolshe="' + т['код'] + '" aria-label="Больше">+</button>' +
          '</div>' +
          '<button class="ubrat" type="button" data-ubrat="' + т['код'] + '" aria-label="Убрать">×</button>' +
        '</div>';
    }

    var мало = итог > 0 && итог < ФЕРМА['минзаказ'];
    var замечание = '';
    if (есть_без_цены) {
      замечание += '<div class="zamechanie">На часть позиций цена пока не указана — ' +
        'посчитаем её при подтверждении заказа и напишем вам сумму.</div>';
    }
    if (мало) {
      замечание += '<div class="zamechanie">Минимальный заказ — ' + ФЕРМА['минзаказ'] +
        ' ₽. Сейчас набрано ' + итог + ' ₽, не хватает ' + (ФЕРМА['минзаказ'] - итог) + ' ₽.</div>';
    }

    тело.innerHTML =
      строки +
      '<div class="itogo"><span>Итого' + (есть_без_цены ? ' (без уточняемых позиций)' : '') +
        '</span><b>' + итог + ' ₽</b></div>' +
      замечание +
      '<a class="knopka knopka--bolshaya" id="oformit" href="#">Отправить заказ в WhatsApp</a> ' +
      '<a class="knopka svetlaya" href="index.html">Добавить ещё</a>' +
      '<p class="stroka-korziny__pod" style="margin-top:22px">Оплата при получении — наличными ' +
      'или переводом. Ничего платить на сайте не нужно.</p>';

    var ссылка = document.getElementById('oformit');
    if (ссылка) ссылка.setAttribute('href', ссылкаЗаказа(коды, корзина, итог, есть_без_цены));

    повеситьСчётчики();
  }

  function ссылкаЗаказа(коды, корзина, итог, есть_без_цены) {
    var строки = ['Здравствуйте! Хочу заказать на ферме «' + ФЕРМА['имя'] + '»:', ''];
    for (var i = 0; i < коды.length; i++) {
      var т = поТоварам(коды[i]);
      var сколько = корзина[коды[i]];
      строки.push('— ' + т['имя'] + ', ' + количествоТекст(т, сколько) +
        (т['цена'] === null ? ' (цену уточните)' : ' — ' + Math.round(т['цена'] * сколько) + ' ₽'));
    }
    строки.push('');
    строки.push('Итого' + (есть_без_цены ? ' по указанным позициям' : '') + ': ' + итог + ' ₽');
    строки.push('');
    строки.push('Подскажите, пожалуйста, когда сможете привезти.');
    return 'https://wa.me/' + ФЕРМА['whatsapp'] + '?text=' + encodeURIComponent(строки.join('\n'));
  }

  function повеситьСчётчики() {
    document.querySelectorAll('[data-bolshe]').forEach(function (к) {
      к.addEventListener('click', function () { сдвинуть(к.getAttribute('data-bolshe'), +1); });
    });
    document.querySelectorAll('[data-menshe]').forEach(function (к) {
      к.addEventListener('click', function () { сдвинуть(к.getAttribute('data-menshe'), -1); });
    });
    document.querySelectorAll('[data-ubrat]').forEach(function (к) {
      к.addEventListener('click', function () {
        var корзина = прочитать();
        delete корзина[к.getAttribute('data-ubrat')];
        записать(корзина);
        нарисоватьКорзину();
      });
    });
  }

  function сдвинуть(код, куда) {
    var т = поТоварам(код);
    if (!т) return;
    var корзина = прочитать();
    var новое = округлить((корзина[код] || 0) + куда * т['шаг']);
    if (новое < т['минимум']) {
      if (куда < 0) delete корзина[код]; else новое = т['минимум'];
    }
    if (корзина[код] !== undefined || новое >= т['минимум']) {
      if (новое >= т['минимум']) корзина[код] = новое;
    }
    записать(корзина);
    нарисоватьКорзину();
  }

  /* ---------- поиск ---------- */
  function нарисоватьПоиск() {
    var тело = document.getElementById('poisk-telo');
    if (!тело) return;

    var запрос = '';
    try {
      запрос = (new URLSearchParams(window.location.search).get('q') || '').trim();
    } catch (e) { запрос = ''; }

    var поле = document.querySelector('.poisk__pole');
    if (поле && запрос) поле.value = запрос;

    var заголовок = document.getElementById('poisk-zagolovok');
    if (!запрос) {
      if (заголовок) заголовок.textContent = 'Поиск';
      тело.innerHTML = '<p class="pusto">Напишите, что ищете, в строке поиска наверху.</p>';
      return;
    }

    var низ = запрос.toLowerCase();
    var нашлось = ТОВАРЫ.filter(function (т) {
      return (т['имя'] + ' ' + т['коротко']).toLowerCase().indexOf(низ) >= 0;
    });

    if (заголовок) заголовок.textContent = 'Поиск: «' + запрос + '»';
    if (!нашлось.length) {
      тело.className = '';
      тело.innerHTML = '<p class="pusto">По запросу «' + запрос + '» ничего не нашлось. ' +
        'Напишите нам — подскажем, что сейчас есть на дворе.</p>';
      return;
    }

    тело.className = 'karty';
    тело.innerHTML = нашлось.map(function (т) {
      return '<article class="karta">' +
        '<a class="karta__foto" href="tovar-' + т['код'] + '.html">' +
          '<img src="img/' + т['картинка'] + '" alt="' + т['имя'] + '" loading="lazy"></a>' +
        '<div class="karta__telo">' +
          '<h3><a href="tovar-' + т['код'] + '.html">' + т['имя'] + '</a></h3>' +
          '<p class="karta__opis">' + т['коротко'] + '</p>' +
          '<div class="karta__niz">' +
            (т['цена'] === null
              ? '<span class="cena cena--pusto">цену уточняйте</span>'
              : '<span class="cena">' + т['цена'] + ' ₽ <small>/ ' + т['единица'] + '</small></span>') +
          '</div>' +
          '<button class="knopka knopka--v-korzinu" type="button" data-v-korzinu="' + т['код'] + '">В корзину</button>' +
        '</div></article>';
    }).join('');

    повеситьКнопки();
  }

  /* ---------- меню на телефоне и год в подвале ---------- */
  function прочее() {
    var бургер = document.getElementById('burger');
    var меню = document.querySelector('.verhnee');
    if (бургер && меню) {
      бургер.addEventListener('click', function () {
        var открыто = меню.classList.toggle('otkryto');
        бургер.setAttribute('aria-expanded', открыто ? 'true' : 'false');
      });
    }
    var год = document.getElementById('god');
    if (год) год.textContent = new Date().getFullYear();
  }

  document.addEventListener('DOMContentLoaded', function () {
    прочее();
    обновитьСчёт();
    повеситьКнопки();
    нарисоватьКорзину();
    нарисоватьПоиск();
  });
})();

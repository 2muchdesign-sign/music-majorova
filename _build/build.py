#!/usr/bin/env python3
"""Сборка статического сайта: _build/pages/*.html + общий шаблон -> ../*.html
Запуск: python3 _build/build.py  (из папки music-majorova)"""
import json, os, re, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
PAGES = ROOT / '_build' / 'pages'
SITE_URL = ''  # укажите адрес сайта после публикации, напр. https://example.github.io/music/

NAV = [
    ('index.html', 'Главная'),
    ('vizitka.html', 'Визитка'),
    ('o-rabote.html', 'О работе'),
    ('prazdniki.html', 'Праздники'),
    ('foto.html', 'Фото и среда'),
    ('kollegam.html', 'Коллегам'),
    ('roditelyam.html', 'Родителям'),
    ('kontakty.html', 'Контакты'),
]

STAFF = ('<svg class="staff-rule" viewBox="0 0 1000 26" preserveAspectRatio="none" aria-hidden="true" focusable="false">'
         + ''.join(f'<line x1="0" y1="{y}" x2="1000" y2="{y}"/>' for y in (1, 7, 13, 19, 25)) + '</svg>')

FONTS = ('https://fonts.googleapis.com/css2?family=Caveat:wght@600;700&family=Manrope:wght@400;500;600;700'
         '&family=Unbounded:wght@500;600;700&display=swap')
MUSIC_FONT = ('https://fonts.googleapis.com/css2?family=Noto+Music'
              '&text=%F0%9D%84%9E%E2%99%AA%E2%99%AB%E2%99%A9%E2%99%AC&display=swap')

LAYOUT = """<!doctype html>
<html lang="ru" data-effects="full">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<meta name="description" content="{desc}">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{desc}">
<meta property="og:type" content="website">
<meta property="og:image" content="img/{og}">
<meta name="theme-color" content="#FFF9F0">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Ccircle cx='32' cy='32' r='32' fill='%23E4503B'/%3E%3Cellipse cx='26' cy='43' rx='9' ry='7' fill='%23fff' transform='rotate(-22 26 43)'/%3E%3Crect x='33' y='14' width='4' height='30' rx='2' fill='%23fff'/%3E%3Cpath d='M35 14c6 2 11 6 10 13-2-4-6-6-10-6z' fill='%23fff'/%3E%3C/svg%3E">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="{fonts}">
<link rel="stylesheet" href="{music_font}">
<link rel="stylesheet" href="assets/style.css">
{head_extra}
</head>
<body>
<a class="skip" href="#main">К содержанию</a>
<header class="site-header">
  <div class="wrap header-row">
    <a class="logo" href="index.html" aria-label="На главную: дошкольное музыкальное воспитание">
      <span class="logo-clef" aria-hidden="true">𝄞</span>
      <span class="logo-text">Дошкольное<br>музыкальное воспитание<small>О.А. Майорова</small></span>
    </a>
    <nav class="main-nav" aria-label="Основное меню"><ul>
{nav}
    </ul></nav>
    <button class="sound-toggle" type="button" aria-pressed="false" hidden title="Звук клавиш при наведении"><span class="ic" aria-hidden="true">♪</span><span class="lbl">Звук</span></button>
  </div>
</header>
<main id="main">
{body}
</main>
<footer class="site-footer">
  <div class="wrap">
    <div class="footer-grid">
      <div>
        <a class="logo" href="index.html"><span class="logo-clef" aria-hidden="true">𝄞</span><span class="logo-text">Майорова Ольга Алексеевна<small>Музыкальный руководитель МДОУ детский сад №105 «Чебурашка», г.о. Люберцы</small></span></a>
        <p class="muted" style="margin-top:16px;max-width:42ch">«Даже при плохой погоде, когда поют дети, хоть на минутку непременно выглянет солнце». — Г.А. Струве</p>
      </div>
      <div>
        <h3>Разделы</h3>
        <ul>
{footer_nav}
        </ul>
      </div>
      <div>
        <h3>Связаться</h3>
        <ul>
          <li><a href="tel:+79852999837">+7 (985) 299-98-37</a></li>
          <li><a href="mailto:detkigou@gmail.com">detkigou@gmail.com</a></li>
          <li><a href="https://t.me/doshkolnikmuz" rel="noopener">Telegram-канал doshkolnikmuz</a></li>
          <li><a href="https://detsad-105.edumsko.ru/" rel="noopener">Детский сад №105 г.о. Люберцы</a></li>
          <li><a href="https://www.maam.ru/users/cyruck" rel="noopener">Международный образовательный портал</a></li>
          <li><a href="https://infourok.ru/user/majorova-olga-alekseevna" rel="noopener">Инфоурок</a></li>
        </ul>
      </div>
    </div>
    <div class="footer-bottom">
      <span>© Майорова О.А. Музыкальное воспитание дошкольников</span>
      <span>Сделано с любовью к музыке ♪</span>
    </div>
  </div>
</footer>
<script src="assets/app.js" defer></script>
</body>
</html>
"""


def build():
    for src in sorted(PAGES.glob('*.html')):
        raw = src.read_text(encoding='utf-8')
        m = re.match(r'<!--(\{.*?\})-->\s*', raw, re.S)
        meta = json.loads(m.group(1))
        body = raw[m.end():].replace('{{STAFF}}', STAFF)
        out = src.name
        cur = ' aria-current="page"'
        nav = '\n'.join(
            f'      <li><a href="{h}"{cur if h == out else ""}>{t}</a></li>' for h, t in NAV)
        footer_nav = '\n'.join(f'          <li><a href="{h}">{t}</a></li>' for h, t in NAV)
        html = LAYOUT.format(title=meta['title'], desc=meta['desc'], og=meta.get('og', 'portrait.jpg'),
                             fonts=FONTS, music_font=MUSIC_FONT, head_extra=meta.get('head', ''),
                             nav=nav, footer_nav=footer_nav, body=body)
        (ROOT / out).write_text(html, encoding='utf-8')
        print('built', out)


if __name__ == '__main__':
    build()

# Font

`archivo-var-latin.full.woff2` is Archivo (variable, Latin) by Omnibus-Type, SIL Open Font License 1.1.

`archivo-app.woff2` is what the build inlines. It is the same font cut down to what the app uses, which takes it
from 90 KB to 46 KB:

```
pyftsubset archivo-var-latin.full.woff2 \
  --unicodes="U+0020-007E,U+00A0-00FF,U+2013,U+2014,U+2018,U+2019,U+201C,U+201D,U+2026,U+2212,U+2032,U+2192,U+2022" \
  --layout-features="kern,tnum,pnum,lnum,case" --flavor=woff2 --no-hinting --desubroutinize \
  --output-file=archivo-sub.woff2
fonttools varLib.instancer archivo-sub.woff2 wght=400:800 wdth=100:125 -o archivo-app.woff2
```

(`pip install fonttools brotli`.) The app uses weights 400 to 800 and widths 100% to 122% only. Any character
outside the subset (Greek letters, for example) falls back to the system font.

# textures/ — yer, suv, tog', osmon teksturalari

Format: `.png`, `.jpg`, `.jpeg`, `.webp`. Nomi aniq (kengaytma erkin). **Tileable (bir-biriga ulanadigan)** bo'lsin. Fayl bo'lmasa — oddiy rang ishlatiladi.

| Fayl | Nima | Eslatma |
|---|---|---|
| `ground/grass` | o't | vodiy, sohil, tog' etagi |
| `ground/dirt` | tuproq | yo'l yoni, dalalar |
| `ground/sand` | qum | plyaj, qirg'oq |
| `ground/redsand` | qizil qum (cho'l) | Redrock Mesa |
| `mountain/rock` | tog' jinsi | tik yonbag'ir va baland joylar |
| `mountain/snow` | qor | 240 m dan yuqori |
| `water/water` | suv | daryo va dengiz, animatsiya bilan suriladi |
| `sky/clouds` | bulutlar | kulrang (R kanal ishlatiladi), tileable |
| `sky/stars` | yulduzlar | qora fonda oq nuqtalar; tunda ko'rinadi |
| `signs/atlas` | yo'l belgilari atlasi | 1024×1024, quyida |

Relyef 6 qatlamni (o't, tosh, qor, qum, qizil qum, tuproq) hudud/balandlik/qiyalikka qarab aralashtiradi va vertex rang bilan yengil bo'yaydi.

## signs/atlas.png tuzilishi
- Yuqori yarmi: 8×4 katak, har biri 128×128. 0–10 = tezlik 30…130; 11/12 = burilish chap/o'ng; 13 = S-burilish; 14/15 = serpantin chap/o'ng; 16 = tik qiyalik; 17 = STOP; 18 = yo'l bering; 19 = quvib o'tish taqiqi; 20 = tunnel; 21 = ko'prik; 22 = asfaltsiz yo'l; 23 = chorraha; 24/25 = chevron chap/o'ng; 26 = belgi orqasi (kulrang); 27 = sirpanchiq; 28 = tosh qulashi.
- Pastki yarmi (y ≥ 512): 256×64 yozuv taxtalari, 4 ustun × 8 qator. 0–11 = joy nomlari (yashil), 12–19 = yo'l nomlari (ko'k).
- Atlas fayli bo'lmasa o'yin uni kod bilan chizadi. Standart atlasni `tools/export_assets.py` yaratadi.

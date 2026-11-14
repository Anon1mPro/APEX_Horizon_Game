# models/ — barcha 3D modellar (GLB)

Format: **glTF 2.0 binary (`.glb`)**. Fayl nomi modelning nomi: nom o'yindagi nomga mos kelsa — o'yin shu modelni ishlatadi.
Nomlar **katta-kichik harfga va probel/`_`/`-` ga bog'liq emas** (`Pip GT.glb`, `pip_gt.glb`, `pip.glb` — hammasi "Pip GT").
Fayl bo'lmasa — o'yin ichidagi standart model ishlaydi. Faylni qo'shgandan keyin o'yinni qayta ishga tushiring (Stop → Play).

```
models/
  cars/        o'yinchi mashinalari + trafik
  shop/        do'kon mashinalari
  structure/   binolar, inshootlar, to'siq, bordyur
  biome/       daraxt, buta, tosh, kaktus
```

## cars/ — mashinalar
| Fayl | Nima |
|---|---|
| `pip.glb` `meridian.glb` `bruiser.glb` `falcon.glb` `cruzer.glb` `vanta.glb` `dune.glb` `ridgeback.glb` `hauler.glb` `heritage.glb` | o'yinchi mashinasi (nom = mashina `id` yoki to'liq nomi, masalan `Vanta X1`) |
| `traffic_sedan.glb` `traffic_hatch.glb` `traffic_van.glb` `traffic_truck.glb` `traffic_suv.glb` | yo'ldagi botlar (trafik) mashinalari |

**Mashina modeliga talablar**
- Birlik — metr, Y yuqoriga, **mashina old tomoni +Z** (glTF standarti; Blender'da old tomon −Y bo'lsa eksport avtomatik shunday beradi). Koordinata boshi — mashinaning pastki markazi.
- Ichki mashinalar uchun model uzunligi mashina uzunligiga avtomatik moslanadi; `shop/` dagi yangi mashinalar o'z o'lchamida qoladi.
- **G'ildiraklar:** nomida `wheel`, `tire` yoki `tyre` bo'lgan 4 ta obyekt (markaz atrofida aylanishi uchun avtomatik pivot yaratiladi; old/orqa va chap/o'ng joyiga qarab aniqlanadi).
- **Bo'yoq:** materiali nomi `Paint` (yoki `body`, `carpaint`) bo'lgan material garajda bo'yaladi.
- **Shisha:** material nomida `glass`/`window` — kabina kamerasida yashiriladi.
- **Chiroqlar:** material nomi `HeadLight` / `TailLight` (yoki nomida `head`, `tail`, `brake`) — L va tormozda yonadi. Faralar nuri (SpotLight) avtomatik qo'shiladi.
- **Interyer:** `Interior` nomli obyekt faqat kabina (cockpit) kamerasida ko'rinadi.

## shop/ — do'kon
- `shop/<mashina>.glb` — shu mashina egallanmagan paytda garaj/do'kon ko'rinishida ko'rsatiladi (egallangach `cars/` modeli ishlatiladi).
- **Ro'yxatda yo'q nomli** fayl (masalan `shop/mega_racer.glb`) — **yangi mashina sifatida** do'konga qo'shiladi va haydash mumkin.
  Ixtiyoriy sozlama: `shop/mega_racer.json`:
  ```json
  { "name": "Mega Racer", "price": 77000, "cls": "A", "pi": 720,
    "vmax": 300, "kw": 380, "mass": 1450, "a0": 9.5, "drive": "awd",
    "grip": 0.95, "brake": 11, "steer": 1.0, "off": 0.3, "color": "#3366ff" }
  ```
  (yozilmagan maydonlar standart qiymat oladi).

## structure/ — binolar va inshootlar
`house` (yoki `house_1`, `house_2`, … — bir nechta variant, tasodifiy tanlanadi), `church`, `barn`, `silo`, `gas_station`, `diner`, `castle`, `viewpoint`, `wind_turbine`, `lighthouse`, `pier`.
- Model **old tomoni (+Z) yo'lga qaragan** bo'lsin, koordinata boshi — poydevor markazida, pastda. Joy o'lchami (bounding box) avtomatik olinadi: bino relyefga qo'yiladi va tagiga poydevor quriladi (osmonda qolmaydi).
- Binolar to'liq material va teksturalari bilan chiziladi.
- `guardrail.glb` — yo'l chetidagi to'siq (4 m uzunlik, **+Z bo'ylab**); `curb.glb` — qishloqlardagi bordyur (4 m, +Z bo'ylab). Ular yo'l bo'ylab takrorlanadi.

## biome/ — o'simliklar
`oak(_N)`, `pine(_N)`, `palm(_N)`, `cactus(_N)`, `bush(_N)`, `rock(_N)` (N = 1, 2, 3 … — variantlar).
- Koordinata boshi — tagida. O'lcham o'zgarishi o'yinda 0.8–1.5× tasodifiy.
- Samaradorlik uchun daraxt/buta/tosh minglab nusxada **vertex ranglarga "pishiriladi"** (material rangi, teksturadan namuna olinadi). Sifatli ko'rinish uchun oddiy material/vertex rang ishlating, kam poligon (≤ 500 uchburchak).

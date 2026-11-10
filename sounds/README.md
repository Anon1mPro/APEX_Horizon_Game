# sounds/ — ovozlar

Format: `.wav`, `.ogg`, `.mp3`. Fayl bo'lmasa — o'yin ichidagi sintez ovoz ishlaydi.
Nomlar aniq; **sikl** deb belgilanganlar uzluksiz aylanadi (boshi-oxiri silliq ulanishi kerak).

| Fayl | Turi | Nima |
|---|---|---|
| `engine/<mashina>.wav` | sikl | shu mashina dvigateli (`pip`, `meridian`, `bruiser`, `falcon`, `cruzer`, `vanta`, `dune`, `ridgeback`, `hauler`, `heritage`; `shop/` dagi yangi mashinalar uchun ham ularning id'si) |
| `engine/engine.wav` | sikl | mashinaga alohida fayl bo'lmasa — umumiy dvigatel |
| `ambient/wind.wav` | sikl | shamol (tezlikka qarab balandligi o'zgaradi) |
| `ambient/rain.wav` | sikl | yomg'ir |
| `ambient/roadnoise.wav` | sikl | yo'l shovqini (g'ildirak) |
| `ambient/thunder.wav` | bir marta | momaqaldiroq |
| `car/skid.wav` | sikl | shina chiyillashi (drift/sirpanish) |
| `car/turbo.wav` | sikl | turbo hushtagi |
| `car/impact.wav` | bir marta | zarba |
| `car/shift.wav` | bir marta | uzatma almashtirish |
| `car/horn.wav` | bir marta | signal (H) |
| `ui/beep.wav` `ui/go.wav` `ui/reward.wav` `ui/click.wav` | bir marta | sanoq, start, mukofot, bosish |

**Dvigatel sikli:** bitta sikl RPM ga qarab tezligi o'zgartirilib ijro etiladi (bo'sh turishda ≈ 0.5×, qizil chiziqda ≈ 2.4×). Shuning uchun faylni **o'rtacha tezlikdagi** dvigatel ovozi qilib, 1–2 soniyalik uzluksiz sikl sifatida tayyorlang.

// ============================================================
// PREFAB TIZIMI v2 — to'liq xotira: entity (oyinchi/avto) xarakteri,
// model + texture, scale + rotation (POZITSIYA emas).
// Eksport papka ko'rinishida:
//   apex-prefab-(nom).zip / Models/ , Textures/ , apex-file.json
// ============================================================
const PrefabSystem = {
  _key: 'apex3d_prefabs',

  // ============================================================
  //  💾 SAQLASH — `prefabs/` PAPKASI
  // ------------------------------------------------------------
  //  ⚠ NEGA DISKDA, `localStorage` DA EMAS:
  //    `localStorage` ~5 MB bilan cheklangan va brauzer tarixini
  //    tozalasangiz butun kutubxona yo'qoladi. Bitta GLB model esa
  //    o'zi 10 MB bo'lishi mumkin — ikkita prefab saqlasangiz joy
  //    tugardi va "kutubxonaga sig'madi" degan xabar chiqardi.
  //
  //    Endi har prefab — `prefabs/<nom>/` papkasi: `prefab.json` +
  //    `texture/ models/ sound/ video/ html/`. Papkani do'stingizga
  //    yuborish, git ga qo'yish, qo'lda tahrirlash mumkin.
  //
  //  ⚠ NEGA XOTIRADA KESH BOR: `load()` — SINXRON funksiya va uni
  //    o'nlab joy chaqiradi (ro'yxat chizish, qo'yish, o'chirish).
  //    Uni `async` qilsak o'sha joylarning hammasini qayta yozish
  //    kerak bo'lardi. Shuning uchun disk — MANBA, kesh esa
  //    ishchi nusxa: dastur ochilganda diskdan to'ldiriladi.
  //
  //  ⚠ `localStorage` ZAXIRA bo'lib qoldi: dvigatel `file://` orqali
  //    ochilsa server yo'q — shunda eski yo'l ishlaydi.
  // ============================================================
  _cache: null,
  _diskOn: true,          // server javob bermasa `false` ga tushadi

  load() {
    if (this._cache) return this._cache;
    try { this._cache = JSON.parse(localStorage.getItem(this._key) || '[]'); }
    catch { this._cache = []; }
    return this._cache;
  },

  save(list) {
    this._cache = list;
    // Zaxira — server yo'q bo'lsa ham nimadir qolsin
    try { localStorage.setItem(this._key, JSON.stringify(list)); } catch (e) {}
    return true;
  },

  /** Prefab papkasining nomi (ikki xil prefab bir joyga tushmasin). */
  //  ⚠ Server `safeName()` nomni 64 belgiga QISQARTIRADI. Klient esa
  //    qisqartirmasdi: ikki uzun nom (birinchi 64 belgisi bir xil) klientda
  //    "har xil", serverda BIR papka bo'lib, biri ikkinchisining ustidan
  //    yozardi. Yana: `base + '-' + id` 64 dan oshsa server oxiridagi id ni
  //    kesib tashlardi. Shuning uchun asos 40 belgigacha qisqartiriladi
  //    (40 + '-' + 13 xonali id = 54 < 64) va taqqoslash ham shu qisqa
  //    nom bo'yicha.
  _dirBase(name) { return this._safe(name || 'prefab').slice(0, 40); },
  _dirOf(p) {
    const base = this._dirBase(p.name);
    const same = (this._cache || []).filter(x => this._dirBase(x.name) === base);
    return (same.length > 1 && same[0].id !== p.id)
      ? base + '-' + String(p.id).replace(/[^0-9a-zA-Z_]/g, '') : base;
  },

  /**
   * 📤 Bitta prefabni `prefabs/<nom>/` ga yozadi.
   * ⚠ Aktivlar `AssetBundle` bilan papkalarga ajratiladi — sahna va
   *   ZIP eksporti bilan AYNAN bir xil yo'l.
   */
  async saveToDisk(p) {
    if (!this._diskOn || !p) return false;
    try {
      const manifest = {
        apexPrefab: true, version: 4,
        id: p.id, name: p.name, icon: p.icon, created: p.created,
        data: JSON.parse(JSON.stringify(p.data)),
        timeline: p.timeline || null,
      };
      // ⚠ JSZip shimi: `AssetBundle` faqat `file()` ni chaqiradi.
      //   Haqiqiy ZIP yasash shart emas — bizga fayllar RO'YXATI
      //   kerak, uni to'g'ridan serverga yuboramiz.
      const files = {};
      const shim = {
        file(name, payload, opt) {
          files[name] = (opt && opt.base64)
            ? payload
            : btoa(unescape(encodeURIComponent(payload)));   // matn → base64
          return this;
        },
        folder() { return this; },
      };
      if (window.AssetBundle) { try { AssetBundle.extract(manifest, shim); } catch (e) {} }

      const r = await fetch('/api/prefab/save', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: this._dirOf(p), prefab: manifest, files }),
      }).then(x => x.json());
      if (!r.ok) throw new Error(r.error || 'server rad etdi');
      log(`📦 "${p.name}" → ${r.path}/ (${r.files} fayl)`, 'lok');
      return true;
    } catch (e) {
      // ⚠ Bir marta uzilsa qayta-qayta urinmaymiz: `file://` da har
      //   saqlashda konsol xato bilan to'lardi.
      this._diskOn = false;
      log('⚠ Prefab papkaga yozilmadi (server yo\'qmi?) — zaxira: brauzer xotirasi', 'lw');
      return false;
    }
  },

  /** 🗑 Papkani ham o'chiradi. */
  async deleteFromDisk(p) {
    if (!this._diskOn || !p) return false;
    try {
      await fetch('/api/prefab/delete', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: this._dirOf(p) }),
      });
      return true;
    } catch (e) { return false; }
  },

  /**
   * 📥 Dastur ochilganda `prefabs/` dan o'qiydi.
   * ⚠ Disk — MANBA: brauzer xotirasidagi eski nusxa ustiga yoziladi.
   *   Aks holda boshqa kompyuterdan ko'chirib kelingan papkalar
   *   ko'rinmasdi.
   */
  async syncFromDisk() {
    try {
      const r = await fetch('/api/prefab/list').then(x => x.json());
      if (!r || !r.ok) throw new Error('ro\'yxat yo\'q');
      const out = [];
      for (const it of (r.prefabs || [])) {
        const one = await fetch('/api/prefab/load/' + encodeURIComponent(it.dir))
          .then(x => x.json()).catch(() => null);
        if (!one || !one.ok) continue;
        const man = one.prefab;
        // Aktivlarni qaytarish — fayllardan xotirada ZIP yasaymiz
        if (window.AssetBundle && typeof JSZip !== 'undefined' &&
            one.files && Object.keys(one.files).length) {
          const z = new JSZip();
          for (const rel in one.files) z.file(rel, one.files[rel], { base64: true });
          try { await AssetBundle.resolve(man, z); } catch (e) {}
        }
        out.push({
          id: man.id || Date.now() + out.length,
          name: man.name || it.dir, icon: man.icon || '🧱',
          created: man.created || '', apexPrefab: true,
          version: man.version || 4, data: man.data, timeline: man.timeline || null,
        });
      }
      this._cache = out;
      try { localStorage.setItem(this._key, JSON.stringify(out)); } catch (e) {}
      if (typeof prefabRenderList === 'function') prefabRenderList();
      if (out.length) log(`📦 ${out.length} ta prefab "prefabs/" papkasidan yuklandi`, 'lok');
      return out.length;
    } catch (e) {
      this._diskOn = false;
      return -1;                   // server yo'q — zaxira ishlaydi
    }
  },

  // ── ArrayBuffer <-> base64 ────────────────────────────────
  _ab2b64(buf) {
    let bin = '';
    const bytes = new Uint8Array(buf), chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk)
      bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    return btoa(bin);
  },
  _b642ab(b64) {
    const bin = atob(b64), len = bin.length, bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i);
    return bytes.buffer;
  },
  _safe(s) { return String(s || 'asset').replace(/[^a-zA-Z0-9_\-]/g, '_'); },

  // ── ⚠ TUZATILDI: FUNKSIONAL userData NI SAQLASH ────────────
  // Eski kod faqat name/type/rot/scale/material/model ni saqlardi.
  // Natijada isHitbox, actions, isCamera, camViewMode, isInteractiveBtn,
  // targetObjectId ... — HAMMASI yo'qolardi. Prefab spawn qilinganda
  // element oddiy kubga aylanib qolardi.
  //
  // Endi: runtime maydonlardan tashqari HAMMASI saqlanadi (blacklist usuli,
  // shunda kelajakda yangi xususiyat qo'shilsa avtomatik ishlaydi).
  _RUNTIME_KEYS: new Set([
    'id', 'parentId',              // spawn da qaytadan beriladi
    '_glbBuffer',                  // alohida modelB64 sifatida ketadi
    'textureBase64', 'textureName' // alohida textureB64 sifatida ketadi
  ]),

  _cleanUD(ud) {
    if (!ud) return {};
    const out = {};
    for (const k in ud) {
      if (this._RUNTIME_KEYS.has(k)) continue;
      if (k.startsWith('_')) continue;          // _mixer, _isActive, _entitiesInside, _timerT ...
      const v = ud[k];
      if (typeof v === 'function') continue;
      if (v instanceof Map || v instanceof Set) continue;
      if (v && v.isObject3D) continue;          // sahna havolalarini saqlab bo'lmaydi
      try { out[k] = JSON.parse(JSON.stringify(v)); } catch { /* seriyalanmaydi — tashlab ketamiz */ }
    }
    return out;
  },

  // Prefab ichidagi bog'lanishlarni tiklash uchun: eski id → yangi id
  // (actions.camera.camId, targetObjectId, spawnId, objId ... hammasi remap qilinadi)
  // ⚠ Faqat ODDIY obyekt/massivga kiramiz. DOM elementlari (PC block CSS3D div,
  //   iframe) va THREE obyektlarining xususiyatlariga yozib bo'lmaydi —
  //   `for..in` ular ustida yursa `outerText` kabi setter ishga tushib
  //   "Element has no parent" xatosini beradi va prefab buziladi.
  _isPlainObj(o) {
    if (typeof Node !== 'undefined' && o instanceof Node) return false;
    if (o.isObject3D || o.isMaterial || o.isTexture || o.isBufferGeometry) return false;
    const p = Object.getPrototypeOf(o);
    return p === Object.prototype || p === null;
  },
  _remapIds(val, map, depth = 0) {
    if (depth > 12 || val == null) return val;
    if (Array.isArray(val)) return val.map(v => this._remapIds(v, map, depth + 1));
    if (typeof val === 'object') {
      if (!this._isPlainObj(val)) return val;
      for (const k in val) {
        const v = val[k];
        // id ga o'xshash kalitlar: camId, targetObjectId, spawnId, objId, btnId, sourceObjId ...
        if ((typeof v === 'string' || typeof v === 'number') && /(^|[a-z])id$/i.test(k)) {
          if (map.has(String(v))) { val[k] = map.get(String(v)); continue; }
        }
        val[k] = this._remapIds(v, map, depth + 1);
      }
      return val;
    }
    return val;
  },

  // ============================================================
  //  🆔 ID AJRATISH (id to'qnashuvidan himoya)
  // ------------------------------------------------------------
  //  ⚠ ILGARIGI XATO — "prefabni boshqa loyihaga olib o'tsam, timeline
  //    ishlamaydi, 5 ta barmoq bir joyga to'planadi":
  //
  //    Spawn paytida har bir obyekt YANGI id oldi, so'ng hamma
  //    `userData` (`id` va `parentId` ham!) eski→yangi xarita bo'yicha
  //    QAYTA remap qilinardi. Xarita kalitlari — ESKI id lar (masalan
  //    7..17). Yangi loyihada hisoblagich past bo'lsa YANGI id lar ham
  //    shu oraliqqa tushadi (4..15). Natija zanjirli almashtirish:
  //        barmoq-A: yangi id 7 → xaritada '7' bor → 4 ga aylandi
  //    Ya'ni ikki obyekt BIR XIL `userData.id` oldi. Timeline esa
  //    obyektni id bo'yicha topadi → ikkala obyekt bitta trekni bo'lishdi.
  //    Bir loyiha ichida ishlayverardi (yangi id lar doim eskilardan
  //    katta) — shuning uchun xato FAQAT boshqa loyihada ko'rinardi.
  //
  //  Endi: 1) id lar spawndan OLDIN bir martada ajratiladi;
  //        2) remap faqat SAQLANGAN `ud` nusxasiga qo'llanadi, hech qachon
  //           jonli `userData.id/parentId` ga;
  //        3) hisoblagich sahnadagi eng katta id dan pastga tushmaydi.
  // ============================================================
  _maxSceneId() {
    let m = 0;
    if (typeof objects !== 'undefined' && objects) {
      for (const o of objects) {
        const v = o && o.userData ? Number(o.userData.id) : NaN;
        if (isFinite(v) && v > m) m = v;
      }
    }
    return m;
  },
  // Hisoblagichni sahnadagi eng katta id dan yuqoriga ko'taradi
  _syncIdCounter() {
    const m = this._maxSceneId();
    if (m > objIdC) objIdC = m;
    try { if (typeof AppState !== 'undefined' && AppState && AppState.objIdC < objIdC) AppState.objIdC = objIdC; } catch (e) {}
  },
  // Butun daraxt uchun yangi id lar: node → yangi id, eski id → yangi id
  _allocIds(node, idMap, alloc) {
    const nid = ++objIdC;
    alloc.set(node, nid);
    if (node.oldId != null) {
      const k = String(node.oldId);
      if (idMap.has(k)) idMap._dupOld = (idMap._dupOld || 0) + 1;   // buzuq prefab: takror eski id
      else idMap.set(k, nid);
    }
    if (node.children) for (const ch of node.children) this._allocIds(ch, idMap, alloc);
  },

  // Global playerSettings ning saqlanadigan (xarakter) qismini nusxalash
  _snapshotPlayerSettings() {
    if (typeof playerSettings === 'undefined') return null;
    const out = {};
    for (const k in playerSettings) {
      if (k.startsWith('_')) continue;          // runtime maydonlarni tashlab ketamiz
      if (k === 'keys') { out.keys = { ...playerSettings.keys }; continue; }
      const v = playerSettings[k];
      if (typeof v === 'function') continue;
      out[k] = v;
    }
    return out;
  },

  // ── OBYEKTNI SERIALIZE QILISH (base64 inline) ─────────────
  _serializeObj(obj) {
    const ud  = obj.userData || {};
    const mat = obj.material;
    const isGLB = !!(ud.isGLB || ud.isGLTF);

    // Model bufferini topish (to'g'ridan import yoki asset kutubxonadan)
    let modelB64 = null, modelName = null;
    if (isGLB) {
      let buf = ud._glbBuffer;
      if (!buf && typeof loadedModels !== 'undefined') {
        const lm = loadedModels.find(m => m.name === ud.name);
        if (lm) buf = lm.buffer;
      }
      if (buf) { modelB64 = this._ab2b64(buf); modelName = this._safe(ud.name) + '.glb'; }
    }

    // Entity (oyinchi / avto) xarakteri
    const isPlayer = !!ud.isPlayerObj;
    const isCar    = ud.entityType === 'car' || ud._entityMode === 'vehicle' || !!ud.isCar;
    const carCfg   = isCar
      ? JSON.parse(JSON.stringify(
          ud._carCfg || (window._getCarCfg ? window._getCarCfg(obj) : {}) || {}))
      : null;

    const data = {
      name: ud.name || 'Object',
      type: ud.type || 'Mesh',
      // ⚠ YANGI: eski id (prefab ichidagi bog'lanishlarni remap qilish uchun)
      oldId: ud.id != null ? String(ud.id) : null,
      // ⚠ YANGI: to'liq funksional userData — hitbox actions, kamera sozlamalari,
      // tugma konfiguratsiyasi, collisionMode, colliderMode va h.k.
      ud: this._cleanUD(ud),
      // ⚠ POZITSIYA SAQLANADI — bu LOKAL koordinata (ota-onaga nisbatan).
      //   Ilgari saqlanmasdi va prefab ichidagi HAMMA element (0,0,0) ga
      //   tushib, bir joyda g'ijim bo'lib chiqardi. ILDIZ pozitsiyasi
      //   spawn paytida baribir kamera oldiga qo'yiladi (`_spawnRecord`),
      //   shuning uchun uni saqlash zarar qilmaydi.
      px: obj.position.x, py: obj.position.y, pz: obj.position.z,
      rx: obj.rotation.x, ry: obj.rotation.y, rz: obj.rotation.z,
      sx: obj.scale.x,    sy: obj.scale.y,    sz: obj.scale.z,
      physMode: ud.physMode || 'solid',
      isGroup: obj.isGroup || !!ud.isGroup || !!ud._isFolder,
      isGLB,
      script: ud.script || '',
      material: mat ? {
        color:    '#' + (mat.color    ? mat.color.getHexString()    : '88aacc'),
        emissive: '#' + (mat.emissive ? mat.emissive.getHexString() : '000000'),
        roughness: mat.roughness ?? 0.5,
        metalness: mat.metalness ?? 0.3,
        opacity:   mat.opacity   ?? 1.0,
        transparent: mat.transparent ?? false,
        emissiveIntensity: mat.emissiveIntensity ?? 0,
      } : null,
      // Model + texture (inline base64 — kutubxona / spawn uchun)
      modelB64, modelName,
      textureB64:  ud.textureBase64 || null,
      textureName: ud.textureName   || null,
      // Entity xarakteri: kamera, maks/min tezlik, rang, tugmalar, nitro ...
      entity: {
        isPlayer, isCar,
        entityMode: ud._entityMode || null,
        entityType: ud.entityType || null,
        carCfg,
        playerSettings: isPlayer ? this._snapshotPlayerSettings() : null,
      },
      children: [],
    };

    // Bolalar (GLB ichki meshlari emas — faqat userData.id bor obyektlar)
    if (!isGLB && obj.children) {
      obj.children.forEach(ch => {
        if ((ch.isMesh || ch.isGroup) && ch.userData && ch.userData.id) {
          data.children.push(this._serializeObj(ch));
        }
      });
    }
    return data;
  },

  _iconFor(obj) {
    const ud = obj.userData || {};
    if (ud.isPlayerObj) return '🎮';
    if (ud.entityType === 'car' || ud._entityMode === 'vehicle' || ud.isCar) return '🚗';
    if (ud.isGLB || ud.isGLTF) return '🧊';
    if (ud.isGroup || obj.isGroup || ud._isFolder) return '📦';
    if (ud.type === 'Tekislik') return '⬜';
    if (ud.physMode === 'jelly')  return '🟢';
    if (ud.physMode === 'liquid') return '🔵';
    return '🧱';
  },

  // ── ⏱ TIMELINE — prefab ichidagi obyektlarning treklari ────
  //  ⚠ ILGARIGI XATO: bu yerda `tlTracks` degan GLOBAL obyektdan o'qilardi.
  //    U LOYIHADA UMUMAN E'LON QILINMAGAN — haqiqiy treklar
  //    `TimelineSystem` IIFE si ichidagi `tracks` massivida turadi
  //    (`timeline.js` va `save-load.js` dagi izohlarga qarang).
  //    `typeof tlTracks === 'undefined'` himoyasi tufayli xato ham
  //    chiqmasdi: `_collectTimeline` HAMISHA `null` qaytarardi, ya'ni
  //    prefab bilan timeline HECH QACHON ko'chmasdi.
  //  Endi `TimelineSystem.exportTracksFor / importTracks` ishlatiladi.
  _collectTimeline(root) {
    const TL = window.TimelineSystem;
    if (!TL || typeof TL.exportTracksFor !== 'function') return null;
    try { return TL.exportTracksFor(root); } catch (e) { return null; }
  },

  /**
   * Treklarni YANGI id lar bilan tiklaydi.
   * ⚠ Sahnadagi mavjud treklar O'CHIRILMAYDI — prefab sahnaga qo'shiladi,
   *   uni almashtirmaydi (`TimelineSystem.restore` esa hammasini tozalaydi).
   */
  _restoreTimeline(tl, idMap, opts) {
    const TL = window.TimelineSystem;
    if (!tl || !TL || typeof TL.importTracks !== 'function') return 0;
    try { return TL.importTracks(tl, idMap, opts); } catch (e) {
      log('⚠ Prefab timeline tiklanmadi: ' + e.message, 'lw');
      return 0;
    }
  },

  // ── PREFAB YOZUVINI QURISH ────────────────────────────────
  _buildRecord(obj, name) {
    return {
      id: Date.now(),
      name,
      icon: this._iconFor(obj),
      created: new Date().toLocaleDateString(),
      apexPrefab: true,
      version: 3,                          // v3 — timeline qo'shildi
      data: this._serializeObj(obj),
      timeline: this._collectTimeline(obj),
    };
  },

  saveFromSelected() {
    const obj = selectedObj;
    if (!obj || !obj.userData || !obj.userData.id) { log('⚠ Avval objectni tanlang', 'lw'); return; }
    const name = prompt('Prefab nomi:', obj.userData.name || 'Prefab');
    if (!name) return;
    const rec  = this._buildRecord(obj, name);
    const list = this.load();
    list.push(rec);
    const ok = this.save(list);
    // 💾 Papkaga ham yozamiz
    this.saveToDisk(rec);
    prefabRenderList();
    const e = rec.data.entity;
    const tag = e.isPlayer ? ' (🎮 oyinchi xarakteri bilan)'
              : e.isCar    ? ' (🚗 avto xarakteri bilan)'  : '';
    log(`⭐ "${name}" prefab saqlandi${tag}`, 'lok');
    if (!ok) log('↳ Kutubxonaga sig\'madi, lekin ⬇ZIP bilan eksport qilishingiz mumkin', 'lw');
  },

  // Tanlangan obyektni to'g'ridan ZIP qilib eksport (kutubxonaga yozmasdan)
  exportSelected() {
    const obj = selectedObj;
    if (!obj || !obj.userData || !obj.userData.id) { log('⚠ Avval objectni tanlang', 'lw'); return; }
    const name = prompt('Prefab nomi:', obj.userData.name || 'Prefab');
    if (!name) return;
    this._exportRecord(this._buildRecord(obj, name));
  },


  // ============================================================
  //  ◣ QIYSHAYISH (SHEAR) — aniqlash va tuzatish
  // ------------------------------------------------------------
  //  ⚠ SABAB: ota-onaning scale'i TENG EMAS (masalan 0.78, 0.3, 0.72) va
  //    ichidagi bola BURILGAN bo'lsa, dunyo matritsasi  S_ota · R_bola · S_bola
  //    bo'ladi. Bu "burilish + o'lchov" (TRS) ko'rinishida YOZILMAYDI — bola
  //    qiyshayib (parallelepiped) ko'rinadi. Bu three.js (va Unity) ning
  //    matematik cheklovi, prefabning xatosi emas: spawn muharrirdagi bilan
  //    AYNAN bir xil ko'rinishni qaytaradi.
  //
  //  ✅ YECHIM: notekis scale'li ota-onani birlik-scale'li Group (konteyner)
  //    qilib, uning shaklini (scale bilan) o'z bolasiga ko'chirish. Burilmagan
  //    bolalar AYNAN joyida qoladi; burilganlari qiyshaymaydi.
  // ============================================================
  _nonUniform(n) {
    const a = [Math.abs(n.sx ?? 1), Math.abs(n.sy ?? 1), Math.abs(n.sz ?? 1)];
    return Math.max(...a) / Math.max(1e-9, Math.min(...a)) > 1.0005;
  },
  _anyRot(n) {
    return (n.children || []).some(c =>
      Math.abs(c.rx || 0) > 1e-6 || Math.abs(c.ry || 0) > 1e-6 || Math.abs(c.rz || 0) > 1e-6 ||
      this._anyRot(c));
  },
  /** Qaysi qismlar qiyshaygan: [{name, path, skew}] (0 = to'g'ri). */
  auditShear(rec) {
    const out = [];
    const walk = (n, parentLin, path) => {
      const M = new THREE.Matrix4().compose(
        new THREE.Vector3(0, 0, 0),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(n.rx || 0, n.ry || 0, n.rz || 0)),
        new THREE.Vector3(n.sx ?? 1, n.sy ?? 1, n.sz ?? 1));
      const L = parentLin ? parentLin.clone().multiply(M) : M;
      const e = L.elements;
      const a = new THREE.Vector3(e[0], e[1], e[2]).normalize();
      const b = new THREE.Vector3(e[4], e[5], e[6]).normalize();
      const c = new THREE.Vector3(e[8], e[9], e[10]).normalize();
      const skew = Math.max(Math.abs(a.dot(b)), Math.abs(a.dot(c)), Math.abs(b.dot(c)));
      if (parentLin && skew > 0.02) out.push({ name: n.name, path: path + '/' + n.name, skew });
      (n.children || []).forEach(ch => walk(ch, L, path + '/' + n.name));
    };
    walk(rec.data || rec, null, '');
    return out;
  },
  /**
   * Notekis scale'li + burilgan bolali tugunni
   *   Group(scale 1) → [ shakl (scale), bolalar' ]  ga aylantiradi.
   * Sof MA'LUMOT funksiyasi: yangi nusxa qaytaradi, asl o'zgarmaydi.
   */
  straightenNode(node) {
    const n = JSON.parse(JSON.stringify(node));
    const go = (x) => {
      const kids = x.children || [];
      if (!(kids.length && this._nonUniform(x) && this._anyRot(x))) {
        x.children = kids.map(go); return x;
      }
      const S = new THREE.Matrix4().makeScale(x.sx ?? 1, x.sy ?? 1, x.sz ?? 1);
      const wrap = JSON.parse(JSON.stringify(x));
      wrap.children = [];
      wrap.type = 'Group'; wrap.isGroup = true; wrap.isGLB = false;
      wrap.sx = wrap.sy = wrap.sz = 1;
      wrap.modelB64 = null; wrap.material = null;
      wrap.ud = { name: x.name, type: 'Group', isGroup: true, _isFolder: true,
                  colliderMode: 'inline', children: [] };
      // shakl — eski obyektning o'zi, ota-onaga nisbatan (0,0,0), eski scale bilan
      const body = JSON.parse(JSON.stringify(x));
      body.children = [];
      body.name = x.name + '-shakl'; if (body.ud) body.ud.name = body.name;
      body.oldId = x.oldId != null ? String(x.oldId) + '-shakl' : null;
      body.px = body.py = body.pz = 0; body.rx = body.ry = body.rz = 0;
      const moved = kids.map(c => {
        const C = JSON.parse(JSON.stringify(c));
        const m = new THREE.Matrix4().compose(
          new THREE.Vector3(c.px || 0, c.py || 0, c.pz || 0),
          new THREE.Quaternion().setFromEuler(new THREE.Euler(c.rx || 0, c.ry || 0, c.rz || 0)),
          new THREE.Vector3(c.sx ?? 1, c.sy ?? 1, c.sz ?? 1));
        const w = S.clone().multiply(m);                   // S_ota · T·R·S_bola
        const p = new THREE.Vector3(), q = new THREE.Quaternion(), sc = new THREE.Vector3();
        w.decompose(p, q, sc);
        const eu = new THREE.Euler().setFromQuaternion(q, 'XYZ');
        C.px = p.x; C.py = p.y; C.pz = p.z;
        C.rx = eu.x; C.ry = eu.y; C.rz = eu.z;
        C.sx = sc.x; C.sy = sc.y; C.sz = sc.z;
        return go(C);
      });
      wrap.children = [body].concat(moved);
      return wrap;
    };
    return go(n);
  },
  /** Kutubxonadagi prefabni tuzatib, "<nom>-v4" nusxa sifatida qo'shadi. */
  straighten(id) {
    const src = this.load().find(p => p.id === id);
    if (!src) { log('⚠ Prefab topilmadi', 'lw'); return null; }
    const before = this.auditShear(src);
    const rec = JSON.parse(JSON.stringify(src));
    rec.id = Date.now(); rec.name = src.name + '-tuzatilgan';
    rec.data = this.straightenNode(src.data);
    const after = this.auditShear(rec);
    const list = this.load(); list.push(rec); this.save(list); this.saveToDisk(rec);
    if (typeof prefabRenderList === 'function') prefabRenderList();
    log(`◣ "${rec.name}": qiyshaygan qism ${before.length} → ${after.length}`, after.length ? 'lw' : 'lok');
    return rec;
  },

  // ── SPAWN ─────────────────────────────────────────────────
  _restoreEntity(mesh, node) {
    const e = node.entity; if (!e) return;
    const ud = mesh.userData;

    if (e.isCar) {
      ud._entityMode = e.entityMode || 'vehicle';
      ud.entityType  = e.entityType || 'car';
      ud.isCar = true;
      if (e.carCfg) ud._carCfg = JSON.parse(JSON.stringify(e.carCfg));
      // Oldi strelkasini qo'shish (mavjud bo'lsa)
      if (window.setEntityMode) { try { setEntityMode(mesh, 'vehicle'); } catch {} }
      log(`🚗 "${node.name}" — avto xarakteri tiklandi (maks ${e.carCfg?.maxSpeed ?? '?'} km/h)`, 'lok');
    }

    if (e.isPlayer) {
      // Boshqa oyinchilarni tozalab, shuni oyinchi qilamiz
      if (typeof objects !== 'undefined') objects.forEach(o => { o.userData.isPlayerObj = false; });
      ud.isPlayerObj = true;
      // Global playerSettings ga xarakterni qaytaramiz (kamera, tezlik, tugmalar ...)
      if (e.playerSettings && typeof playerSettings !== 'undefined') {
        for (const k in e.playerSettings) {
          if (k === 'keys') Object.assign(playerSettings.keys, e.playerSettings.keys);
          else playerSettings[k] = e.playerSettings[k];
        }
      }
      log(`🎮 "${node.name}" — oyinchi xarakteri tiklandi`, 'lok');
    }
  },

  // Texture ni data URL dan yuklab, to'g'ri rang fazosi bilan qaytaradi (versiyaga moslangan)
  _makeTexture(dataUrl, onReady) {
    const tex = new THREE.TextureLoader().load(dataUrl, t => { if (onReady) onReady(t); });
    if ('colorSpace' in tex) tex.colorSpace = THREE.SRGBColorSpace;
    else if ('encoding' in tex && THREE.sRGBEncoding !== undefined) tex.encoding = THREE.sRGBEncoding;
    return tex;
  },

  // ⚠ ASINXRON — GLTFLoader.parse callback bilan ishlaydi, shuning uchun await qilinadi.
  async _spawnNode(node, parentObj, idMap, alloc) {
    let mesh = null;

    // 1) GLB model bo'lsa — bufferdan tiklash (parse tugaguncha KUTAMIZ)
    if (node.isGLB && node.modelB64 && typeof THREE !== 'undefined' && THREE.GLTFLoader) {
      try {
        const buf    = this._b642ab(node.modelB64);
        const loader = getGLTFLoader();
        mesh = await new Promise(resolve => {
          loader.parse(buf, '', gltf => {
            const clone   = gltf.scene;
            const wrapper = new THREE.Group();
            wrapper.add(clone);
            const box = new THREE.Box3().setFromObject(clone);
            const sz  = box.getSize(new THREE.Vector3());
            const bbox = new THREE.Mesh(
              new THREE.BoxGeometry(sz.x || 1, sz.y || 1, sz.z || 1),
              new THREE.MeshBasicMaterial({ visible: false, transparent: true, opacity: 0 }));
            bbox.position.copy(box.getCenter(new THREE.Vector3()));
            wrapper.add(bbox);
            wrapper.traverse(ch => { if (ch.isMesh || ch.isSkinnedMesh) { ch.castShadow = true; ch.receiveShadow = true; } });
            wrapper.userData._glbBuffer = buf;  // qayta eksport uchun
            // GLB ustiga qo'shimcha texture berilgan bo'lsa — meshlarga qo'llash
            if (node.textureB64) {
              const tex = this._makeTexture(node.textureB64);
              wrapper.traverse(ch => {
                if (ch.isMesh && ch.material) {
                  const apply = mt => { mt.map = tex; mt.needsUpdate = true; };
                  Array.isArray(ch.material) ? ch.material.forEach(apply) : apply(ch.material);
                }
              });
            }
            resolve(wrapper);
          }, err => { log('⚠ GLB parse xatosi: ' + (err?.message || err), 'lw'); resolve(null); });
        });
      } catch (err) { log('⚠ GLB tiklashda xato: ' + err.message, 'lw'); }
    }

    // 2) Group/folder yoki primitive
    if (!mesh) {
      // ⚠ TUZATILDI: avval `children.length > 0` bo'lsa HAR QANDAY obyekt Group
      //   bo'lib qolardi. Natijada bolasi bor KUB (masalan kaft → barmoq-A →
      //   barmoq-B) geometriyasi va materialini yo'qotib, ko'rinmas Group
      //   bo'lardi, pivoti esa BOLALARNI qayta surib, hammasini
      //   `pivot × scale` qadar siljitardi ("kasha"). Group — faqat haqiqiy
      //   papka/guruh (isGroup, _isFolder yoki type 'Group').
      const _ndUD = node.ud || {};
      const _isRealGroup = !!(node.isGroup || _ndUD._isFolder || _ndUD.isFolder ||
                              _ndUD.isGroup || node.type === 'Group' || node.type === 'group');
      if (_isRealGroup) {
        mesh = new THREE.Group();
      } else {
        const geoMap = {
          'Kub': ()=>new THREE.BoxGeometry(1,1,1),
          'BoxGeometry': ()=>new THREE.BoxGeometry(1,1,1),
          'Sfera': ()=>new THREE.SphereGeometry(0.5,16,16),
          'Silindr': ()=>new THREE.CylinderGeometry(0.5,0.5,1,16),
          'Konus': ()=>new THREE.ConeGeometry(0.5,1,16),
          'Tekislik': ()=>new THREE.PlaneGeometry(2,2),
          'Torus': ()=>new THREE.TorusGeometry(0.5,0.2,12,36),
        };
        const geoFn = geoMap[node.type] || geoMap['Kub'];
        const m   = node.material || {};
        const mat = new THREE.MeshStandardMaterial({
          color: m.color || '#88aacc',
          roughness: m.roughness ?? 0.5,
          metalness: m.metalness ?? 0.3,
          opacity:   m.opacity   ?? 1.0,
          transparent: m.transparent ?? false,
          emissiveIntensity: m.emissiveIntensity ?? 0,
        });
        if (m.emissive) mat.emissive.set(m.emissive);
        // Texture (rang/tekstura) tiklash — to'g'ri rang fazosi + needsUpdate
        if (node.textureB64) {
          try {
            mat.map = this._makeTexture(node.textureB64, () => { mat.needsUpdate = true; });
            mat.needsUpdate = true;
          } catch (e) { log('⚠ Texture tiklashda xato: ' + e.message, 'lw'); }
        }
        mesh = new THREE.Mesh(geoFn(), mat);
        mesh.castShadow = true; mesh.receiveShadow = true;
      }
    }

    // 3) Transform — pozitsiya + rotation + scale
    //  ⚠ Bolalar uchun pozitsiya SHART: ota-onaga nisbatan lokal joylashuv.
    //    Ildizniki keyin `_spawnRecord` da kamera oldiga ko'chiriladi.
    mesh.position.set(node.px || 0, node.py || 0, node.pz || 0);
    mesh.rotation.set(node.rx||0, node.ry||0, node.rz||0);
    mesh.scale.set(node.sx||1, node.sy||1, node.sz||1);

    // 4) userData
    // ⚠ TUZATILDI: avval saqlangan FUNKSIONAL userData yoyiladi
    // (isHitbox, actions, isCamera, camViewMode, fov, isInteractiveBtn,
    //  hitboxSize, collisionMode, colliderMode, triggerType ...),
    // keyin ustidan tizim maydonlari yoziladi.
    //  ⚠ `node.ud` — prefab yozuvining (keshdagi) ICHKI obyekti. Uni to'g'ridan
    //    yoymaymiz: `_remapIds` ichki obyektlarni JOYIDA o'zgartiradi va
    //    yozuv buzilardi (ikkinchi spawn allaqachon remap qilingan
    //    havolalarni ko'rardi). Shuning uchun CHUQUR NUSXA.
    let _ud = {};
    try { _ud = JSON.parse(JSON.stringify(node.ud || {})); } catch (e) { _ud = Object.assign({}, node.ud || {}); }
    if (idMap && idMap.size) this._remapIds(_ud, idMap);   // faqat saqlangan havolalar (camId, targetObjectId ...)
    const _newId = (alloc && alloc.get(node)) || ++objIdC;
    mesh.userData = Object.assign(mesh.userData || {}, _ud, {
      id: _newId,
      name: node.name,
      type: node.type,
      physMode: node.physMode || 'solid',
      script: node.script || '',
      isGroup: node.isGroup,
      isGLB: node.isGLB || mesh.userData?.isGLB || false,
      textureBase64: node.textureB64 || mesh.userData?.textureBase64 || null,
      textureName:   node.textureName || mesh.userData?.textureName || null,
      parentId: parentObj ? parentObj.userData.id : null,
    });

    // ◈ PIVOT — geometriyani DARHOL suramiz (mesh uchun).
    //   `position` faylda allaqachon pivot bilan siljigan; geometriya esa yangi
    //   BoxGeometry(1,1,1) — markazda. `_` bilan boshlanadigan `_pivotDone`
    //   saqlanmaydi, shuning uchun `PivotSystem.syncAll()` buni 0.5s keyin
    //   qilardi (o'sha vaqtda obyekt noto'g'ri joyda ko'rinardi). Bu yerda
    //   qilib, `_pivotDone` ni belgilasak, keyin ikkinchi marta surilmaydi.
    //   Mesh bo'lmaganlar (GLB wrapper) — `syncAll` ga qoladi.
    try {
      const _pv = mesh.userData && mesh.userData.pivot;
      if (_pv && mesh.isMesh && mesh.geometry && !(node.isGLB)) {
        const _px = +_pv.x || 0, _py = +_pv.y || 0, _pz = +_pv.z || 0;
        if (_px || _py || _pz) {
          mesh.geometry = mesh.geometry.clone();
          mesh.geometry.translate(-_px, -_py, -_pz);
          mesh.geometry.computeBoundingBox();
          mesh.geometry.computeBoundingSphere();
          mesh.userData._pivotDone = { x: _px, y: _py, z: _pz };
        }
      }
    } catch (e) { log('⚠ Pivot tiklanmadi: ' + e.message, 'lw'); }

    // Eski id → yangi id (bog'lanishlarni keyin remap qilish uchun)
    //  ⚠ `has` tekshiruvi: `_allocIds` takror eski id da BIRINCHISINI saqlaydi.
    //    Shartsiz `set` oxirgisini yozib, ikki joy ikki xil javob berardi.
    if (idMap && node.oldId != null && !idMap.has(String(node.oldId))) {
      idMap.set(String(node.oldId), mesh.userData.id);
    }

    // ── KO'RINISHNI TIKLASH ──────────────────────────────────
    //  ⚠ Ilgari bu yerda 8 shoxli `if/else` zanjiri turardi va AYNAN
    //    o'shanday zanjir `save-load.js` da ham bor edi. Ikki nusxa
    //    bir-biridan ajralib ketgan: tugma `save-load` da yo'q edi,
    //    hitbox/sound/map-loader esa `prefab` da bor, `save-load` da yo'q.
    //    Endi ikkalasi ham `SceneTypes` ro'yxatidan o'qiydi.
    //
    //  `restore()` obyektni ALMASHTIRISHI mumkin (kub → kamera modeli,
    //  kub → ko'z ikonasi). Transform ko'chirish va eski resurslarni
    //  bo'shatish ro'yxatning o'zida bajariladi.
    const placed = window.SceneTypes ? SceneTypes.restore(mesh) : mesh;
    if (placed !== mesh) mesh = placed;

    // 5) Sahnaga qo'shish
    // ⚠ TUZATILDI: BOLA BO'LSA HAM objects[] ga qo'shiladi.
    // Eski kod bolalarni objects[] ga qo'shmagani uchun prefab ichidagi
    // hitbox/tugma/kamera hech qaysi tizimga ko'rinmasdi — o'lik element edi.
    if (parentObj) parentObj.add(mesh);
    else scene.add(mesh);
    objects.push(mesh);

    // 6) Entity xarakterini tiklash
    this._restoreEntity(mesh, node);

    // 7) Bolalar — har birini ketma-ket await qilamiz
    if (node.children) {
      for (const ch of node.children) await this._spawnNode(ch, mesh, idMap, alloc);
    }
    return mesh;
  },

  // ============================================================
  //  🛠 TAKROR ID LARNI TUZATISH
  // ------------------------------------------------------------
  //  Eski xato (`_allocIds` izohiga qarang) tufayli buzilgan sahnalarda
  //  bir nechta obyekt BIR XIL `userData.id` ga ega bo'lib qolgan.
  //  `repairDuplicateIds()` ularning har biriga noyob id beradi,
  //  `parentId` va timeline treklarini (objRef orqali) moslaydi.
  //  Konsoldan chaqirish mumkin:  PrefabSystem.repairDuplicateIds()
  // ============================================================
  repairDuplicateIds(list) {
    const arr = list || (typeof objects !== 'undefined' ? objects : []);
    this._syncIdCounter();
    const seen = new Map();          // id → birinchi obyekt
    const fixed = [];
    for (const o of arr) {
      if (!o || !o.userData || o.userData.id == null) continue;
      const k = String(o.userData.id);
      if (!seen.has(k)) { seen.set(k, o); continue; }
      const oldId = o.userData.id;
      const nid = ++objIdC;
      o.userData.id = nid;
      fixed.push({ obj: o, oldId, newId: nid });
    }
    if (!fixed.length) return 0;
    // bolalarning parentId si — haqiqiy ota-ona bo'yicha qayta yoziladi
    for (const o of arr) {
      if (!o || !o.userData || !o.parent || !o.parent.userData) continue;
      if (o.parent.userData.id != null && o.userData.parentId != null) o.userData.parentId = o.parent.userData.id;
    }
    // timeline: har bir trek o'z obyektining HOZIRGI id siga ulanadi
    const TL = window.TimelineSystem;
    if (TL && TL.tracks) {
      for (const t of TL.tracks) {
        if (t.objRef && t.objRef.userData && t.objRef.userData.id != null) t.objId = t.objRef.userData.id;
      }
    }
    try { if (typeof AppState !== 'undefined' && AppState) AppState.objIdC = objIdC; } catch (e) {}
    log(`🛠 ${fixed.length} ta takror id tuzatildi`, 'lok');
    return fixed.length;
  },
  // Spawn dan keyin: faqat shu prefab uchun tekshiruv (arzon)
  _ensureUniqueIds(root) {
    const ids = new Set(); let dup = false;
    if (typeof objects !== 'undefined' && objects) {
      for (const o of objects) {
        if (!o || !o.userData || o.userData.id == null) continue;
        const k = String(o.userData.id);
        if (ids.has(k)) { dup = true; break; }
        ids.add(k);
      }
    }
    if (dup) {
      log('⚠ Spawn dan keyin takror id aniqlandi — avtomatik tuzatilmoqda', 'lw');
      this.repairDuplicateIds();
    }
  },

  async spawn(id) {
    const prefab = this.load().find(p => p.id === id);
    if (!prefab) { log('⚠ Prefab topilmadi', 'lw'); return; }
    await this._spawnRecord(prefab);
  },

  async _spawnRecord(prefab) {
    // ⚠ ESKI PREFAB TEKSHIRUVI.
    //   v3 gacha bo'lgan prefablarda qismlarning pozitsiyasi UMUMAN
    //   saqlanmagan — spawn qilinganda hammasi (0,0,0) ga tushib g'ijim
    //   bo'ladi. Buni kod tuzata olmaydi: ma'lumotning o'zi yo'q.
    //   Shuning uchun foydalanuvchiga aniq aytamiz.
    const _kids = (prefab.data && prefab.data.children) || [];
    if (_kids.length > 1 && _kids.every(c => c.px === undefined)) {
      log(`⚠ "${prefab.name}" ESKI formatda (v${prefab.version || 2}) saqlangan — ` +
          `qismlar joylashuvi yo'q, bir joyga to'planadi.`, 'lw');
      log('↳ Tuzatish: sahnada joylashtirib, prefabni QAYTA saqlang.', 'lw');
    }

    // ◣ Qiyshaygan qismlar bo'lsa — jimgina emas, nomi bilan aytamiz.
    try {
      const _sk = this.auditShear(prefab);
      if (_sk.length) {
        log(`◣ "${prefab.name}": ${_sk.length} ta qism qiyshaygan ko'rinadi — ` +
            _sk.map(x => x.name).slice(0, 4).join(', ') + (_sk.length > 4 ? '…' : ''), 'lw');
        log('↳ Sabab: ota-onaning scale\'i teng emas + bola burilgan. ' +
            'Tuzatish: PrefabSystem.straighten(' + prefab.id + ')', 'lw');
      }
    } catch (e) {}

    // ⚠ YANGI: eski id → yangi id xaritasi
    //  🆔 Id lar OLDINDAN ajratiladi (`_allocIds` izohiga qarang): hisoblagich
    //     sahnadagi eng katta id dan pastda bo'lsa ham to'qnashuv bo'lmaydi.
    //     Prefab ichidagi bog'lanishlar (hitbox → kamera, tugma → maqsad:
    //     camId, targetObjectId, spawnId, objId ...) `_spawnNode` ichida
    //     saqlangan `ud` nusxasiga remap qilinadi.
    this._syncIdCounter();
    const idMap = new Map(), alloc = new Map();
    this._allocIds(prefab.data, idMap, alloc);
    if (idMap._dupOld) {
      log(`⚠ \"${prefab.name}\": ${idMap._dupOld} ta qismda eski id TAKRORLANGAN — ` +
          `prefab avval buzilgan holatda saqlangan; ularning timeline'i aniq tiklanmaydi. ` +
          `Tuzatish: sahnada qismlarni tekshirib, prefabni QAYTA saqlang.`, 'lw');
    }
    const root = await this._spawnNode(prefab.data, null, idMap, alloc);
    if (!root) { log('❌ Prefab spawn bo\'lmadi', 'le'); return; }
    if (idMap.size > 1) log(`🔗 ${idMap.size} ta element bog'lanishi tiklandi`, 'lok');
    // 🛡 Yakuniy tekshiruv: sahnada takror id bo'lmasligi SHART
    try { this._ensureUniqueIds(root); } catch (e) {}

    // Ildiz pozitsiyasi — kamera oldida paydo bo'ladi.
    // ⚠ Timeline'dan OLDIN qo'yiladi: ildiz treki keyframe'lari manba
    //   loyihaning mutlaq koordinatasida (`prefab.data.px/py/pz`) saqlangan.
    //   Joy o'zgargach ular shu siljishga ko'chirilmasa, timeline o'ynalganda
    //   ildiz (eshik, lift...) eski koordinataga SAKRAB ketardi.
    //   Bolalar LOKAL koordinatada — ularga siljish kerak emas.
    //
    // ⚠ BALANDLIK (y): oddiy prefab uchun `scale.y * 0.5` — yerga qo'yish
    //   taxmini. Lekin ILDIZI ANIMATSIYALANGAN prefabda bu taxmin keyframe
    //   balandliklarini buzadi: saqlash paytida eshik "ochiq" (y=3) turgan
    //   bo'lsa, y ni yerga tushirib shu farqni keyframe'larga ko'chirish
    //   animatsiyani yer ostiga surib yuborardi. Shuning uchun bunday
    //   prefabda y MUALLIF qo'ygancha qoladi, faqat x/z ko'chadi.
    const _src = prefab.data || {};
    const _tl  = prefab.timeline;
    const _rootAnimPos = !!(_tl && Array.isArray(_tl.tracks) && _src.oldId != null &&
      _tl.tracks.some(t => t && String(t.objId) === String(_src.oldId) &&
                           Array.isArray(t.keyframes) && t.keyframes.some(k => k && k.pos)));
    const _srcY = isFinite(+_src.py) ? +_src.py : 0;
    root.position.set(
      camera.position.x + Math.sin(camera.rotation.y) * -4,
      _rootAnimPos ? _srcY : Math.max(0, (root.scale?.y || 1) * 0.5),
      camera.position.z + Math.cos(camera.rotation.y) * -4
    );
    const _delta = {
      x: root.position.x - (+_src.px || 0),
      y: _rootAnimPos ? 0 : root.position.y - _srcY,
      z: root.position.z - (+_src.pz || 0),
    };
    // ⏱ Timeline treklari — yangi id lar bilan (lift, eshik, ko'targich...)
    const tlN = this._restoreTimeline(prefab.timeline, idMap, { root, delta: _delta });
    if (tlN) log(`⏱ ${tlN} ta timeline treki tiklandi`, 'lok');
    // ⚖️ Fizika — turiga qarab. Ilgari qat'iy `{isStatic:false}` edi:
    //    tugma yoki PC blokdan iborat prefab spawn qilinsa, u yerga
    //    qulardi. `physicsOptsFor()` yaratish yo'lidagi qoidani takrorlaydi
    //    (null = fizika berilmaydi).
    if (window.addPhysicsBody) {
      const _po = window.physicsOptsFor
                    ? window.physicsOptsFor(root)
                    : { isStatic: false, radius: 0.6 };
      if (_po) addPhysicsBody(root, Object.assign({ radius: 0.6 }, _po));
    }
    if (window.selectObject) selectObject(root);
    updateHierarchy(); updateStats();
    log(`⭐ "${prefab.name}" prefab sahnaga qo'shildi`, 'lok');
  },

  delete(id) {
    if (!confirm('Bu prefabni o\'chirasizmi?')) return;
    const _gone = this.load().find(p => p.id === id);
    this.save(this.load().filter(p => p.id !== id));
    if (_gone) this.deleteFromDisk(_gone);
    prefabRenderList();
    log('🗑 Prefab o\'chirildi', 'lw');
  },

  // ── ⚠ `_extractAssets` OLIB TASHLANDI (v4) ────────────────
  //  U faqat `modelB64` va `textureB64` ni papkaga chiqarardi.
  //  PBR xaritalari, 🔊 ovoz, 🎞 GIF kadrlari, 🖼 inventar ikonkasi,
  //  yuz teksturalari, 🎬 video va 📄 HTML sahifalar manifest ICHIDA
  //  qolib ketardi — ya'ni "papka ko'rinishida eksport" faqat ikkita
  //  tur uchun rost edi va prefab fayli o'nlab MB matn bo'lardi.
  //
  //  Endi `AssetBundle.extract()` ishlatiladi: u qiymatning O'ZIGA
  //  qarab qaror qiladi (mime, `*B64` kaliti, HTML belgilari) va
  //  sahna eksporti bilan AYNAN bir xil papkalarga yozadi:
  //      texture/  models/  sound/  video/  html/  maps/
  //
  //  ⚠ `_inlineAssets` esa QOLDI — eski (v3) prefablarni ochish uchun.

  async _exportRecord(prefab) {
    if (typeof JSZip === 'undefined') {
      // Fallback: oddiy JSON
      const blob = new Blob([JSON.stringify(prefab, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'apex-prefab-' + this._safe(prefab.name) + '.json'; a.click();
      log('⚠ JSZip yo\'q — JSON eksport qilindi', 'lw');
      return;
    }
    const zip = new JSZip();
    const manifest = {
      apexPrefab: true,
      // v4 — ⚠ HAMMA aktiv turi papkaga chiqadi (`AssetBundle`).
      //      v3 da faqat `modelB64` va `textureB64` ajratilardi:
      //      PBR xaritalari, 🔊 ovoz, 🎞 GIF kadrlari, 🖼 inventar
      //      ikonkasi, yuz teksturalari va 📄 HTML sahifalar
      //      manifest ICHIDA qolib ketardi. Ya'ni "papka ko'rinishida
      //      eksport" faqat ikkita tur uchun rost edi.
      version: 4,
      name: prefab.name,
      icon: prefab.icon,
      created: prefab.created,
      exportDate: new Date().toISOString(),
      data: JSON.parse(JSON.stringify(prefab.data)),
      // ⏱ Lift/eshik animatsiyalari ZIP bilan birga ketsin —
      //   aks holda do'stingizga yuborilgan prefab qimirlamaydi.
      timeline: prefab.timeline || null,
    };

    // ⚠ RO'YXAT YOZMAYMIZ. `AssetBundle` qiymatning O'ZIGA qarab
    //   (mime, `*B64` kaliti, HTML belgilari) qaror qiladi — sahna
    //   eksporti bilan AYNAN bir xil yo'l. Yangi aktiv turi
    //   qo'shilganda ikkala joyni yangilash kerak bo'lmaydi.
    let stat = { count: 0, files: [] };
    if (window.AssetBundle) {
      try { stat = AssetBundle.extract(manifest, zip); } catch (e) {}
    }

    zip.file('apex-file.json', JSON.stringify(manifest, null, 2));
    try {
      const blob = await zip.generateAsync({ type:'blob', compression:'DEFLATE', compressionOptions:{ level:6 } });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'apex-prefab-' + this._safe(prefab.name) + '.zip'; a.click();
      URL.revokeObjectURL(a.href);
      // Papkalar bo'yicha hisobot — nima chiqqani ko'rinsin
      const byDir = {};
      for (const f of (stat.files || [])) {
        const d = String(f).split('/')[0];
        byDir[d] = (byDir[d] || 0) + 1;
      }
      const parts = Object.keys(byDir).sort().map(d => `${d}/ ${byDir[d]}`);
      log(`📤 "${prefab.name}" → apex-prefab-${this._safe(prefab.name)}.zip` +
          (parts.length ? ' — ' + parts.join(', ') : ' (aktivsiz)'), 'lok');
    } catch (err) { log('❌ ZIP xatosi: ' + err.message, 'le'); }
  },

  exportOne(id) {
    const prefab = this.load().find(p => p.id === id);
    if (!prefab) return;
    this._exportRecord(prefab);
  },

  // ── IMPORT — .zip (yangi) yoki .json (eski/yangi) ─────────
  // Zip ichidagi Models//Textures/ fayllarini qayta inline base64 ga aylantiradi
  async _inlineAssets(node, zip) {
    const out = { ...node };
    if (out.modelFile) {
      const f = zip.file(out.modelFile) || zip.file(out.modelFile.replace(/^Models\//i, 'models/'));
      if (f) { out.modelB64 = this._ab2b64(await f.async('arraybuffer')); out.isGLB = true; }
      delete out.modelFile;
    }
    if (out.textureFile) {
      const f = zip.file(out.textureFile) || zip.file(out.textureFile.replace(/^Textures\//i, 'textures/'));
      if (f) {
        const b64 = await f.async('base64');
        const ext = out.textureFile.split('.').pop().toLowerCase();
        const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg'
                   : ext === 'webp' ? 'image/webp' : 'image/png';
        out.textureB64 = `data:${mime};base64,${b64}`;
      }
      delete out.textureFile;
    }
    out.children = [];
    for (const ch of (node.children || [])) out.children.push(await this._inlineAssets(ch, zip));
    return out;
  },

  import() {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = '.zip,.json';
    inp.onchange = async e => {
      const file = e.target.files[0]; if (!file) return;
      try {
        let prefab;
        if (file.name.toLowerCase().endsWith('.zip')) {
          if (typeof JSZip === 'undefined') { log('❌ JSZip yuklanmagan', 'le'); return; }
          const zip  = await JSZip.loadAsync(await file.arrayBuffer());
          const jf   = zip.file('apex-file.json') || zip.file('prefab.json');
          if (!jf) throw new Error('ZIP ichida apex-file.json topilmadi');
          const man  = JSON.parse(await jf.async('string'));
          const ver  = man.version || 3;

          // ⚠ IKKI XIL FORMAT — eskisini tashlab yubormaymiz.
          //   v4+ : `AssetBundle` havolalari (`apexasset:…`) — hamma
          //         tur papkaga chiqqan.
          //   v3- : faqat `Models/` va `Textures/` — qo'lda yozilgan
          //         ikkita maydon. Eski prefablar do'stlarda va eski
          //         loyihalarda qolgan, ular ochilishi SHART.
          let tree;
          if (ver >= 4 && window.AssetBundle) {
            await AssetBundle.resolve(man, zip);
            tree = man.data || man;
          } else {
            tree = await this._inlineAssets(man.data || man, zip);
          }

          prefab = {
            id: Date.now(),
            name: man.name || file.name.replace(/\.zip$/i, '').replace(/^apex-prefab-/i, ''),
            icon: man.icon || '🧱',
            created: man.created || new Date().toLocaleDateString(),
            apexPrefab: true, version: ver, data: tree,
            timeline: man.timeline || null,   // ⏱ animatsiyalar
          };
        } else {
          prefab = JSON.parse(await file.text());
          if (!prefab.data || !prefab.name) throw new Error('Noto\'g\'ri format');
          prefab.id = Date.now();
        }
        const list = this.load(); list.push(prefab);
        this.save(list); this.saveToDisk(prefab); prefabRenderList();
        log(`📥 "${prefab.name}" import qilindi`, 'lok');
      } catch (err) { log('❌ Prefab import xatosi: ' + err.message, 'le'); }
    };
    inp.click();
  },
};

window.PrefabSystem        = PrefabSystem;

// 📥 Dastur ochilganda `prefabs/` papkasini o'qiymiz.
//  ⚠ Kechikish bilan: `JSZip` va `AssetBundle` skript teglari
//    ketma-ket yuklanadi, darhol chaqirsak ular hali yo'q bo'lardi.
// ⚠ `typeof setTimeout` ham tekshiriladi: bu fayl testlarda
//   `vm` ichida ham yurgiziladi va u yerda taymer yo'q.
if (typeof document !== 'undefined' && typeof setTimeout === 'function') {
  const _pfBoot = () => setTimeout(() => { try { PrefabSystem.syncFromDisk(); } catch (e) {} }, 400);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', _pfBoot);
  else _pfBoot();
}
window.prefabSaveSelected  = () => PrefabSystem.saveFromSelected();
window.prefabExportSelected= () => PrefabSystem.exportSelected();
window.prefabImport        = () => PrefabSystem.import();

function prefabRenderList() {
  const container = $('prefab-list'); if (!container) return;
  const list = PrefabSystem.load();
  if (!list.length) {
    container.innerHTML = `<div style="font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--muted);padding:12px;text-align:center;line-height:1.8">Hali prefab yo'q.<br>Objectni tanlang → 💾 Prefab saqlash</div>`;
    return;
  }
  container.innerHTML = '';
  list.forEach(p => {
    const e = p.data?.entity || {};
    const badge = e.isPlayer ? '<span style="font-size:7px;color:var(--accent);border:1px solid rgba(var(--accent-rgb),.4);border-radius:2px;padding:0 3px">OYINCHI</span>'
                : e.isCar    ? '<span style="font-size:7px;color:#00ffcc;border:1px solid rgba(0,255,204,.4);border-radius:2px;padding:0 3px">AVTO</span>' : '';
    const hasModel = !!(p.data?.modelB64);
    const hasTex   = !!(p.data?.textureB64);
    const item = document.createElement('div');
    item.classList.add('asset-lib-item');
    item.onmouseenter = () => item.style.borderColor = '#ffcc00';
    item.onmouseleave = () => item.style.borderColor = 'var(--border)';
    item.innerHTML = `
      <span style="font-size:18px;flex-shrink:0">${p.icon||'🧱'}</span>
      <div style="flex:1;min-width:0">
        <div style="font-family:'Share Tech Mono',monospace;font-size:11px;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${p.name} ${badge}</div>
        <div style="font-size:8px;color:var(--muted)">${p.created||''} · ${(p.data?.children?.length||0)} bola${hasModel?' · 🧊model':''}${hasTex?' · 🖼tex':''}</div>
      </div>
      <div style="display:flex;gap:2px;flex-shrink:0">
        <button title="Sahnaga qo'sh" onclick="PrefabSystem.spawn(${p.id});event.stopPropagation()" style="background:rgba(255,204,0,.12);border:1px solid rgba(255,204,0,.35);color:#ffcc00;font-size:11px;padding:2px 6px;border-radius:2px;cursor:pointer;font-weight:700">+</button>
        <button title="ZIP eksport (Models/Textures/apex-file.json)" onclick="PrefabSystem.exportOne(${p.id});event.stopPropagation()" style="background:none;border:1px solid var(--border);color:var(--muted);font-size:10px;padding:2px 5px;border-radius:2px;cursor:pointer">⬇</button>
        <button title="O'chirish" onclick="PrefabSystem.delete(${p.id});event.stopPropagation()" style="background:none;border:1px solid var(--border);color:var(--muted);font-size:10px;padding:2px 5px;border-radius:2px;cursor:pointer">✕</button>
      </div>`;
    item.onclick = () => PrefabSystem.spawn(p.id);
    container.appendChild(item);
  });
}

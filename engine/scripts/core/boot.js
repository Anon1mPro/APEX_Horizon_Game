// ============================================================
//  🚀 BOOT — dvigatelni ISHGA TUSHIRISH (index.html dagi OXIRGI skript)
// ------------------------------------------------------------
//  ⚠ NEGA ALOHIDA FAYL: bu uch qator ilgari `prefab.js` ning oxirida
//    turardi — nomi va izohi ("ANIMATE LOOP additions") bilan
//    aloqasiz joyda. Muammolari:
//      • `prefab.js` dan keyin yana 13 ta skript yuklanadi (scene-manager,
//        camera-rig, bone-system ...). `initScene()` ular e'lon qilinmasdan
//        OLDIN ishlardi;
//      • `prefab.js` da istalgan xato (yoki uni testda yuklash) dvigatelni
//        ishga tushirishni ham jimgina to'xtatardi.
//    Endi hamma skript yuklangach, bitta aniq joyda ishga tushadi.
//
//  ⚠ `_sceneModified` NI TIKLASH SHART: `camera-preview.js` yuklanganda
//    `updateHierarchy` ni o'rab oladi va har chaqiruvda bu bayroqni
//    yoqadi (brauzer yopilganda "saqlanmagan o'zgarish" ogohlantirishi
//    uchun). Ilgari `initScene()` o'rashdan OLDIN ishlagani uchun toza
//    sahnada bayroq `false` edi. Endi u o'rashdan KEYIN ishlaydi — bayroq
//    tiklanmasa, yangi ochilgan bo'sh sahna ham "o'zgargan" bo'lardi.
// ============================================================
initScene();
if (typeof _sceneModified !== 'undefined') _sceneModified = false;
animate();
log('Ctrl+S=saqlash | Ctrl+D=nusxa | F=fokus | Del=o\'chir | Ctrl+Z=undo | Ctrl+Y=redo', 'lw');
log('📦 GLB/GLTF import: yuqoridagi Import tugmasi yoki viewport ga tashlang', 'lok');
log('🎯 Gizmo: Q=tanlash W=ko\'chirish E=aylantirish R=o\'lcham | Ctrl+P=screenshot', 'lok');
// Eng OXIRGI yuklanadigan skript sifatida "hammasi yuklandi" xabarini ham shu yerda beradi
// (ilgari `anim-diag.js` oxirida edi). `tests/test-no-joints.js` shuni qo'riqlaydi.
log('🚀 Barcha sistemalar yuklandi: Scene | PBR/HDR | Assets | Editor | Physics', 'lok');

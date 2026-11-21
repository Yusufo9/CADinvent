# 7. Küçük sözlük ve alıştırmalar

Bu bölümdeki terimleri ilk okuyuşta ezberlemen gerekmez. Kodda gördükçe geri dön. Amaç, bir yabancı kelimeyi “bu ne işe yarıyor?” diye sormaktan çekinmemek.

## 7.1 Sözlük

| Kelime | Çocukça basit açıklama | CADinvent örneği |
| --- | --- | --- |
| Kaynak kod | Programın yapım tarifi | [src/App.tsx](../src/App.tsx) |
| Derleme / build | Tarifi çalışabilir pakete dönüştürme | `pnpm build` → `build/web/` |
| Bağımlılık | Başkasının hazırladığı, kullandığın araç kutusu | React, Three.js, fflate |
| Bileşen / component | Ekranın tekrar kullanılabilir parçası | [CategoryRow.tsx](../src/components/CategoryRow.tsx) |
| State / durum | Ekranın o andaki bilgisi | Hangi sekme seçili? |
| Hook | React durumuna/yaşam döngüsüne bağlanan işlev | [useWorkspaces.ts](../src/hooks/useWorkspaces.ts) |
| Tip / interface | Verinin hangi alanları taşıyacağını söyleyen şablon | [types.ts](../src/types.ts) içindeki `Part` |
| ID | Aynı adlı şeyleri bile ayıran kimlik | Parçanın `id` değeri |
| Worker | Ağır işi ekrandan ayrı yapan yardımcı iş parçacığı | [mesh.worker.ts](../src/lib/mesh.worker.ts) |
| Mesh | Üçgenlerden oluşan 3B yüzey | STL modelin görünür geometrisi |
| Renderer | 3B veriyi ekranda görüntüye dönüştüren parça | [rendering.ts](../src/lib/rendering.ts) |
| WebGL | Tarayıcıda GPU yardımıyla çizim tekniği | 3B inceleme penceresi |
| IndexedDB | Tarayıcının yerel veri dolabı | Kaydedilen çalışma alanları ve modeller |
| ZIP manifesti | Paketin içindekileri açıklayan liste | `workspace.json` |
| SHA-256 | Dosya değişmiş/bozulmuş mu diye bakılan özet | ZIP'teki model dosyası denetimi |
| Test | Bir davranışı otomatik kontrol eden örnek | [archive.test.ts](../src/lib/archive.test.ts) |
| Git | Dosya değişikliklerini kayıt altına alan sistem | `git diff`, `git commit` |
| Commit | Yerel kayıt noktası | “Kategori silme davranışını değiştir” kaydı |
| Remote | Başka yerdeki Git deposu adresi | İleride GitHub URL'i |
| Push | Yerel commit'leri remote'a gönderme | Bu belge hazırlanırken yapılmadı |
| Release | Kullanıcılara sunulan sürüm ve paketler | İleride taşınabilir ZIP/TAR paketi |

## 7.2 Alıştırma 1: Ekrandaki bir yazıyı bul

VSCodium'da **Ctrl+Shift+F** ile `Add models` ara. Sonuç [App.tsx](../src/App.tsx) içinde olmalı. Etrafına bak: düğme neden sadece workspace sekmesinde görünüyor? `tab === "workspace"` koşulunu bul. Cevap: koşul yanlışsa bu bölüm ekrana çizilmiyor. Tek bir koşul bir düğmenin yerini/varlığını belirleyebilir.

## 7.3 Alıştırma 2: Yeni modelin ilk kategorisi

`importFiles` işlevinde oluşturulan `Part` nesnesini bul. `categoryId` değerini oku. Sonra [categories.ts](../src/lib/categories.ts) içindeki `matchesView` ile hangi sekmede görüneceğini tahmin et. **Beklenen sonuç:** `unclassified` kimliği verilir; Unclassified sekmesinde görünür, All Parts'te görünmez.

## 7.4 Alıştırma 3: Bir kategori silinince ne olur?

[App.tsx](../src/App.tsx) içinde `deleteCategory` işlevini bul. [categories.ts](../src/lib/categories.ts) içindeki `deletionDestination` ve `removeCategory` işlevlerine git. **Beklenen sonuç:** Standart kategori kaldırılır, parçalarının `categoryId` değeri `Unclassified` olur; özgün disk dosyaları silinmez. `Unclassified` kategorisi silinemez.

## 7.5 Alıştırma 4: Kod nerede, veri nerede?

`src/`, `build/`, Firefox IndexedDB ve `.git/` için ayrı birer cümle yaz. Sonra [ilk rehberdeki tabloyla](01-yazilimi-tanima.md#12-projenin-calismasini-en-distan-izle) karşılaştır. **Kontrol cevabı:** Kaynak `src/` içindedir; üretilmiş program `build/` içindedir; kişisel modeller tarayıcı IndexedDB'sindedir; kaynak değişikliği geçmişi `.git/` içindedir.

## 7.6 Alıştırma 5: GitHub'a ne gider?

Terminalde `git ls-files` çalıştır ve `src/App.tsx`, `package.json`, `pnpm-lock.yaml` dosyalarını listede bul. `build/web/index.html` veya kişisel bir çalışma alanı ZIP'i listede olmamalı. `git status --ignored --short` ile niçin yok sayıldıklarını incele. **Kontrol cevabı:** Kaynak ve kilit dosyası yeniden derleme için gerekir; `build/` üretilir, model ZIP'i kişisel veri olabilir.

## 7.7 Alıştırma 6: ZIP'i düşünceyle aç

Bir yedekte üç parça olduğunu varsay. [backup.ts](../src/lib/backup.ts) içinde `models/${i}.${part.format.toLowerCase()}` satırını bul. ZIP içinde kaç model yolu olur? [archive.ts](../src/lib/archive.ts) içindeki manifest bölümlerini say. **Beklenen sonuç:** `models/0...`, `models/1...`, `models/2...` olmak üzere üç model; ayrıca kökte `workspace.json` ve `models/` dizini. Dosya adları manifestin `name` alanındadır.

## 7.8 Kendi başına araştırma şablonu

Yeni bir istek geldiğinde şu boşlukları doldur:

```text
Kullanıcı ne yapıyor?                 ______________________
Ekrandaki ilk düğme/metin nerede?     ______________________
Hangi işlev çağrılıyor?              ______________________
Veri tipi hangi dosyada?             ______________________
Kalıcı kayıt değişiyor mu?           ______________________
İlgili test var mı?                  ______________________
Değişikliği nasıl elle denerim?      ______________________
Git farkında hangi dosyalar var?     ______________________
```

Bu formu kullanarak her yeni özelliği küçük bir yolculuğa dönüştürebilirsin. Kod tabanı büyük görünse de bir kullanıcı hareketi genellikle birkaç dosya arasında ilerler.

## 7.9 Sonraki öğrenme sırası

Önce yalnızca [App.tsx](../src/App.tsx) içindeki metin ve düğmeleri tanı. Sonra [types.ts](../src/types.ts) ile `Part`/`Category` ilişkisini öğren. Ardından [categories.ts](../src/lib/categories.ts) gibi küçük saf işlevleri oku. Depolama ve ZIP akışını en son derinlemesine incele. Bir konuyu öğrendiğini anlamanın ölçüsü, dosya adını ezberlemek değil, “bu davranışı değiştirmek için nereden başlarım ve nasıl doğrularım?” sorusuna cevap verebilmendir.

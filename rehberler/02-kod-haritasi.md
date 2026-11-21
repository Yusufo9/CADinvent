# 2. Kod haritası: ekrandan dosyaya

Bu rehber bir şehir haritası gibi kullanılabilir. Önce ana caddeleri öğren: [main.tsx](../src/main.tsx) uygulamayı başlatır, [App.tsx](../src/App.tsx) kullanıcı hareketlerini birleştirir, [types.ts](../src/types.ts) veri şekillerini tanımlar. Sonra ihtiyacın olan sokağa, yani bileşene veya `lib` işlevine gir.

## 2.1 Uygulama nereden başlıyor?

Tarayıcı [index.html](../index.html) dosyasını açar. Oradaki kök elemana [main.tsx](../src/main.tsx), React `App` bileşenini bağlar ve [styles.css](../src/styles.css) yüklenir. React `StrictMode` geliştirme sırasında bazı yaşam döngüsü davranışlarını tekrar çalıştırarak sorunları görünür kılabilir. Ekrandaki büyük yapı [App.tsx](../src/App.tsx) içindedir.

```text
index.html
  └─ src/main.tsx
       ├─ src/styles.css
       └─ src/App.tsx
            ├─ src/hooks/useWorkspaces.ts
            ├─ src/components/*
            └─ src/lib/*
```

## 2.2 Veri nasıl şekilleniyor?

[types.ts](../src/types.ts) içindeki tipleri kutu etiketleri gibi düşün:

| Tip | İçerik | Örnek kullanım |
| --- | --- | --- |
| `Category` | Kimlik, ad, renk, kapalı/açık durumu, All Parts'e katılma ve favori bilgisi | “Brackets” rafı |
| `Part` | Kimlik, dosya adı, kategori kimliği, format, boyut, üçgen sayısı, ölçüler, küçük resim, tarih ve favori | Bir STL kartı |
| `Library` | Kategoriler ve parçalar | Tek çalışma alanının koleksiyonu |
| `Workspace` | `Library` + çalışma alanı kimliği/adı/oluşturulma tarihi | “Personal workspace 1” |
| `WorkspaceState` | Aktif çalışma alanı kimliği ve bütün çalışma alanları | Uygulamanın kalıcı üst düzey durumu |
| `MeshData` | Üçgen pozisyonları, normaller, ölçüler ve üçgen sayısı | Görüntüleme için işlenmiş 3B veri |

`categoryId` ilişki kurar: bir `Part`, ait olduğu `Category` kaydının `id` değerini taşır. Kategorinin adını değiştirmek parçaların bütün kayıtlarını değiştirmeyi gerektirmez. Kimlikler çoğunlukla `crypto.randomUUID()` ile oluşturulur. `Unclassified` kategorisinin sabit kimliği `unclassified` olduğu için kod onu özel olarak tanıyabilir.

`defaultCategories` yalnızca `Unclassified` içerir. Yeni bir çalışma alanı örnek kategorilerle doldurulmaz. `thumbnail` küçük resim verisidir; asıl dosyanın yerini tutmaz. Kaynak model dosyası IndexedDB'deki ayrı `files` deposundadır.

## 2.3 Ekran parçaları

| Dosya | Görev | Burada neyi değiştirirsin? |
| --- | --- | --- |
| [App.tsx](../src/App.tsx) | Üst çubuk, sekmeler, arama/filtre, işlemlerin koordinasyonu | Düğme yeri, sekme sırası, olay akışı |
| [WorkspacePicker.tsx](../src/components/WorkspacePicker.tsx) | Navbar çalışma alanı menüsü | Oluşturma, seçme, ad değiştirme ve silme menüsünün görünümü |
| [CategoryRow.tsx](../src/components/CategoryRow.tsx) | Kategori başlığı ve yatay kart rafı | Kart, yıldız, ±, sürükle-bırak, kategori seçimi |
| [Inspector.tsx](../src/components/Inspector.tsx) | Büyük 3B inceleme penceresi | Kamera, orbit, pan, zoom, wireframe, kaynak indirme |
| [ConfirmDialog.tsx](../src/components/ConfirmDialog.tsx) | Onay penceresi | Çalışma alanı silme onayı |
| [styles.css](../src/styles.css) | Renk, boşluk, boyut, yatay kaydırma, duyarlı ekran | Görsel düzen |

`Inspector` [App.tsx](../src/App.tsx) içinde `lazy(...)` ile yüklenir. Bu, inceleme penceresinin kodunu kullanıcı onu açana kadar başlangıç paketinden ayırır. Kategori kartları sürekli ayrı 3B sahneler çalıştırmaz; hazırlanmış küçük resimleri gösterir.

## 2.4 Durum ve iş kuralları

**Durum**, ekranda o anda seçilmiş veya değişmiş bilgi demektir. [App.tsx](../src/App.tsx) içinde `tab`, `query`, `sort`, `format`, `selected`, `active`, `busy`, `notice` gibi geçici ekran durumları vardır. `query` arama yazısıdır; `active` açık inceleme penceresindeki parça kimliğidir. Bunların hepsi kalıcı dosya verisi değildir.

[useWorkspaces.ts](../src/hooks/useWorkspaces.ts) kalıcı çalışma alanı durumunun kapısıdır. Açılışta [storage.ts](../src/lib/storage.ts) üzerinden tarayıcı verisini okur. Bir değişiklikte `setLibrary` yalnızca etkin çalışma alanını günceller. Yazmaları bir Promise zincirinde sıraya koyar; böylece peş peşe gelen durum değişimleri sırayla kaydedilir. `saveStatus` alt çubukta “Saving…” veya “Saved on this device” gibi görünür.

[workspaces.ts](../src/lib/workspaces.ts) ekran çizmez. Yeni çalışma alanı oluşturma, ada çakışma varsa `(2)` benzeri ek ekleme, yalnızca hedef çalışma alanını değiştirme ve son çalışma alanının silinmesini engelleme gibi saf iş kurallarını tutar. Bu ayrım, mantığı bileşenden bağımsız test etmeyi kolaylaştırır.

[categories.ts](../src/lib/categories.ts) şu sorulara cevap verir:

- Kategori **All Parts** içine girer mi? `includedInAll` `Unclassified` için her zaman `false` döndürür.
- Parça hangi görünümde görünür? `matchesView` All Parts, workspace, Unclassified ve Favorites kurallarını uygular.
- Kategori silinirse parçalar nereye gider? `deletionDestination` normalde `Unclassified` seçer; `removeCategory` parçaları koruyarak oraya taşır.
- Yeni parça eklenirken `Unclassified` kaydı eksikse ne olur? `addImportedPart` bu kaydı onarır.

Kullanıcının “± düğmesinin davranışı” gibi bir talebi varsa önce [CategoryRow.tsx](../src/components/CategoryRow.tsx) içinde düğmenin olayını, sonra [App.tsx](../src/App.tsx) içindeki `onToggleInclude` benzeri bağlantıyı, en son [categories.ts](../src/lib/categories.ts) içindeki görünüm kuralını izle.

## 2.5 Sekme ve kategori mantığı

Sekme sırası [App.tsx](../src/App.tsx) içindeki JSX'de: **All Parts → her çalışma alanı için bir sekme → Unclassified → Favorites**. Çalışma alanı sekmeleri `workspaces.map(...)` ile çoğalır. Sekmelerin hepsi her zaman ayrı çalışma alanı verisi göstermez: All Parts, Unclassified ve Favorites o anda etkin çalışma alanı üzerinde filtre görevi görür. Başka bir workspace sekmesine basınca etkin çalışma alanı da değişir.

`Unclassified` yalnızca kendi sekmesinde gösterilir; silinemez ve ± düğmesi yoktur. Yeni STL/OBJ/PLY modelleri önce buraya eklenir. Normal kategoriler workspace sekmesinde görünür. **Add categories** ve **Add models** burada bulunur. Bir kategori yıldızlanınca onun parçaları Favorites içinde görünür; tekil parça yıldızı da korunur. `±`, normal kategorinin All Parts görünümüne girip girmediğini kontrol eder.

Kategori çöp kutusu [App.tsx](../src/App.tsx) içinde `deleteCategory` çağırır ve ayrıca onay istemez. Parçalar silinmez, `Unclassified` içine taşınır. Çalışma alanının silinmesi farklıdır: navbar menüsünden gelen istek `ConfirmDialog` açar; yalnızca en az iki çalışma alanı varsa mümkündür ve o çalışma alanının tarayıcıdaki kaynak kopyalarını da siler. Bu iki işlemin sonuçları farklı olduğundan karıştırma.

## 2.6 `lib` klasörünün tamamı

| Dosya | Görev |
| --- | --- |
| [importer.ts](../src/lib/importer.ts) | Dosya türünü ve boyutunu kontrol edip ayrıştırma worker'ını başlatır. |
| [mesh.worker.ts](../src/lib/mesh.worker.ts) | 3B dosya ayrıştırmasını ana ekran iş parçacığı dışında çalıştırır. |
| [parser.ts](../src/lib/parser.ts) | STL/OBJ/PLY yükleyicileri, geometri birleştirme ve doğrulama. |
| [rendering.ts](../src/lib/rendering.ts) | Küçük 3B görselleri üretir ve renderer kaynaklarını serbest bırakır. |
| [storage.ts](../src/lib/storage.ts) | IndexedDB'de çalışma alanı verisi ve ayrı kaynak dosyaları. |
| [categories.ts](../src/lib/categories.ts) | Kategori filtreleme ve silme kuralları. |
| [workspaces.ts](../src/lib/workspaces.ts) | Çalışma alanı oluşturma, adlandırma ve seçme kuralları. |
| [backup.ts](../src/lib/backup.ts) | ZIP yedeğini hazırlama ve geri kurma akışı. |
| [archive.ts](../src/lib/archive.ts) | ZIP manifest biçimi, sınırlar, yol ve sağlama toplamı doğrulaması. |
| [archive.worker.ts](../src/lib/archive.worker.ts) | ZIP sıkıştırma/açma işini ana ekrandan ayırır. |
| [export.ts](../src/lib/export.ts) | Tarayıcıda Blob indirmesini tetikler. |
| [legacySamples.ts](../src/lib/legacySamples.ts) | Eski kayıtlarla uyumluluk için örnek geometri. |
| [sampleExport.ts](../src/lib/sampleExport.ts) | Eski örnek parçayı yedeklerken STL'ye dönüştürür. |

`legacySamples` ve `sampleExport` dosyalarının varlığı, güncel arayüzde “örnek kütüphane yükle” düğmesi bulunduğu anlamına gelmez. Eski kullanıcı verisinin okunabilmesi için tutulmuşlardır.

## 2.7 Bir düğmenin izini sürme: Export

1. [App.tsx](../src/App.tsx) içinde görünen `Export` düğmesi önce küçük menüyü açar.
2. Menüdeki `Export Workspace`, `exportWorkspace()` işlevini çağırır.
3. `exportWorkspace`, [backup.ts](../src/lib/backup.ts) içindeki `createBackup` işlevini gerektiğinde dinamik olarak yükler.
4. `createBackup`, [storage.ts](../src/lib/storage.ts) içinden özgün model dosyalarını okur, [archive.ts](../src/lib/archive.ts) ile manifest ve SHA-256 üretir.
5. [archive.worker.ts](../src/lib/archive.worker.ts) ZIP'i hazırlar.
6. [export.ts](../src/lib/export.ts) tarayıcı indirmesini başlatır.

Bu zincirde menü metnini değiştirmek istersen `App.tsx`; ZIP biçimini değiştirmek istersen `archive.ts`; indirmenin tetiklenişini değiştirmek istersen `export.ts` başlangıç yeridir.

## 2.8 Testleri nereye bakarak okurum?

[parser.test.ts](../src/lib/parser.test.ts) model ayrıştırmayı, [archive.test.ts](../src/lib/archive.test.ts) ZIP biçimi ve doğrulamayı, [categories.test.ts](../src/lib/categories.test.ts) kategori kurallarını, [workspaces.test.ts](../src/lib/workspaces.test.ts) çalışma alanı kurallarını kontrol eder. [tests/fixtures/](../tests/fixtures) içindeki küçük OBJ/STL örnekleri, testin gerçek dosyayla davranmasını sağlar. [portable/main_test.go](../portable/main_test.go) Go sunucusunu sınar. Testler bir özelliğin beklenen davranışını öğrenmek için de iyi okuma malzemesidir.

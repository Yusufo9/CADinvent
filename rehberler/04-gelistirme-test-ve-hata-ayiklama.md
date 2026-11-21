# 4. VSCodium'da geliştirme, test ve hata ayıklama

Bir yazılımı anlamanın en iyi yolu küçük, geri alınabilir bir değişiklik yapıp etkisini görmektir. Buradaki komutları proje klasöründe çalıştır. Windows PowerShell örnekleri kullanılıyor; VSCodium'un **Terminal → New Terminal** menüsü yeterli.

## 4.1 Önce nerede olduğunu kontrol et

```powershell
Get-Location
git status
```

Konum `CADinvent` olmalı. `git status`, hangi dalda olduğunu ve değiştirilmiş dosyaları gösterir. Daha önceki işi yanlışlıkla üzerine yazmamak için bu iki bilgiyi ilk kontrol olarak alışkanlık edin. Soldaki Explorer'da `build/` görünmeyebilir; [.vscode/settings.json](../.vscode/settings.json) üretilmiş klasörleri görüntüden saklar. Dosyalar diskte yine bulunabilir.

## 4.2 İlk çalıştırma

Geliştirme için Node.js 22+ ve bu projenin [package.json](../package.json) dosyasında belirtilen pnpm sürümü gerekir. `pnpm` komutu bulunmuyorsa Node/Corepack kurulumunu kontrol et. Depo kökünde:

```powershell
pnpm install --frozen-lockfile
pnpm dev
```

Terminal Vite adresini yazar; bu projede varsayılan `http://127.0.0.1:5173/` adresidir. Firefox'ta açabilirsin. Terminal açık kaldığı sürece sunucu çalışır. `src/` içindeki bir dosyayı kaydedince Vite çoğu değişikliği tarayıcıya hızla yansıtır. Durdurmak için terminalde **Ctrl+C**.

VSCodium **Terminal → Run Task** içinde [.vscode/tasks.json](../.vscode/tasks.json) görevleri vardır: geliştirme sunucusu, Firefox'ta taşınabilir uygulama, web derlemesi, taşınabilir derleme ve testler. Terminal komutlarıyla aynı işi görür; önce komutu anlayıp sonra görev kısayolunu kullanmak öğrenmeyi kolaylaştırır.

## 4.3 Kaynak ile derlemeyi ayrı tut

Şu örneği düşün: [src/styles.css](../src/styles.css) içindeki renk kodunu değiştirdin. `pnpm build` çalışınca Vite yeni CSS üretip `build/web/` içine yazar. Sonra `build/web/assets/...css` dosyasını düzenlersen değişiklik bir sonraki derlemede kaybolur. Bu yüzden düzeltme her zaman **kaynakta** yapılır.

```powershell
pnpm test
pnpm build
pnpm preview
```

`pnpm test` Vitest testlerini çalıştırır. `pnpm build` önce TypeScript denetimini, sonra Vite derlemesini, ardından üçüncü taraf bildirim üretimini yapar. `pnpm preview` `build/web/` çıktısını yerelde sunar. Bunlar GitHub'a göndermez. Testler tüm arayüzü otomatik tıklamaz; özellikle görsel değişiklikte tarayıcı kontrolü de gerekir.

## 4.4 Taşınabilir sürüm ne zaman gerekli?

Web uygulamasını düzenlemek için Go bilmen gerekmez. Başlatıcının portu, tarayıcı açma davranışı veya paketlemesi değişecekse [portable/main.go](../portable/main.go) ve [scripts/](../scripts) klasörüne bak. Go 1.23+ ile yaklaşık akış:

```powershell
pnpm build
pnpm portable:prepare
Push-Location portable
go test ./...
Pop-Location
pnpm portable:build
```

İlk komut `build/web/` üretir. `portable:prepare`, bu statik dosyaları `build/launcher/` altındaki geçici Go derleme alanına kopyalar. `portable:build` çalıştırılabilir dosyayı `build/releases/` içine koyar. Kullanıcıya dağıtılan program tarayıcıyı yanında taşımaz; mevcut tarayıcıyı açar. Ayrıntı için [docs/PORTABLE.md](../docs/PORTABLE.md).

## 4.5 İlk güvenli değişiklik alıştırması

Örnek olarak giriş başlığını değiştirmek istediğini varsay:

1. VSCodium'da **Ctrl+Shift+F** ile ekrandaki metni ara: `A place for every part.`
2. [App.tsx](../src/App.tsx) içindeki ilgili JSX'i bul.
3. Yalnızca metni değiştir; etrafındaki `<h1>` etiketlerini bozma.
4. `pnpm dev` açıkken Firefox sayfasını kontrol et.
5. Terminalde `git diff -- src/App.tsx` çalıştır; değiştirdiğin satırları gör.
6. İstemediysen `git restore -- src/App.tsx` ile bu **kaydedilmemiş Git değişikliğini** geri al. Bu komut dosyadaki yerel değişiklikleri siler; önce `git diff` ile neyi kaybedeceğini gör.

Sonra bir kategori davranışını değiştirmeyi dene: önce [categories.test.ts](../src/lib/categories.test.ts) içindeki beklenen davranışı oku, [categories.ts](../src/lib/categories.ts) işlevini bul, küçük bir değişiklik yap, `pnpm test` çalıştır. Böylece ekran, mantık ve test arasındaki bağı görürsün.

## 4.6 Hata bulma yöntemi

“Çalışmıyor” çok geniş bir tanımdır. Sorunu küçük cümleye indir: “OBJ dosyası seçince kart gelmiyor” veya “Workspace ZIP içe aktarılınca kategori boş görünüyor.” Sonra şu sırayı izle:

1. **Tekrar üret.** Hangi düğme, hangi dosya, hangi tarayıcı, hangi adres? Aynı adımlar aynı hatayı veriyor mu?
2. **Ekrandaki mesajı yaz.** Toast, hata listesi ve alt çubuktaki `Saved on this device` durumu önemli.
3. **Tarayıcı konsoluna bak.** Firefox'ta F12 → Console. Dosya/işlev ve satır bilgisi olabilir. Kişisel CAD içeriğini kamuya açık hata raporuna yapıştırma.
4. **Akışın girişini bul.** `Add models` için `importFiles`, ZIP için `importWorkspace`, kategori silmek için `deleteCategory`.
5. **Sorunun katmanını ayır.** Dosya seçimi mi, ayrıştırma mı, render mı, IndexedDB kaydı mı, filtre mi? Örneğin `Part` kaydı var ama görünmüyorsa [categories.ts](../src/lib/categories.ts) filtresine bak.
6. **İlgili testi çalıştır.** `pnpm test`. Hata yalnızca belli bir dosyada ise küçük, paylaşılabilir bir test fikstürü oluştur.
7. **Düzeltmenin farkını oku.** `git diff` gereksiz satır değişikliği yapıp yapmadığını gösterir.

Bir değişiklikten sonra hem `pnpm test` hem `pnpm build` çalıştırmak, mantık testleri ile TypeScript/derleme hatalarını ayrı ayrı yakalar. Görsel davranış için Firefox'ta kısa bir gerçek kullanım kontrolü yap. Her değişiklik için gereksiz büyük test düzeni kurmana gerek yok.

## 4.7 Sık görülen belirtiler

| Belirti | İlk kontrol |
| --- | --- |
| `pnpm` tanınmıyor | Node/Corepack/pnpm kurulumu ve yeni terminal açılması |
| Port 5173 dolu | Çalışan eski geliştirme sunucusu var mı? Vite strict port ayarı [vite.config.ts](../vite.config.ts) içinde. |
| Firefox'taki parçalar başka tarayıcıda yok | IndexedDB tarayıcı/profil/adrese özeldir. ZIP dışa/içe aktar. |
| `build/web` değişiyor ama kaynak değişmiyor | Derlemeyi düzenliyorsun; [src/](../src) içinde değişiklik yap. |
| STEP/IGES açılmıyor | Şu an desteklenen yeni model biçimleri STL/OBJ/PLY. |
| Kart var ama 3B pencere açılmıyor | F12 Console, kaynak dosyanın IndexedDB'de bulunması ve [Inspector.tsx](../src/components/Inspector.tsx) akışı. |
| ZIP içe aktarma reddediliyor | ZIP kökünde `workspace.json`, `models/` ve geçerli model/checksum var mı? [archive.ts](../src/lib/archive.ts) hata mesajına bak. |
| Kaydetme durumu hata gösteriyor | Tarayıcı kota/özel mod/izinleri; veriyi yedeklemeyi dene. |

## 4.8 Bir değişikliği bitirme kontrolü

```powershell
git diff --check
pnpm test
pnpm build
git status
```

`git diff --check` boşluk/satır sonu gibi basit fark sorunlarını yakalar. Test ve build geçse bile kullanıcı akışını elle dene. Son `git status` ile kaynak dışında yanlışlıkla dosya ekleyip eklemediğini gör. Git komutlarını ayrıntılı anlamak için [sonraki rehber](05-git-sifirdan.md).

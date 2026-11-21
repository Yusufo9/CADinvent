# CADinvent kodunu düzenleme rehberi

**Düzenleyeceğin dosyalar `src/` içinde. `build/` içindeki dosyaları düzenleme.**

## Klasör düzeni

```text
CADinvent/
├── src/                   Web uygulamasının kaynak kodu
│   ├── main.tsx            React uygulamasını başlatır
│   ├── App.tsx             Ana ekran, kütüphane durumu ve işlemler
│   ├── styles.css          Görünüm, renkler, ölçüler ve mobil düzen
│   ├── types.ts            Part, Category, Library veri tipleri
│   ├── components/
│   │   ├── CategoryRow.tsx Kategori başlığı ve yatay parça kartları
│   │   └── Inspector.tsx   Büyük 3B inceleme penceresi
│   └── lib/               Dosya okuma, çizim, saklama ve dışa aktarma
├── portable/              Küçük Go başlatıcının kaynak kodu
├── scripts/               Derleme ve paket hazırlama betikleri
├── tests/fixtures/        İçe aktarma test dosyaları
├── docs/                  Kullanım ve geliştirme belgeleri
├── .github/workflows/     GitHub test/dağıtım iş akışı
├── .vscode/               VSCodium görevleri ve görünüm ayarları
├── package.json           Bağımlılıklar ve çalıştırma komutları
├── vite.config.ts         Geliştirme sunucusu ve derleme ayarları
└── build/                 ÜRETİLEN DOSYALAR — Git'e eklenmez
    ├── web/               Derlenmiş HTML, CSS ve JavaScript
    ├── launcher/          Paketleme için geçici Go/arayüz kopyaları
    ├── releases/          Dağıtılacak çalıştırılabilir dosyalar ve ZIP'ler
    ├── cache/             Derleme önbelleği
    └── tools/             Bu bilgisayardaki isteğe bağlı derleme araçları
```

`node_modules/` indirilmiş bağımlılıklardır; uygulama kaynak kodun değildir. `build/` ve `node_modules/`, VSCodium dosya ağacında ve aramada gizlidir. Gerektiğinde `.vscode/settings.json` içindeki `files.exclude` ayarını değiştirebilir veya dosya yöneticisinden açabilirsin.

## Hangi değişiklik hangi dosyada?

| Yapmak istediğin değişiklik | Başlangıç dosyası |
| --- | --- |
| Renkler, boşluklar, yazı boyutları, kart ölçüleri | `src/styles.css` |
| Üst menü, arama, filtreler, kategori oluşturma, genel ekran | `src/App.tsx` |
| Kategori aç/kapat, kartlar, seçim, sürükleme | `src/components/CategoryRow.tsx` |
| 3B inceleme penceresi ve kontrolleri | `src/components/Inspector.tsx` |
| Önizleme kamerası, ışıklar ve malzeme | `src/lib/rendering.ts` |
| STL/OBJ/PLY okuma | `src/lib/parser.ts` |
| Worker ve içe aktarma sınırları | `src/lib/importer.ts`, `src/lib/mesh.worker.ts` |
| Tarayıcıya kayıt | `src/lib/storage.ts` |
| Workspace menüsü, oluşturma, ad değiştirme, silme | `src/components/WorkspacePicker.tsx`, `src/hooks/useWorkspaces.ts` |
| Kategorilerin All Parts ve Favorites davranışı | `src/lib/categories.ts` |
| ZIP yedekleme ve geri yükleme | `src/lib/backup.ts`, `src/lib/archive.ts`, `src/lib/archive.worker.ts` |
| Dosya indirme | `src/lib/export.ts` |
| Eski sürümlerde kaydedilmiş örnek parçaları okuma uyumluluğu | `src/lib/legacySamples.ts` |
| Veri alanları ve varsayılan kategoriler | `src/types.ts` |
| Taşınabilir uygulama başlatıcısı | `portable/main.go` |

## Düzenlerken canlı gör

Geliştirme için Node.js 22+ ve pnpm gerekir. Bunlar yalnızca kaynak kod üzerinde çalışırken gereklidir; dağıtılan taşınabilir uygulamayı kullanan kişiler kurmaz.

Projenin kök klasöründe terminal aç:

```sh
pnpm install
pnpm dev
```

Firefox'ta **http://127.0.0.1:5173/** adresini aç. VSCodium'da `src/` içindeki dosyayı düzenle ve **Ctrl+S** ile kaydet. Vite değişiklikleri sayfaya otomatik yansıtır. Bu sırada tekrar tekrar derleme yapman gerekmez.

Alternatif: **Terminal → Run Task → CADinvent: development server**. Sunucuyu terminalde **Ctrl+C** ile durdur. Port zaten kullanımdaysa ikinci sunucuyu başlatmak yerine açık sunucuyu kullan.

## Kodun akışı

`index.html` → `src/main.tsx` → `src/App.tsx`

`App.tsx`, aktif workspace'i `hooks/useWorkspaces.ts` üzerinden alır. Her workspace'in parça ve kategori listesi ayrıdır. Kategori satırlarını `CategoryRow` ile gösterir. Bir parçaya tıklanınca `Inspector` açılır. Arayüzdeki işlemler `lib/` içindeki işlevleri çağırır.

Dosya içe aktarmada: `importer.ts` → `mesh.worker.ts` → `parser.ts` → `rendering.ts` ile küçük resim → `storage.ts` ile kayıt.

Workspace yedeklemede: `backup.ts` → `archive.worker.ts` ile tek ZIP. ZIP içinde kökte `workspace.json`, `models/` altında kaynak dosyalar bulunur. Geri yüklemede dosyalar doğrulanır, küçük resimler yeniden üretilir ve tüm proje tek veritabanı işlemiyle kaydedilir. `Category.includedInAll` ± düğmesini, `Category.favorite` kategori yıldızını yönetir; `Part.favorite` bağımsız kalır.

## Düzenlemeyi tamamlayınca derle

```sh
pnpm test
pnpm build
pnpm portable:build
```

- `pnpm build`: yalnızca `build/web/` içine web sürümünü üretir.
- `pnpm portable:build`: mevcut `build/web/` çıktısını alır, `build/launcher/` içinde hazırlar ve `build/releases/` içine çalıştırılabilir dosyayı üretir. Go gerekir; bu bilgisayardaki `build/tools/go/` otomatik bulunur.
- Kaynak kod değişince önceden derlenmiş `.exe` kendiliğinden güncellenmez. Tekrar derleme yapmalısın. Yeni `.exe` üretmeden önce çalışan eski taşınabilir uygulamayı durdur.
- VSCodium'da **CADinvent: build portable application** görevi iki derleme adımını sırayla çalıştırır.

Geliştirme adresi `:5173` ile taşınabilir uygulamanın `:47831` adresinin tarayıcı kütüphaneleri ayrıdır. Bu nedenle birinde eklediğin parçaları diğerinde görmemen beklenen davranıştır. Kod dosyalarını düzenlemek orijinal CAD dosyalarını değiştirmez.

Git'e kaynak dosyalar ve ayarlar gider. `build/` içeriği gönderilmez; dağıtım paketleri GitHub Releases'a eklenir.

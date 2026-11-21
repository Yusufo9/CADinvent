# 6. GitHub'a hazırlık ve ileride yayımlama

**Bu belge yayımlama işlemi yapmaz.** CADinvent'in mevcut yerel Git dalı `main`; bu belge hazırlanırken `git remote -v` boştu. Aşağıdaki `remote` ve `push` komutları, ancak sen bir gün yayımlamaya karar verirsen **senin çalıştırman için** yazılmıştır. Projenin kodunu anlamak ve belgelemek için GitHub hesabı gerekmez.

## 6.1 Önce “ne yayımlıyorum?” sorusu

GitHub deposuna genelde **kaynak kod, bağımlılık tanımı, kilit dosyası, testler ve belgeler** konur. Kullanıcının indireceği çalıştırılabilir uygulama ise daha sonra **Release asset** olarak ayrı yayımlanır. GitHub'ın otomatik “Source code” ZIP'i, kaynakların arşividir; CADinvent'in hazır Windows programı değildir. Bu proje daha sonra bir `v*` sürüm etiketi gönderildiğinde otomatik test/build ve **taslak** Release hazırlayacak şekilde ayarlanmış; taslağı ayrıca inceleyip yayımlamak gerekir.

## 6.2 Hangi dosyalar GitHub'a gitmeli?

GitHub'a elle klasör seçerek yüklemek yerine Git'in takip ettiği dosyaları gönderirsin. Bugünkü yapı için rehber tablo:

| Gönder | Neden? |
| --- | --- |
| [src/](../src) | Web uygulamasının gerçek düzenlenebilir kodu; `*.test.ts` testleri dahil. |
| [portable/](../portable) | İsteğe bağlı Go başlatıcısının kaynakları, Go testi ve lisans bildirimi. |
| [scripts/](../scripts) | Taşınabilir paket ve bildirim oluşturma komutları. |
| [tests/fixtures/](../tests/fixtures) | Otomatik test için küçük örnek CAD dosyaları. |
| [.github/workflows/portable.yml](../.github/workflows/portable.yml) | GitHub Actions test/derleme/paketleme tanımı. |
| [README.md](../README.md), [docs/](../docs), [rehberler/](.) | Kullanım ve geliştirme anlatımı. |
| [package.json](../package.json), [pnpm-lock.yaml](../pnpm-lock.yaml), [pnpm-workspace.yaml](../pnpm-workspace.yaml) | Bağımlılık ve komut tanımları; kilit dosyası tekrar üretilebilir kurulum sağlar. |
| [index.html](../index.html), [vite.config.ts](../vite.config.ts), [tsconfig.json](../tsconfig.json) | Web giriş ve derleme ayarları. |
| [.gitignore](../.gitignore), [.gitattributes](../.gitattributes), [.editorconfig](../.editorconfig) | Git ve metin düzeni kuralları. |
| [.vscode/tasks.json](../.vscode/tasks.json), [.vscode/settings.json](../.vscode/settings.json) | Paylaşılabilir VSCodium görevleri ve görünüm ayarları. |

`git ls-files` her an **gerçek** takip listesini gösterir. Yeni oluşturduğun bir dosya bu listede görünmüyorsa önce `git status` ve `.gitignore` kontrol et. Şu an oluşturulan `rehberler/` dosyaları, yerel commit'e alınana kadar `git ls-files` içinde görünmez.

## 6.3 Hangi dosyalar GitHub'a gitmemeli?

| Gönderme | Sebep |
| --- | --- |
| `build/` | Derlenmiş web dosyaları, geçici Go alanı, paketler ve önbellek; komutlarla yeniden üretilir. |
| `node_modules/` | İndirilen bağımlılıklar; `pnpm install --frozen-lockfile` ile yeniden kurulur. |
| `dist/`, `coverage/`, `*.tsbuildinfo`, `*.log` | Çıktı veya yerel rapor/önbellek. |
| `*.zip` | Kullanıcının Workspace ZIP yedeği veya yerel paket; kişisel CAD verisi içerebilir. |
| `.env*` (örnek `.env.example` hariç) | Yerel ayar ve olası sırlar. |
| `.git/` klasörünü dosya olarak | Git bunu kendi mekanizmasıyla yönetir; web arayüzüne elle klasör olarak yükleme. |
| `.openai/`, `.codex/`, `.agents/`, `.claude/`, `.cursor/`, `AGENTS.md`, `CLAUDE.md` | Yerel yardımcı/ajan ayarları; uygulamanın çalışması için gerekli değil. |
| Kullanıcının CAD dosyaları, ekran görüntüleri veya tarayıcı profili | Çalışma alanı verisi özel olabilir ve kaynak kod deposunun parçası değildir. |

Bu kuralların çoğu [`.gitignore`](../.gitignore) içindedir. `.gitignore` bir güvenlik duvarı değildir; her zaman `git status` ve `git diff --cached --stat` ile son kontrol yap. Özellikle bir dosya geçmişte commit edildiyse ignore eklemek onu geçmişten çıkarmaz. GitHub'ın kendi rehberi de parola, API anahtarı gibi bilgilerin commit/push edilmemesini özellikle söyler: [Adding locally hosted code to GitHub](https://docs.github.com/en/migrations/importing-source-code/using-the-command-line-to-import-source-code/adding-locally-hosted-code-to-github?platform=windows).

## 6.4 Yayımlama öncesi gerçek kontrol listesi

Bu adımlar yereldir; GitHub'a gönderim yapmaz:

```powershell
git status
git ls-files
git diff --check
pnpm install --frozen-lockfile
pnpm test
pnpm build
git log -5 --format="%h %an <%ae> %s"
git remote -v
```

1. `git status`: Yanlışlıkla eklenmiş model yedeği veya kişisel dosya var mı?
2. `git ls-files`: Gerçekte hangi dosyalar izleniyor?
3. `git diff --check`: Basit fark sorunları var mı?
4. `pnpm test` ve `pnpm build`: Kod şu an sağlıklı mı? Üretilen `build/` Git'e eklenmez.
5. `git log ...`: Eski commit yazar adları/e-posta adresleri kamuya görünür olacak mı? Bu projedeki önceki kayıtlar `Codex <codex@local.invalid>` ile oluşturulmuş. Bunun senin için uygun olup olmadığını yayımlamadan önce değerlendir. Geçmişi yeniden yazmak ayrı ve dikkat gerektiren bir işlem; sırf görünen ad için otomatik yapma.
6. `git remote -v`: Yanlış bir uzak adrese gönderme riskini azaltır.

İstersen takip edilen dosya adlarında sır çağrıştıran sözcükleri **içeriği terminale dökmeden** önce şöyle arayabilirsin: `git ls-files | Select-String 'secret|token|password|\.env'`. Bu yalnızca dosya adını kontrol eder; ayrıca dosya içeriğini kendi gözünle incelemelisin. Bir sır geçmişte commit edilmişse sır değerini değiştirmek/iptal etmek gerekir; yalnızca son commit'ten silmek yeterli olmayabilir.

## 6.5 Lisans kararı

Şu anda proje kökünde genel bir `LICENSE` dosyası yok. Kullanıcıların GitHub'da kodu görüp **kullanabilmesini, değiştirebilmesini ve dağıtabilmesini** istiyorsan uygun bir açık kaynak lisansı seçip köke `LICENSE` dosyası eklemeyi düşün. Hangi lisansı istediğine proje sahibi karar vermeli; bu rehber senin adına lisans seçmez. GitHub'ın [Licensing a repository](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/licensing-a-repository) açıklamasına göre lisans yoksa varsayılan telif kuralları geçerlidir ve başkalarına otomatik yeniden kullanım izni verilmiş olmaz. Mevcut [portable/GO-LICENSE](../portable/GO-LICENSE) Go bileşenine ait bildirimdir; bütün projeyi lisanslayan kök `LICENSE` yerine geçmez. [GitHub'ın lisans seçme rehberi](https://choosealicense.com/) seçenekleri karşılaştırmaya yardımcı olur.

## 6.6 Bir gün GitHub deposu açarsan

Önce GitHub'da yeni, **boş** bir depo oluştur. GitHub'ın yerel kod ekleme rehberi, mevcut yerel depo için yeni uzak depoyu README/license/gitignore ile başlatmamayı önerir; böylece ayrı ilk commit'ler çakışmaz. Depoyu **public** veya **private** açmak senin kararın. Kaynakların başkaları tarafından görülebilmesini istiyorsan public gerekir; test için private ile de başlayabilirsin. [Resmî Windows yönergesi](https://docs.github.com/en/migrations/importing-source-code/using-the-command-line-to-import-source-code/adding-locally-hosted-code-to-github?platform=windows).

GitHub'dan kendi depo adresini kopyaladıktan **ve yayımlamaya karar verdikten sonra** proje kökünde şu örneği kendi URL'inle uygularsın:

```powershell
git remote add origin https://github.com/KULLANICI_ADIN/CADinvent.git
git remote -v
git push -u origin main
```

`git remote add` uzak adresi yerel Git ayarına ekler; tek başına kod göndermez. `git push -u origin main` yerel `main` commit'lerini gönderir ve bu dal için varsayılan uzak bağlantıyı kurar. Komutlar kimlik doğrulama isteyebilir; GitHub hesabı ve uygun kimlik doğrulama yöntemi gerekir. Repo adı veya dalın farklıysa örneği uyarlamalısın. [GitHub'ın push açıklaması](https://docs.github.com/en/get-started/using-git/pushing-commits-to-a-remote-repository).

**Bu komutlar burada çalıştırılmadı.** `origin` eklenmedi, `push` yapılmadı, GitHub deposu oluşturulmadı.

## 6.7 GitHub'daki kişi projeyi nasıl çalıştırır?

İki yol var:

**Geliştirici yolu:** Repoyu `git clone` ile indirir, Node.js 22+ ve pnpm kurar, `pnpm install --frozen-lockfile` ardından `pnpm dev` çalıştırır. Kaynak kodu düzenlemek isteyenler için bu yol uygundur. `pnpm build` üretim web dosyalarını `build/web/` içinde oluşturur.

**Son kullanıcı yolu:** Sen bir Release yayımladıktan sonra kişi kendi işletim sistemine uygun taşınabilir paketi **Releases → Assets** bölümünden indirir, arşivi açar ve programı çalıştırır. Node, Go, pnpm, Electron veya ek tarayıcı kurulumu gerekmez; mevcut tarayıcısı açılır. İşletim sistemine göre paket adları ve Firefox seçeneği [docs/PORTABLE.md](../docs/PORTABLE.md) içindedir. Henüz yayımlanmış Release yoksa README'deki “Releases'ten indir” anlatımı gelecekteki dağıtım akışını tarif eder; yalnızca repo oluşturmak indirme paketi oluşturmaz.

## 6.8 Otomatik derleme ve taslak Release

[.github/workflows/portable.yml](../.github/workflows/portable.yml) `main` dalına push, `v*` etiketi, pull request ve elle başlatma durumlarında çalışacak şekilde yazılmıştır. Test, web derlemesi, Go testi ve Windows/Linux/macOS için `amd64`/`arm64` program üretimi yapar. Paketleri ve SHA-256 toplamlarını Actions **artifact** olarak saklar; workflow dosyasında 14 günlük saklama süresi vardır. `v*` etiketi gönderildiğinde kontroller geçerse **draft** Release oluşturur. Taslak, kullanıcıların indirip kullanacağı yayımlanmış sürüm değildir; senin GitHub'da inceleyip **Publish release** demen gerekir. Bu akışın kaynak kodunu yayımlamakla yazılım sürümünü yayımlamayı ayrı tuttuğunu bil.

İlk açık depo için README'nin beklentilerini gerçek yayın durumuyla eşleştir: depo açıldığında henüz Release yoksa kullanıcılara geliştirici yolunu veya gelecekte hazırlanacak sürümü açıkça göster. Bir sürüm yayımlamadan önce [docs/RELEASE-NOTES.md](../docs/RELEASE-NOTES.md) metnini gözden geçir, uygun lisansı seç, platform paketlerini ve kontrollerini incele.

## 6.9 Yayınlandıktan sonra bakım döngüsü

Yayımladıktan sonra normal değişiklik akışı: kaynak dosyayı düzenle → yerel test/build → farkı oku → yerel commit → isteğe bağlı push → GitHub Actions sonucunu kontrol et. Kullanıcı verisini GitHub'a göndermek gerekmez. Yeni sürüm için etiket ve Release süreci ayrı uygulanır. Arıza raporunda sorunu tekrar üretip küçük test eklemek, yalnızca ekrandaki belirtiyi tahmin ederek düzeltmekten daha güvenilir olur.

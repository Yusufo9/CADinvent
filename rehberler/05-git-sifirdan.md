# 5. Git'i sıfırdan anlamak

Git'i bir oyundaki **kayıt noktaları** gibi düşünebilirsin. Kod değiştirirsin, farkı incelersin, sonra anlamlı bir kayıt noktası oluşturursun. GitHub ise bu kayıtların daha sonra gönderilebileceği uzak bir hizmettir. **Bu projede şu anda `main` adlı yerel dal var ve uzak depo (`remote`) tanımlı değil.** Bu rehberi yazmak, GitHub'a gönderim yapmaz.

## 5.1 Dört alanı ayır

```text
Çalışma klasörü  →  Hazırlama alanı  →  Yerel Git geçmişi  →  Uzak GitHub deposu
  dosyayı düzenle     git add             git commit           git push
```

- **Çalışma klasörü**: VSCodium'da şu an gördüğün dosyalar.
- **Hazırlama alanı / stage**: Bir sonraki commit'e girecek değişikliklerin seçimi.
- **Commit**: Yerel Git geçmişindeki kayıt noktası; açıklama mesajı taşır.
- **Remote**: GitHub gibi başka yerdeki depo adresi. Şu an yok.
- **Push**: Yerel commit'leri uzak depoya gönderir. Kullanıcının isteği gereği burada uygulanmıyor.

`git add` dosyayı GitHub'a yüklemez. `git commit` de tek başına yüklemez. `git push` bir remote'a gönderir. Böylece çalışma alanında güvenle değişiklik hazırlayıp yayımlama kararını sonraya bırakabilirsin.

## 5.2 İlk bakılacak komutlar

```powershell
git status
git branch --show-current
git log --oneline -5
git diff
git remote -v
```

`status` değişen/yeni dosyaları, `branch` dal adını, `log` kayıt noktalarını, `diff` henüz commit edilmemiş satır farklarını gösterir. `remote -v` boşsa GitHub adresi bağlı değildir. Bu projedeki ilk commit'ler geçici `Codex <codex@local.invalid>` kimliğiyle yazılmıştır. İleride yayımlamadan önce `git log --format="%h %an <%ae> %s"` ile yazar bilgisini gözden geçir; bu ad/e-posta GitHub'da da görülebilir.

## 5.3 Değişiklik hazırlama ve yerel commit

Bu rehberlerde örnek olarak, yalnızca rehber dosyalarını kaydetmek istediğini düşün:

```powershell
git add rehberler
git diff --cached --stat
git diff --cached
git commit -m "docs: add Turkish codebase guides"
git status
```

`git diff --cached`, stage'e alınan **tam** içeriği gösterir. `git add .` bütün yeni/değişen dosyaları seçer; başlangıçta özellikle hedef dosyaları yazmak neyin girdiğini daha anlaşılır kılar. Commit mesajı yapılan işi anlatmalı. Bir commit için Git adı/e-postası gerekir; ileride kendi kimliğini ayarlamak istersen `git config user.name "Ad Soyad"` ve `git config user.email "adres@example.com"` komutları bu depoya özel ayarlanabilir. Gerçek bilgilerini paylaşmak istemezsen GitHub'ın gizli e-posta seçeneğini inceleyebilirsin. Bu rehber senin yerine kimlik ayarlamaz.

## 5.4 `.gitignore` ne işe yarar?

[.gitignore](../.gitignore) “Git bu dosyaları yeni kaynak dosyası olarak alma” listesidir. Burada `build/`, `node_modules/`, `*.zip`, `.env*`, loglar, yerel editör durumu ve yerel yapay zekâ araç klasörleri yok sayılır. `*.zip` kuralı, çalışma alanından indirdiğin model yedeğini yanlışlıkla kaynak depoya eklememeye yardım eder.

Kontrol için:

```powershell
git status --ignored --short
git check-ignore build/web/index.html
git ls-files
```

`git ls-files`, **şu anda takip edilen** dosyaların listesidir ve ileride GitHub'a gönderilecek içeriği anlamak için en değerli komutlardan biridir. `.gitignore` daha önce commit edilmiş bir sırrı geçmişten silmez; sırlar geçmişe hiç girmemelidir.

## 5.5 Bir dosyayı yanlışlıkla değiştirdim

Önce durumu oku:

```powershell
git diff -- src/App.tsx
git status --short
```

Henüz stage'e almamış ve **gerçekten vazgeçtiğin** değişikliği `git restore -- src/App.tsx` ile geri alabilirsin. Stage'e alınmış değişikliği stage'den çıkarmak için `git restore --staged -- src/App.tsx` kullanılır; bu ikinci komut dosyanın çalışma klasöründeki içeriğini silmez. Emin değilsen dosyayı önce başka yere kopyala veya yardım iste. `reset --hard`, `clean -fd` gibi geniş silme komutlarını neyi kaldıracağını anlamadan çalıştırma.

Commit edilmiş geçmişi görmek için `git show <commit-kimliği>`; iki kayıt noktasını karşılaştırmak için `git diff <eski> <yeni>` kullanabilirsin. “Eski sürümü incelemek” ile “geçmişi yeniden yazmak” ayrı işlerdir. İlk öğrenme aşamasında geçmişi yeniden yazmak gerekmez.

## 5.6 Dal ne demek?

Dal, farklı bir çalışma çizgisidir. `main` şu anki ana çizgi. Büyük bir özellik için ayrı dal açmak ana çizgiyi rahat tutar:

```powershell
git switch -c codex/deneme-ozelligi
git branch --show-current
```

Bu komut yerel dal açar; GitHub'a yüklemez. Denemeyi tamamladıktan sonra merge etmek ayrı bir karardır. Çok küçük belge düzeltmesi için ayrı dal zorunlu değildir. Bu projede yeni dal açılacaksa varsayılan ad ön eki `codex/` olarak kullanılır.

## 5.7 Git ile tarayıcı verisi farklıdır

Git bu uygulamanın **kodunu** takip eder. Senin Firefox'ta içe aldığın model dosyaları ve kategoriler IndexedDB'dedir. `git commit` yapmak model kütüphaneni yedeklemez. Model çalışma alanını korumak için uygulamadaki **Export Workspace** ile ZIP indir. Bu ZIP'in `*.zip` kuralıyla Git'e alınmaması özellikle iyi bir güvenlik ve boyut sınırıdır.

## 5.8 Günlük küçük çalışma döngüsü

```text
1. git status
2. Kaynak dosyayı düzenle
3. pnpm test / pnpm build / tarayıcı kontrolü
4. git diff
5. git add ilgili-dosyalar
6. git diff --cached
7. git commit -m "ne değişti"
8. git status
```

Bu döngü tamamen yereldir. GitHub adımları için [sonraki rehber](06-githuba-hazirlama-ve-yayinlama.md) yalnızca ileride kullanacağın açıklamayı verir.

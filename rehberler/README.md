# CADinvent'i öğrenme yolu

Bu klasör, CADinvent'i ilk kez açan birinin kodu okuyabilmesi, küçük değişiklikler yapabilmesi ve ileride kendi kararıyla GitHub'da yayımlayabilmesi için yazıldı. Bir yazılımı anlamak, bütün dosyaları ezberlemek demek değildir. Önce hangi parçanın ne iş yaptığını öğrenir, sonra bir kullanıcı hareketinin kodda izini sürersin.

**Bu rehberleri hazırlarken GitHub'a hiçbir dosya yüklenmedi.** Bu dizindeki GitHub komutları, yalnızca ileride sen çalıştırmak istersen kullanılacak örneklerdir.

## Hangi sırayla okumalıyım?

| Sıra | Rehber | Öğreneceğin şey |
| --- | --- | --- |
| 1 | [Yazılımı tanıma](01-yazilimi-tanima.md) | Kaynak kod, derleme, tarayıcı, sunucu ve klasörler |
| 2 | [Kod haritası](02-kod-haritasi.md) | Her önemli dosyanın görevi ve ekrandaki işlevlerle ilişkisi |
| 3 | [Model ve ZIP veri akışı](03-model-ve-yedek-akisi.md) | STL/OBJ/PLY dosyasının ve çalışma alanı yedeğinin yolculuğu |
| 4 | [Geliştirme ve hata ayıklama](04-gelistirme-test-ve-hata-ayiklama.md) | VSCodium'da değiştirme, çalıştırma, test etme ve sorunu bulma |
| 5 | [Git'i öğrenme](05-git-sifirdan.md) | Değişiklikleri görme, kayıt altına alma ve geri inceleme |
| 6 | [GitHub'a hazırlık](06-githuba-hazirlama-ve-yayinlama.md) | Hangi dosyalar gidecek, hangileri gitmeyecek, yayımlama adımları |
| 7 | [Sözlük ve alıştırmalar](07-sozluk-ve-alistirmalar.md) | Terimleri pekiştirme ve kendi başına küçük araştırmalar |

Mevcut kısa teknik belgeler de duruyor: [ana README](../README.md), [taşınabilir uygulama rehberi](../docs/PORTABLE.md) ve [önceki kod rehberi](../docs/KOD-REHBERI.md). Bu klasördeki anlatım özellikle öğrenme amacıyla daha yavaş ve ayrıntılı ilerler.

## İlk beş dakikalık yol haritası

1. VSCodium'da **File → Open Folder** ile `CADinvent` klasörünü aç.
2. Soldaki Explorer'da `src/` klasörünü bul. Uygulamanın ekranı ve temel mantığı burada.
3. `build/` klasörünü görürsen onun üretilmiş çıktı olduğunu bil. Düzenleme yapacağın yer burası değil.
4. Terminalde `git status` çalıştır. Bu, yerel dosyalarda kayıt altına alınmamış değişiklik olup olmadığını gösterir.
5. [Kod haritasındaki](02-kod-haritasi.md) “Bir düğmenin izini sürme” bölümünü oku.

## Bu projeyi tek cümlede anlat

CADinvent, yerel STL/OBJ/PLY ağ modellerini tarayıcıda gösteren ve çalışma alanları ile kategorilere ayıran bir uygulamadır. Kaynak dosyalar ve düzenleme bilgileri kullandığın tarayıcının yerel deposunda saklanır; bir çalışma alanını ZIP olarak dışarı alıp sonra geri yükleyebilirsin. İsteğe bağlı küçük Go başlatıcısı aynı web uygulamasını kendi tarayıcında çevrimdışı açar.

## Küçük ama önemli ayrım

Üç ayrı “kutu” düşün:

```text
CADinvent/                 düzenlediğin kaynak proje
  src/                    web uygulaması kaynakları
  portable/               Go başlatıcısının kaynakları
  build/                  komutlarla yeniden üretilen çıktılar

Tarayıcı IndexedDB          kişisel çalışma alanların ve model kopyaların
Git geçmişi                 kaynak kod değişikliklerinin kayıtları
```

`build/` silinip yeniden üretilebilir. Tarayıcı verisi bu klasörde durmaz. Git geçmişi de tarayıcıdaki CAD dosyalarının yedeği değildir. Bu ayrım, projeyi güvenle geliştirmek ve yayımlamak için temel bilgidir.

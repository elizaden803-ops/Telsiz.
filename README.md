# TELSİZ — Dünyanın hər yerindən işləyən qrup rabitəsi (lisenziyalı)

WhatsApp kimi: qrup yarat, kodu/linki paylaş, kimin telefonunda kod varsa
dünyanın istənilən yerindən yazışa, danışa (sıx-danış səs mesajı ilə),
şəkil ata bilər.

---

## Lisenziya sistemi (HƏR CİHAZ ÜÇÜN AYRICA)

- Hər telefon/brauzer ilk dəfə sayta girdiyi andan öz **30 günlük demosunu**
  başladır (brauzerin öz yaddaşında gizli nişanla tanınır) — fərqli cihazlar
  bir-birindən tam asılı deyil
- Bir cihaz lisenziyalı olduqdan sonra həmin cihazdan istədiyi qədər qrup
  yaradıla bilər — qrup sayına məhdudiyyət yoxdur
- 30 gün bitəndə HƏMİN CİHAZ master kod daxil edilmədən yeni qrup
  yarada/qoşula bilmir (digər cihazlara təsir etmir)
- Master kod: **`212500032Na`** — istənilən cihazda "⚙ Ayarlar" və ya
  demo bitəndə avtomatik çıxan ekrandan daxil edilir
- Beləliklə eyni linki bir neçə müştəriyə verə bilərsən — hər birinin öz
  telefonu öz demosunu alır, sən istədiyini ayrıca lisenziyalayırsan
- ⚠️ **Dürüst xəbərdarlıq:** veb brauzerdə əsl aparat (hardware) ID-sini
  oxumaq mümkün deyil — bu, brauzerin öz yaddaşında (localStorage) saxlanılan
  gizli nişana əsaslanır. Texniki bilən adam brauzer məlumatlarını silərsə
  və ya Incognito-dan davamlı istifadə etsə, yeni "cihaz" kimi tanına bilər.
  Adi istifadəçi üçün tam etibarlıdır, 100% saxtakarlıq-sızmaz deyil.
- Vəziyyət serverin öz yaddaşında (`data/devices.json`) saxlanılır —
  server yenidən başlasa (yatıb-oyansa) belə qalır; YALNIZ Render-də
  tam yeni "deploy" edəndə sıfırlanır

## Admin (qrup qurucusu) səlahiyyətləri

Qrupu **yaradan** şəxs avtomatik admin olur (telefonunda "admin token" saxlanılır,
kodu itirməsə admin statusu qalır). Admin:
- Söhbətdə "SİYAHI" düyməsində hər adın yanında **"AT"** düyməsi görür —
  basanda o adam qrupdan çıxarılır (kicked)
- Adi üzvlərin yanında **"ADMİN ET"** düyməsi ilə onları da admin edə bilər —
  bir neçə admin ola bilər (məs. hər növbənin rəhbəri)
- Hər mesajın (yazı/şəkil/səs) küncündə **"✕"** düyməsi ilə onu hamının
  ekranından silə bilər
- "DƏVƏT" ekranından **PIN qoya bilər** — PIN qoyulsa, o kodu bilən hər kəs
  deyil, YALNIZ PIN-i də bilən qoşula bilər (parol kimi)
- Adi üzvlər bu düymələri görmür

## Digər funksiyalar

- **Bildiriş (ekran açıqkən):** yeni mesaj/şəkil/səs gələndə qısa səs + vibrasiya
- **Arxa fon bildirişi (🔔):** söhbətdə 🔔 düyməsinə bas, icazə ver — proqram
  bağlı/minimallaşdırılmış olsa belə OS bildirişi gəlir (Android-də etibarlı,
  iPhone-da yalnız "Ana ekrana əlavə et" edilmiş proqramda işləyir, Safari-nin
  öz brauzer tabında YOX)
- **SOS düyməsi:** basanda təsdiq istəyir, sonra bütün qrupa yüksək səsli
  alarm + (icazə versən) sənin məkanını (xəritə linki) göndərir
- **Kamera:** 📷 düyməsi telefonun kamerasını birbaşa açır (qalereya yox)
- **Səs keyfiyyəti:** əks-səda təmizlənməsi və arxa fon küyü filtri aktivdir,
  zəif internetdə də (aşağı bit-rate) kəsintisiz işləməyə çalışır

## Native app tələb edən şeylər (bu versiyada yoxdur)

Bunlar brauzer/PWA texnologiyasında mümkün deyil, yalnız App Store/Play
Store-a yüklənən tam native proqramda edilə bilər:
- Telefonun səs düymələrini PTT kimi təyin etmək
- İnternetsiz, Wi-Fi Direct/Bluetooth ilə yaxın-məsafə əlaqə (mesh)


Qrupu **yaradan** şəxs avtomatik admin olur (telefonunda "admin token" saxlanılır,
kodu itirməsə admin statusu qalır). Admin:
- Söhbətdə "SİYAHI" düyməsində hər adın yanında **"AT"** düyməsi görür —
  basanda o adam qrupdan çıxarılır (kicked)
- "DƏVƏT" ekranında **PIN qoya bilər** — PIN qoyulsa, o kodu bilən hər kəs
  deyil, YALNIZ PIN-i də bilən qoşula bilər (parol kimi)
- Adi üzvlər bu düymələri görmür

## Kod gizliliyi haqqında dürüst xəbərdarlıq

Brauzerdə işləyən HTML/JavaScript (index.html) İSTƏNİLƏN adam
tərəfindən "View Source" ilə görülə bilər — bu, bütün veb saytlar üçün
texniki reallıqdır, WhatsApp Web də daxil. Bunu 100% gizlətmək mümkün deyil.

**Əsl qorunma master koddur:** kimsə HTML-i tam kopyalayıb özününkü kimi
qoysa belə, sənin serverindəki lisenziya yoxlaması olmadan (öz backend-i
olmadan) işə düşməyəcək — çünki bütün əsl iş (qruplar, mesajlar, lisenziya)
serverdə baş verir, HTML sadəcə görünüşdür.

---

## İşə salmaq: 2 addım (dəyişməyib)

### 1. GitHub-a qoy
1. https://github.com — pulsuz hesab
2. **+** → **New repository** → ad ver → **Create**
3. **"uploading an existing file"** → bu zip-in içindəki BÜTÜN faylları
   birdən sürüşdür (qovluq yoxdur, hamısı düz — mobil GitHub-da da
   problemsiz işləyir)
4. **Commit changes**

### 2. Render-də canlıya qoy
1. https://render.com — pulsuz hesab (GitHub ilə)
2. **New +** → **Blueprint** → repo-nu seç → **Apply**
3. 1-2 dəqiqəyə link hazır olacaq: `https://sənin-adın.onrender.com`

## İstifadə

1. Linki aç → "⚙ Ayarlar" ilə lisenziyanı yoxla/aktivləşdir (ilk 30 gün lazım deyil)
2. Adını yaz → **"YENİ QRUP YARAT"**
3. Kod/link/QR-ı komandaya göndər
4. İstəsən PIN qoy (Dəvət ekranından, yalnız admin görür)
5. Yazışma, şəkil, sıx-danış səs — hamısı işləyir
6. Admin lazım olanda "SİYAHI"-dan kiməsə "AT" bas

## Məhdudiyyətlər (dəyişməyib)

- Pulsuz Render planı 15 dəqiqə boşluqdan sonra yatır (ilk açılış 20-50 san gecikir)
- Söhbət tarixçəsi (son 60 mesaj) serverdə RAM-dadır — server yenidən
  yığılsa (redeploy) itir; lisenziya isə diskdə qalır, itmir
- Səs vaki-toki formatındadır (bas-danış-burax-ötür)

## Fayllar

```
render.yaml              → Render "Blueprint" konfiqurasiyası
server.js                 → server: qruplar, lisenziya, admin, PIN, QR
package.json              → asılılıqlar (ws, qrcode)
index.html          → bütün UI (ad → lisenziya → qrup → söhbət → admin)
data/                      → server öz-özünə yaradır, lisenziya vəziyyəti (GitHub-a qoyma)
TELSIZ-ISE-SAL.bat/.command → yalnız yerli test üçün (məcburi deyil)
```

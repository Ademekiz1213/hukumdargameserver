# 👑 Hükümdar: TikTok Türkiye Haritası Oyunu - Kurulum ve Kullanım Kılavuzu

Bu belge, oyunun kurulumu, başlatılması ve yönetimi hakkında detaylı bilgiler içermektedir.

---

## 📋 1. Gereksinimler

Oyunu çalıştırmadan önce bilgisayarınızda aşağıdaki yazılımın yüklü olması gerekmektedir:

*   **Node.js (LTS Sürümü):** [nodejs.org](https://nodejs.org/) adresinden indirip kurun. Kurulum sırasında tüm varsayılan seçenekleri onaylayın.

---

## 🛠️ 2. İlk Kurulum (Sadece Bir Kez Yapılır)

Dosyaları klasöre çıkardıktan sonra bağımlılıkları yüklemeniz gerekir:

1.  Oyunun ana klasörüne gidin.
2.  `server` klasörünü açın.
3.  Boş bir alana sağ tıklayıp "Terminalde Aç" veya "Komut İstemi Aç" deyin.
4.  Şu komutu yazın ve bitmesini bekleyin:
    ```bash
    npm install
    ```
5.  İşlem bittiğinde pencereyi kapatabilirsiniz.

---

## 🚀 3. Oyunu Başlatma

Oyunu en hızlı ve sorunsuz şekilde başlatmak için ana klasördeki **BASLAT.bat** dosyasını kullanın.

1.  **BASLAT.bat** dosyasına çift tıklayın.
2.  Sistem otomatik olarak eski açık kalan serverları kapatacaktır.
3.  Ekranda size **TikTok Kullanıcı Adınız** sorulacaktır.
    *   Canlı yayını yapacağınız hesabın kullanıcı adını yazın (Örn: `@kullaniciadi` veya sadece `kullaniciadi`).
    *   Enter tuşuna basın.
4.  Oyun ekranı (index.html) tarayıcınızda açılacak ve siyah bir konsol penceresi TikTok yayınına bağlanacaktır.

---

## ⚙️ 4. Oyun İçi Ayarlar

Oyun ekranı açıldığında sağ üstteki **Dişli (⚙️)** ikonuna tıklayarak şu ayarları yapabilirsiniz:

*   **Genel Ayarlar:** Beğeni hedefi, şehir ödülü, koruma modu süresi.
*   **Renkler (Palette):** Haritadaki oyuncu renklerini düzenleyebilir, kendi renk paletinizi oluşturabilirsiniz.
*   **Hükümdarlar (Ruler):** Geçmiş kazananları görebilir ve puanlarını manuel olarak düzenleyebilirsiniz.
*   **Hediye Ayarları:** Hangi hediyenin kaç şehir/güç vereceğini canlı olarak değiştirebilirsiniz.

---

## 🛡️ 5. Koruma Modu ve Eleme

*   **Eleme:** Bir oyuncunun tüm şehirleri bittiğinde ekranda 2 saniyelik bir VS (Eleme) animasyonu görünür.
*   **Dünya Hâkimi:** Bir oyuncu 81 ilin tamamını aldığında ekranda 5 saniyelik büyük bir kutlama animasyonu belirir ve mağlup edilen herkesin listesi yayınlanır.

---

## ⚠️ 6. Sorun Giderme

*   **TikTok'a Bağlanmıyor:** Kullanıcı adınızı doğru girdiğinizden ve o an yayının yayında olduğundan emin olun.
*   **Harita Görünmüyor:** Tarayıcınızın (Chrome/Edge önerilir) güncel olduğundan emin olun.
*   **Server Hatası:** Eğer oyun başlamazsa **SERVER_DURDUR.bat** dosyasını çalıştırıp ardından tekrar **BASLAT.bat** ile deneyin.

---

## 💡 Satış Notu
*Bu yazılım profesyonel bir TikTok etkileşim aracıdır. İzleyici katılımını artırmak için özel efektler ve persistency (kayıt sistemi) ile donatılmıştır.*

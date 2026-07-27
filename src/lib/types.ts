export interface AirtableAttachment {
  id: string;
  width: number;
  height: number;
  url: string;
  filename: string;
  size: number;
  type: string;
  thumbnails: {
    small: { url: string; width: number; height: number };
    large: { url: string; width: number; height: number };
    full: { url: string; width: number; height: number };
  };
}

export interface TalentRecord {
  id: string;
  createdTime: string;
  fields: Record<string, unknown>;
}

export interface AirtableResponse {
  records: TalentRecord[];
  offset?: string;
}

export interface TalentFields {
  "Ad-Soyad"?: string;
  "Email"?: string;
  "Ana sosyal medya mecranız"?: string;
  "Ana mecradaki hesabınız"?: string;
  "Öncelik"?: string;
  "Tag"?: string[];
  "Cinsiyet"?: string;
  "Yaşadığınız Şehir"?: string;
  "Post Ücret"?: string;
  "Story Ücret"?: string;
  "Video/Reels/TikTok Ücret"?: string;
  "Ana içerik kategorisi"?: string;
  "İçerikler hk."?: string;
  "Daha önce çalışılan markalar"?: string;
  "İletişim telefon numaranız"?: string;
  "Barter (ürün gönderimi) kampanyalarda da yer almak ister misiniz?"?: string;
  "Diğer Aktif Olduğunuz Sosyal Medya Platformları ve Kullanıcı Adları"?: string;
  "Hangi sektörlerle işbirliği yapmaktan daha çok keyif alırsınız?"?: string;
  "Çalışmak istemediğiniz marka kategorileri var mı? Varsa nedenleri nelerdir?"?: string;
  "Onay (Müşteri paylaşım ve KVKK)"?: boolean;
  "Kibele (onay)"?: boolean;
  "Delist"?: boolean;
  "Yetkili"?: string[];
  "Cinsiyet Ağırlığı"?: string;
  "Stats"?: AirtableAttachment[];
  "Created"?: string;
  "Created 2"?: string;
  "Onay emaili ve iletişim otomasyon"?: boolean;
}

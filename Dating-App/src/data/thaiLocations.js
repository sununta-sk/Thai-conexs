// src/data/thaiLocations.js
// Thai provinces and cities for Thai Conexns dating app
// Used in ProfileSetup, Discover filter, and profile display
// Both EN and TH names — auto-switch based on user lang

export const PROVINCES = [
  {
    id: 'bangkok',
    name: { en: 'Bangkok', th: 'กรุงเทพมหานคร' },
    cities: [
      { id: 'sukhumvit', name: { en: 'Sukhumvit', th: 'สุขุมวิท' } },
      { id: 'silom', name: { en: 'Silom', th: 'สีลม' } },
      { id: 'sathorn', name: { en: 'Sathorn', th: 'สาทร' } },
      { id: 'thonglor', name: { en: 'Thonglor', th: 'ทองหล่อ' } },
      { id: 'ekkamai', name: { en: 'Ekkamai', th: 'เอกมัย' } },
      { id: 'asoke', name: { en: 'Asoke', th: 'อโศก' } },
      { id: 'phrom_phong', name: { en: 'Phrom Phong', th: 'พร้อมพงษ์' } },
      { id: 'ari', name: { en: 'Ari', th: 'อารีย์' } },
      { id: 'ratchada', name: { en: 'Ratchada', th: 'รัชดา' } },
      { id: 'lat_phrao', name: { en: 'Lat Phrao', th: 'ลาดพร้าว' } },
      { id: 'bang_na', name: { en: 'Bang Na', th: 'บางนา' } },
      { id: 'ramkhamhaeng', name: { en: 'Ramkhamhaeng', th: 'รามคำแหง' } },
      { id: 'pinklao', name: { en: 'Pinklao', th: 'ปิ่นเกล้า' } },
      { id: 'chatuchak', name: { en: 'Chatuchak', th: 'จตุจักร' } },
      { id: 'don_mueang', name: { en: 'Don Mueang', th: 'ดอนเมือง' } },
      { id: 'bang_sue', name: { en: 'Bang Sue', th: 'บางซื่อ' } },
      { id: 'phaya_thai', name: { en: 'Phaya Thai', th: 'พญาไท' } },
      { id: 'siam_pathumwan', name: { en: 'Siam / Pathumwan', th: 'สยาม / ปทุมวัน' } },
      { id: 'khlong_toei', name: { en: 'Khlong Toei', th: 'คลองเตย' } },
      { id: 'yaowarat', name: { en: 'Yaowarat (Chinatown)', th: 'เยาวราช' } },
      { id: 'khao_san', name: { en: 'Khao San / Banglamphu', th: 'ข้าวสาร / บางลำพู' } },
      { id: 'bang_khae', name: { en: 'Bang Khae', th: 'บางแค' } },
      { id: 'lak_si', name: { en: 'Lak Si', th: 'หลักสี่' } },
      { id: 'min_buri', name: { en: 'Min Buri', th: 'มีนบุรี' } },
      { id: 'other', name: { en: 'Other district', th: 'เขตอื่นๆ' } },
    ],
  },
  {
    id: 'chonburi',
    name: { en: 'Chonburi', th: 'ชลบุรี' },
    cities: [
      { id: 'pattaya', name: { en: 'Pattaya', th: 'พัทยา' } },
      { id: 'jomtien', name: { en: 'Jomtien', th: 'จอมเทียน' } },
      { id: 'naklua', name: { en: 'Naklua', th: 'นาเกลือ' } },
      { id: 'bang_saen', name: { en: 'Bang Saen', th: 'บางแสน' } },
      { id: 'si_racha', name: { en: 'Si Racha', th: 'ศรีราชา' } },
      { id: 'chonburi_city', name: { en: 'Chonburi city', th: 'เมืองชลบุรี' } },
      { id: 'other', name: { en: 'Other', th: 'อื่นๆ' } },
    ],
  },
  {
    id: 'chiang_mai',
    name: { en: 'Chiang Mai', th: 'เชียงใหม่' },
    cities: [
      { id: 'old_city', name: { en: 'Old City', th: 'เมืองเก่า' } },
      { id: 'nimman', name: { en: 'Nimman', th: 'นิมมาน' } },
      { id: 'santitham', name: { en: 'Santitham', th: 'สันติธรรม' } },
      { id: 'hang_dong', name: { en: 'Hang Dong', th: 'หางดง' } },
      { id: 'mae_rim', name: { en: 'Mae Rim', th: 'แม่ริม' } },
      { id: 'san_kamphaeng', name: { en: 'San Kamphaeng', th: 'สันกำแพง' } },
      { id: 'other', name: { en: 'Other', th: 'อื่นๆ' } },
    ],
  },
  {
    id: 'phuket',
    name: { en: 'Phuket', th: 'ภูเก็ต' },
    cities: [
      { id: 'patong', name: { en: 'Patong', th: 'ป่าตอง' } },
      { id: 'kata', name: { en: 'Kata', th: 'กะตะ' } },
      { id: 'karon', name: { en: 'Karon', th: 'กะรน' } },
      { id: 'phuket_town', name: { en: 'Phuket Town', th: 'เมืองภูเก็ต' } },
      { id: 'rawai', name: { en: 'Rawai', th: 'ราไวย์' } },
      { id: 'kamala', name: { en: 'Kamala', th: 'กมลา' } },
      { id: 'surin_beach', name: { en: 'Surin / Bang Tao', th: 'สุรินทร์ / บางเทา' } },
      { id: 'other', name: { en: 'Other', th: 'อื่นๆ' } },
    ],
  },
  {
    id: 'krabi',
    name: { en: 'Krabi', th: 'กระบี่' },
    cities: [
      { id: 'ao_nang', name: { en: 'Ao Nang', th: 'อ่าวนาง' } },
      { id: 'krabi_town', name: { en: 'Krabi Town', th: 'เมืองกระบี่' } },
      { id: 'railay', name: { en: 'Railay', th: 'ไร่เลย์' } },
      { id: 'koh_lanta', name: { en: 'Koh Lanta', th: 'เกาะลันตา' } },
      { id: 'other', name: { en: 'Other', th: 'อื่นๆ' } },
    ],
  },
  {
    id: 'surat_thani',
    name: { en: 'Surat Thani', th: 'สุราษฎร์ธานี' },
    cities: [
      { id: 'koh_samui', name: { en: 'Koh Samui', th: 'เกาะสมุย' } },
      { id: 'koh_phangan', name: { en: 'Koh Phangan', th: 'เกาะพะงัน' } },
      { id: 'koh_tao', name: { en: 'Koh Tao', th: 'เกาะเต่า' } },
      { id: 'surat_city', name: { en: 'Surat Thani city', th: 'เมืองสุราษฎร์' } },
      { id: 'other', name: { en: 'Other', th: 'อื่นๆ' } },
    ],
  },
  {
    id: 'prachuap',
    name: { en: 'Prachuap Khiri Khan', th: 'ประจวบคีรีขันธ์' },
    cities: [
      { id: 'hua_hin', name: { en: 'Hua Hin', th: 'หัวหิน' } },
      { id: 'cha_am', name: { en: 'Cha-am', th: 'ชะอำ' } },
      { id: 'prachuap_city', name: { en: 'Prachuap city', th: 'เมืองประจวบ' } },
      { id: 'other', name: { en: 'Other', th: 'อื่นๆ' } },
    ],
  },
  {
    id: 'rayong',
    name: { en: 'Rayong', th: 'ระยอง' },
    cities: [
      { id: 'rayong_city', name: { en: 'Rayong city', th: 'เมืองระยอง' } },
      { id: 'ban_phe', name: { en: 'Ban Phe', th: 'บ้านเพ' } },
      { id: 'koh_samet', name: { en: 'Koh Samet', th: 'เกาะเสม็ด' } },
      { id: 'map_ta_phut', name: { en: 'Map Ta Phut', th: 'มาบตาพุด' } },
      { id: 'other', name: { en: 'Other', th: 'อื่นๆ' } },
    ],
  },
  {
    id: 'songkhla',
    name: { en: 'Songkhla', th: 'สงขลา' },
    cities: [
      { id: 'hat_yai', name: { en: 'Hat Yai', th: 'หาดใหญ่' } },
      { id: 'songkhla_city', name: { en: 'Songkhla city', th: 'เมืองสงขลา' } },
      { id: 'other', name: { en: 'Other', th: 'อื่นๆ' } },
    ],
  },
  {
    id: 'nonthaburi',
    name: { en: 'Nonthaburi', th: 'นนทบุรี' },
    cities: [
      { id: 'mueang_nont', name: { en: 'Mueang Nonthaburi', th: 'เมืองนนทบุรี' } },
      { id: 'pak_kret', name: { en: 'Pak Kret', th: 'ปากเกร็ด' } },
      { id: 'bang_yai', name: { en: 'Bang Yai', th: 'บางใหญ่' } },
      { id: 'other', name: { en: 'Other', th: 'อื่นๆ' } },
    ],
  },
  {
    id: 'pathum_thani',
    name: { en: 'Pathum Thani', th: 'ปทุมธานี' },
    cities: [
      { id: 'rangsit', name: { en: 'Rangsit', th: 'รังสิต' } },
      { id: 'khlong_luang', name: { en: 'Khlong Luang', th: 'คลองหลวง' } },
      { id: 'mueang_pathum', name: { en: 'Mueang Pathum Thani', th: 'เมืองปทุมธานี' } },
      { id: 'other', name: { en: 'Other', th: 'อื่นๆ' } },
    ],
  },
  {
    id: 'samut_prakan',
    name: { en: 'Samut Prakan', th: 'สมุทรปราการ' },
    cities: [
      { id: 'mueang_sp', name: { en: 'Mueang Samut Prakan', th: 'เมืองสมุทรปราการ' } },
      { id: 'bang_phli', name: { en: 'Bang Phli', th: 'บางพลี' } },
      { id: 'bang_bo', name: { en: 'Bang Bo', th: 'บางบ่อ' } },
      { id: 'suvarnabhumi', name: { en: 'Suvarnabhumi area', th: 'สุวรรณภูมิ' } },
      { id: 'other', name: { en: 'Other', th: 'อื่นๆ' } },
    ],
  },
  {
    id: 'nakhon_ratchasima',
    name: { en: 'Nakhon Ratchasima (Korat)', th: 'นครราชสีมา (โคราช)' },
    cities: [
      { id: 'mueang_korat', name: { en: 'Mueang Korat', th: 'เมืองโคราช' } },
      { id: 'pak_chong', name: { en: 'Pak Chong (Khao Yai)', th: 'ปากช่อง (เขาใหญ่)' } },
      { id: 'other', name: { en: 'Other', th: 'อื่นๆ' } },
    ],
  },
  {
    id: 'khon_kaen',
    name: { en: 'Khon Kaen', th: 'ขอนแก่น' },
    cities: [
      { id: 'mueang_kk', name: { en: 'Mueang Khon Kaen', th: 'เมืองขอนแก่น' } },
      { id: 'other', name: { en: 'Other', th: 'อื่นๆ' } },
    ],
  },
  {
    id: 'udon_thani',
    name: { en: 'Udon Thani', th: 'อุดรธานี' },
    cities: [
      { id: 'mueang_udon', name: { en: 'Mueang Udon Thani', th: 'เมืองอุดรธานี' } },
      { id: 'other', name: { en: 'Other', th: 'อื่นๆ' } },
    ],
  },
  {
    id: 'ubon',
    name: { en: 'Ubon Ratchathani', th: 'อุบลราชธานี' },
    cities: [
      { id: 'mueang_ubon', name: { en: 'Mueang Ubon', th: 'เมืองอุบล' } },
      { id: 'other', name: { en: 'Other', th: 'อื่นๆ' } },
    ],
  },
  {
    id: 'nakhon_si',
    name: { en: 'Nakhon Si Thammarat', th: 'นครศรีธรรมราช' },
    cities: [
      { id: 'mueang_nst', name: { en: 'Mueang Nakhon Si', th: 'เมืองนครศรี' } },
      { id: 'other', name: { en: 'Other', th: 'อื่นๆ' } },
    ],
  },
  {
    id: 'ayutthaya',
    name: { en: 'Ayutthaya', th: 'พระนครศรีอยุธยา' },
    cities: [
      { id: 'mueang_ayut', name: { en: 'Mueang Ayutthaya', th: 'เมืองอยุธยา' } },
      { id: 'other', name: { en: 'Other', th: 'อื่นๆ' } },
    ],
  },
  {
    id: 'kanchanaburi',
    name: { en: 'Kanchanaburi', th: 'กาญจนบุรี' },
    cities: [
      { id: 'mueang_kan', name: { en: 'Mueang Kanchanaburi', th: 'เมืองกาญจน์' } },
      { id: 'sai_yok', name: { en: 'Sai Yok', th: 'ไทรโยค' } },
      { id: 'other', name: { en: 'Other', th: 'อื่นๆ' } },
    ],
  },
  {
    id: 'nakhon_pathom',
    name: { en: 'Nakhon Pathom', th: 'นครปฐม' },
    cities: [
      { id: 'mueang_np', name: { en: 'Mueang Nakhon Pathom', th: 'เมืองนครปฐม' } },
      { id: 'salaya', name: { en: 'Salaya', th: 'ศาลายา' } },
      { id: 'other', name: { en: 'Other', th: 'อื่นๆ' } },
    ],
  },
  {
    id: 'chiang_rai',
    name: { en: 'Chiang Rai', th: 'เชียงราย' },
    cities: [
      { id: 'mueang_cr', name: { en: 'Mueang Chiang Rai', th: 'เมืองเชียงราย' } },
      { id: 'mae_sai', name: { en: 'Mae Sai', th: 'แม่สาย' } },
      { id: 'other', name: { en: 'Other', th: 'อื่นๆ' } },
    ],
  },
  {
    id: 'lampang',
    name: { en: 'Lampang', th: 'ลำปาง' },
    cities: [
      { id: 'mueang_lp', name: { en: 'Mueang Lampang', th: 'เมืองลำปาง' } },
      { id: 'other', name: { en: 'Other', th: 'อื่นๆ' } },
    ],
  },
  {
    id: 'buriram',
    name: { en: 'Buriram', th: 'บุรีรัมย์' },
    cities: [
      { id: 'mueang_br', name: { en: 'Mueang Buriram', th: 'เมืองบุรีรัมย์' } },
      { id: 'other', name: { en: 'Other', th: 'อื่นๆ' } },
    ],
  },
  {
    id: 'surin',
    name: { en: 'Surin', th: 'สุรินทร์' },
    cities: [
      { id: 'mueang_sr', name: { en: 'Mueang Surin', th: 'เมืองสุรินทร์' } },
      { id: 'other', name: { en: 'Other', th: 'อื่นๆ' } },
    ],
  },
  {
    id: 'other',
    name: { en: 'Other province', th: 'จังหวัดอื่นๆ' },
    cities: [
      { id: 'other', name: { en: 'Other', th: 'อื่นๆ' } },
    ],
  },
];

// ─── Helper functions ──────────────────────────────────────

/**
 * Get province display name based on language
 * @param {string} provinceId - e.g. 'bangkok'
 * @param {string} lang - 'en' or 'th'
 * @returns {string}
 */
export function getProvinceName(provinceId, lang = 'en') {
  const p = PROVINCES.find((x) => x.id === provinceId);
  if (!p) return provinceId || '';
  return p.name[lang] || p.name.en;
}

/**
 * Get city display name based on language
 * @param {string} provinceId
 * @param {string} cityId
 * @param {string} lang
 * @returns {string}
 */
export function getCityName(provinceId, cityId, lang = 'en') {
  const p = PROVINCES.find((x) => x.id === provinceId);
  if (!p) return cityId || '';
  const c = p.cities.find((x) => x.id === cityId);
  if (!c) return cityId || '';
  return c.name[lang] || c.name.en;
}

/**
 * Get cities for a province
 * @param {string} provinceId
 * @returns {Array}
 */
export function getCitiesByProvince(provinceId) {
  const p = PROVINCES.find((x) => x.id === provinceId);
  return p ? p.cities : [];
}

/**
 * Format full location string for display
 * e.g. "Bangkok / Sukhumvit" or "กรุงเทพ / สุขุมวิท"
 */
export function formatLocation(provinceId, cityId, lang = 'en') {
  const province = getProvinceName(provinceId, lang);
  const city = getCityName(provinceId, cityId, lang);
  if (!province) return '';
  if (!city || cityId === 'other') return province;
  return `${province} / ${city}`;
}

// Total: 25 provinces, ~85 cities/districts
export const TOTAL_PROVINCES = PROVINCES.length;
export const TOTAL_CITIES = PROVINCES.reduce((sum, p) => sum + p.cities.length, 0);

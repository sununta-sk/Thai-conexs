import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function PhotoManager() {
  const [photos, setPhotos] = useState([]);
  const [mainPhoto, setMainPhoto] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchProfilePhotos();
  }, []);

  async function fetchProfilePhotos() {
    const { data: { user } } = await supabase.auth.getUser();
    const { data } = await supabase.from('profiles').select('photos, avatar_url').eq('id', user.id).single();
    if (data) {
      setPhotos(data.photos || []);
      setMainPhoto(data.avatar_url || '');
    }
  }

  // ฟังก์ชันอัปโหลดรูปไปที่ Storage
  async function uploadPhoto(event) {
    try {
      setUploading(true);
      const { data: { user } } = await supabase.auth.getUser();
      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      // 1. อัปโหลดไป Storage
      let { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 2. ดึง Public URL
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);

      // 3. อัปเดต Array ในฐานข้อมูล
      const newPhotos = [...photos, publicUrl];
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
            photos: newPhotos,
            avatar_url: mainPhoto || publicUrl // ถ้ายังไม่มีรูปหลัก ให้รูปแรกเป็นรูปหลักทันที
        })
        .eq('id', user.id);

      if (updateError) throw updateError;
      
      setPhotos(newPhotos);
      if (!mainPhoto) setMainPhoto(publicUrl);

    } catch (error) {
      alert(error.message);
    } finally {
      setUploading(false);
    }
  }

  // ฟังก์ชันเลือกรูปให้เป็นรูปหลัก (Main Photo)
  async function setAsMain(url) {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from('profiles')
      .update({ avatar_url: url })
      .eq('id', user.id);

    if (!error) setMainPhoto(url);
  }

  return (
    <div style={{ padding: '20px' }}>
      <h3>จัดการรูปภาพของคุณ</h3>
      
      {/* Grid แสดงรูปภาพเหมือนในรูปที่ส่งมา */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
        {photos.map((url, index) => (
          <div key={index} style={{ position: 'relative', height: '150px', border: url === mainPhoto ? '3px solid #007bff' : '1px solid #ddd', borderRadius: '8px', overflow: 'hidden' }}>
            <img src={url} alt="profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            
            {/* ปุ่มเลือกเป็นรูปหลัก */}
            <button 
              onClick={() => setAsMain(url)}
              style={{ position: 'absolute', bottom: '5px', width: '90%', left: '5%', fontSize: '10px', background: url === mainPhoto ? '#007bff' : 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: '4px' }}
            >
              {url === mainPhoto ? '⭐ รูปหลัก' : 'ตั้งเป็นรูปหลัก'}
            </button>
          </div>
        ))}

        {/* ช่องกดเพิ่มรูป (ปุ่ม +) */}
        {photos.length < 6 && (
          <label style={{ height: '150px', border: '2px dashed #ccc', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <input type="file" accept="image/*" onChange={uploadPhoto} disabled={uploading} hidden />
            {uploading ? '...' : '+'}
          </label>
        )}
      </div>
      
      <p style={{ fontSize: '12px', color: '#666', marginTop: '10px' }}>
        * อัปโหลดได้สูงสุด 6 รูป รูปที่มีขอบสีน้ำเงินคือรูปหลักที่จะโชว์ในหน้าค้นหา
      </p>
    </div>
  );
}
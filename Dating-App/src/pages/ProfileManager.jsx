import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function ProfileManager() {
  const [photos, setPhotos] = useState([]);
  const [mainPhoto, setMainPhoto] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchProfilePhotos();
  }, []);

  async function fetchProfilePhotos() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    const { data } = await supabase.from('profiles').select('photos, avatar_url').eq('id', user.id).single();
    if (data) {
      // ดึง URL จริงจาก Storage ด้วยกุญแจใหม่
      const formattedPhotos = (data.photos || []).map(path => {
        if (path.startsWith('http')) return path;
        const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
        return publicUrl;
      });
      setPhotos(formattedPhotos);
      setMainPhoto(data.avatar_url || '');
    }
  }

  async function uploadPhoto(event) {
    try {
      setUploading(true);
      const { data: { user } } = await supabase.auth.getUser();
      const file = event.target.files[0];
      const fileName = `${user.id}/${Date.now()}_${file.name}`;
      
      let { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);
      const newPhotos = [...photos, publicUrl];
      
      await supabase.from('profiles').update({ 
        photos: newPhotos, 
        avatar_url: mainPhoto || publicUrl 
      }).eq('id', user.id);
      
      setPhotos(newPhotos);
      if (!mainPhoto) setMainPhoto(publicUrl);
    } catch (error) {
      alert("Error: " + error.message);
    } finally {
      setUploading(false);
    }
  }

  async function setAsMain(url) {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('profiles').update({ avatar_url: url }).eq('id', user.id);
    setMainPhoto(url);
  }

  return (
    <div style={{ padding: '20px', background: '#fff', borderRadius: '15px' }}>
      <h3 style={{ marginBottom: '15px', color: '#333' }}>Profile Photos</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
        {[0, 1, 2, 3, 4, 5].map((idx) => {
          const url = photos[idx];
          if (url) {
            return (
              <div key={idx} style={{ position: 'relative', height: '140px', border: url === mainPhoto ? '3px solid #e91e63' : '1px solid #ddd', borderRadius: '12px', overflow: 'hidden' }}>
                <img src={url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <button onClick={() => setAsMain(url)} style={{ position: 'absolute', bottom: '5px', width: '90%', left: '5%', fontSize: '10px', background: url === mainPhoto ? '#e91e63' : 'rgba(0,0,0,0.6)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', padding: '4px' }}>
                  {url === mainPhoto ? 'Main' : 'Set Main'}
                </button>
              </div>
            );
          } else if (idx === photos.length) {
            return (
              <label key={idx} style={{ height: '140px', border: '2px dashed #ccc', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: '#fafafa' }}>
                <input type="file" accept="image/*" onChange={uploadPhoto} disabled={uploading} hidden />
                <span style={{ fontSize: '30px', color: '#ccc' }}>+</span>
              </label>
            );
          } else {
            return (
              <div key={idx} style={{ height: '140px', border: '1px solid #eee', background: '#fdfdfd', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#eee', fontSize: '24px' }}>+</div>
            );
          }
        })}
      </div>
    </div>
  );
}
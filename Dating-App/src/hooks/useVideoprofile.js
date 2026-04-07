// src/hooks/useVideoProfile.js
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

const BUCKET = 'profile-videos'
const MAX_DURATION_SEC = 60
const MAX_SIZE_MB = 100

export function useVideoProfile(targetUserId = null) {
  const { user } = useAuth()
  const userId = targetUserId || user?.id

  const [video, setVideo]         = useState(null)
  const [allVideos, setAllVideos] = useState([])
  const [loading, setLoading]     = useState(true)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress]   = useState(0)
  const [error, setError]         = useState(null)

  const fetchVideos = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    const { data } = await supabase
      .from('profile_videos')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    setAllVideos(data || [])
    setVideo(data?.find(v => v.is_primary) || data?.[0] || null)
    setLoading(false)
  }, [userId])

  useEffect(() => { fetchVideos() }, [fetchVideos])

  // อัปโหลดวิดีโอ
  const uploadVideo = useCallback(async (file) => {
    if (!user) return { success: false, error: 'ไม่ได้ login' }
    setError(null)

    // ตรวจขนาดไฟล์
    const sizeMb = file.size / 1024 / 1024
    if (sizeMb > MAX_SIZE_MB) {
      return { success: false, error: `ไฟล์ใหญ่เกิน ${MAX_SIZE_MB}MB` }
    }

    // ตรวจนามสกุล
    const allowed = ['video/mp4', 'video/webm', 'video/quicktime']
    if (!allowed.includes(file.type)) {
      return { success: false, error: 'รองรับเฉพาะ .mp4, .webm, .mov' }
    }

    setUploading(true)
    setProgress(0)

    try {
      const ext  = file.name.split('.').pop()
      const path = `${user.id}/${Date.now()}.${ext}`

      // Upload to Supabase Storage
      const { error: uploadErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, {
          cacheControl: '3600',
          upsert: false,
          onUploadProgress: (e) => {
            setProgress(Math.round((e.loaded / e.total) * 100))
          },
        })

      if (uploadErr) throw uploadErr

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(BUCKET)
        .getPublicUrl(path)

      // บันทึกลง DB (status = pending รอ admin approve)
      const { data: inserted, error: dbErr } = await supabase
        .from('profile_videos')
        .insert({
          user_id:      user.id,
          storage_path: path,
          public_url:   publicUrl,
          file_size_mb: parseFloat(sizeMb.toFixed(2)),
          is_primary:   allVideos.length === 0, // primary อัตโนมัติถ้าเป็นอันแรก
        })
        .select()
        .single()

      if (dbErr) throw dbErr

      setAllVideos(prev => [inserted, ...prev])
      if (inserted.is_primary) setVideo(inserted)

      return { success: true, video: inserted }
    } catch (err) {
      setError(err.message)
      return { success: false, error: err.message }
    } finally {
      setUploading(false)
      setProgress(0)
    }
  }, [user, allVideos])

  // ตั้ง video เป็น primary
  const setPrimary = useCallback(async (videoId) => {
    if (!user) return
    // ลบ primary เดิม
    await supabase
      .from('profile_videos')
      .update({ is_primary: false })
      .eq('user_id', user.id)

    await supabase
      .from('profile_videos')
      .update({ is_primary: true })
      .eq('id', videoId)

    await fetchVideos()
  }, [user, fetchVideos])

  // ลบวิดีโอ
  const deleteVideo = useCallback(async (videoId) => {
    const target = allVideos.find(v => v.id === videoId)
    if (!target) return

    await supabase.storage.from(BUCKET).remove([target.storage_path])
    await supabase.from('profile_videos').delete().eq('id', videoId)
    await fetchVideos()
  }, [allVideos, fetchVideos])

  return {
    video, allVideos, loading, uploading, progress, error,
    uploadVideo, setPrimary, deleteVideo, refetch: fetchVideos,
    MAX_DURATION_SEC, MAX_SIZE_MB,
  }
}
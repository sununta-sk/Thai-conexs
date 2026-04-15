// src/lib/i18n.js
// ── Central translation system for Thai Conexns ──
// ── ใช้ทุกหน้า: User + Admin ──

export const SUPPORTED_LANGS = [
    { code: 'th', label: '🇹🇭 ภาษาไทย' },
    { code: 'en', label: '🇬🇧 English' },
    { code: 'zh', label: '🇨🇳 中文' },
    { code: 'ja', label: '🇯🇵 日本語' },
    { code: 'ko', label: '🇰🇷 한국어' },
    { code: 'fr', label: '🇫🇷 Français' },
    { code: 'de', label: '🇩🇪 Deutsch' },
    { code: 'es', label: '🇪🇸 Español' },
    { code: 'it', label: '🇮🇹 Italiano' },
    { code: 'pt', label: '🇧🇷 Português' },
    { code: 'ru', label: '🇷🇺 Русский' },
    { code: 'ar', label: '🇸🇦 العربية' },
    { code: 'hi', label: '🇮🇳 हिन्दी' },
    { code: 'vi', label: '🇻🇳 Tiếng Việt' },
    { code: 'id', label: '🇮🇩 Bahasa Indonesia' },
    { code: 'ms', label: '🇲🇾 Bahasa Melayu' },
  ];
  
  const T = {
    // ─────────────────────────────────────────────
    // COMMON — ใช้ทุกหน้า
    // ─────────────────────────────────────────────
    common: {
      th: { save:'บันทึก', cancel:'ยกเลิก', confirm:'ยืนยัน', back:'ย้อนกลับ', loading:'กำลังโหลด...', error:'เกิดข้อผิดพลาด', success:'สำเร็จ', submit:'ส่ง', search:'ค้นหา', close:'ปิด', delete:'ลบ', edit:'แก้ไข', view:'ดู', logout:'ออกจากระบบ', online:'ออนไลน์', offline:'ออฟไลน์', yes:'ใช่', no:'ไม่', send:'ส่ง', sending:'กำลังส่ง...', retry:'ลองใหม่', },
      en: { save:'Save', cancel:'Cancel', confirm:'Confirm', back:'Back', loading:'Loading...', error:'Error', success:'Success', submit:'Submit', search:'Search', close:'Close', delete:'Delete', edit:'Edit', view:'View', logout:'Logout', online:'Online', offline:'Offline', yes:'Yes', no:'No', send:'Send', sending:'Sending...', retry:'Retry', },
      zh: { save:'保存', cancel:'取消', confirm:'确认', back:'返回', loading:'加载中...', error:'错误', success:'成功', submit:'提交', search:'搜索', close:'关闭', delete:'删除', edit:'编辑', view:'查看', logout:'退出登录', online:'在线', offline:'离线', yes:'是', no:'否', send:'发送', sending:'发送中...', retry:'重试', },
      ja: { save:'保存', cancel:'キャンセル', confirm:'確認', back:'戻る', loading:'読み込み中...', error:'エラー', success:'成功', submit:'送信', search:'検索', close:'閉じる', delete:'削除', edit:'編集', view:'表示', logout:'ログアウト', online:'オンライン', offline:'オフライン', yes:'はい', no:'いいえ', send:'送信', sending:'送信中...', retry:'再試行', },
      ko: { save:'저장', cancel:'취소', confirm:'확인', back:'뒤로', loading:'로딩 중...', error:'오류', success:'성공', submit:'제출', search:'검색', close:'닫기', delete:'삭제', edit:'편집', view:'보기', logout:'로그아웃', online:'온라인', offline:'오프라인', yes:'예', no:'아니오', send:'전송', sending:'전송 중...', retry:'재시도', },
      fr: { save:'Enregistrer', cancel:'Annuler', confirm:'Confirmer', back:'Retour', loading:'Chargement...', error:'Erreur', success:'Succès', submit:'Soumettre', search:'Rechercher', close:'Fermer', delete:'Supprimer', edit:'Modifier', view:'Voir', logout:'Déconnexion', online:'En ligne', offline:'Hors ligne', yes:'Oui', no:'Non', send:'Envoyer', sending:'Envoi...', retry:'Réessayer', },
      de: { save:'Speichern', cancel:'Abbrechen', confirm:'Bestätigen', back:'Zurück', loading:'Laden...', error:'Fehler', success:'Erfolg', submit:'Senden', search:'Suchen', close:'Schließen', delete:'Löschen', edit:'Bearbeiten', view:'Ansehen', logout:'Abmelden', online:'Online', offline:'Offline', yes:'Ja', no:'Nein', send:'Senden', sending:'Senden...', retry:'Wiederholen', },
      es: { save:'Guardar', cancel:'Cancelar', confirm:'Confirmar', back:'Volver', loading:'Cargando...', error:'Error', success:'Éxito', submit:'Enviar', search:'Buscar', close:'Cerrar', delete:'Eliminar', edit:'Editar', view:'Ver', logout:'Cerrar sesión', online:'En línea', offline:'Desconectado', yes:'Sí', no:'No', send:'Enviar', sending:'Enviando...', retry:'Reintentar', },
      it: { save:'Salva', cancel:'Annulla', confirm:'Conferma', back:'Indietro', loading:'Caricamento...', error:'Errore', success:'Successo', submit:'Invia', search:'Cerca', close:'Chiudi', delete:'Elimina', edit:'Modifica', view:'Visualizza', logout:'Esci', online:'Online', offline:'Offline', yes:'Sì', no:'No', send:'Invia', sending:'Invio...', retry:'Riprova', },
      pt: { save:'Salvar', cancel:'Cancelar', confirm:'Confirmar', back:'Voltar', loading:'Carregando...', error:'Erro', success:'Sucesso', submit:'Enviar', search:'Pesquisar', close:'Fechar', delete:'Excluir', edit:'Editar', view:'Ver', logout:'Sair', online:'Online', offline:'Offline', yes:'Sim', no:'Não', send:'Enviar', sending:'Enviando...', retry:'Tentar novamente', },
      ru: { save:'Сохранить', cancel:'Отмена', confirm:'Подтвердить', back:'Назад', loading:'Загрузка...', error:'Ошибка', success:'Успех', submit:'Отправить', search:'Поиск', close:'Закрыть', delete:'Удалить', edit:'Изменить', view:'Просмотр', logout:'Выйти', online:'Онлайн', offline:'Не в сети', yes:'Да', no:'Нет', send:'Отправить', sending:'Отправка...', retry:'Повторить', },
      ar: { save:'حفظ', cancel:'إلغاء', confirm:'تأكيد', back:'رجوع', loading:'جار التحميل...', error:'خطأ', success:'نجاح', submit:'إرسال', search:'بحث', close:'إغلاق', delete:'حذف', edit:'تعديل', view:'عرض', logout:'تسجيل الخروج', online:'متصل', offline:'غير متصل', yes:'نعم', no:'لا', send:'إرسال', sending:'جار الإرسال...', retry:'إعادة المحاولة', },
      hi: { save:'सहेजें', cancel:'रद्द करें', confirm:'पुष्टि करें', back:'वापस', loading:'लोड हो रहा है...', error:'त्रुटि', success:'सफलता', submit:'जमा करें', search:'खोजें', close:'बंद करें', delete:'हटाएं', edit:'संपादित करें', view:'देखें', logout:'लॉग आउट', online:'ऑनलाइन', offline:'ऑफलाइन', yes:'हाँ', no:'नहीं', send:'भेजें', sending:'भेजा जा रहा है...', retry:'पुनः प्रयास', },
      vi: { save:'Lưu', cancel:'Hủy', confirm:'Xác nhận', back:'Quay lại', loading:'Đang tải...', error:'Lỗi', success:'Thành công', submit:'Gửi', search:'Tìm kiếm', close:'Đóng', delete:'Xóa', edit:'Chỉnh sửa', view:'Xem', logout:'Đăng xuất', online:'Trực tuyến', offline:'Ngoại tuyến', yes:'Có', no:'Không', send:'Gửi', sending:'Đang gửi...', retry:'Thử lại', },
      id: { save:'Simpan', cancel:'Batal', confirm:'Konfirmasi', back:'Kembali', loading:'Memuat...', error:'Kesalahan', success:'Berhasil', submit:'Kirim', search:'Cari', close:'Tutup', delete:'Hapus', edit:'Edit', view:'Lihat', logout:'Keluar', online:'Online', offline:'Offline', yes:'Ya', no:'Tidak', send:'Kirim', sending:'Mengirim...', retry:'Coba lagi', },
      ms: { save:'Simpan', cancel:'Batal', confirm:'Sahkan', back:'Kembali', loading:'Memuatkan...', error:'Ralat', success:'Berjaya', submit:'Hantar', search:'Cari', close:'Tutup', delete:'Padam', edit:'Edit', view:'Lihat', logout:'Log Keluar', online:'Dalam talian', offline:'Luar talian', yes:'Ya', no:'Tidak', send:'Hantar', sending:'Menghantar...', retry:'Cuba lagi', },
    },
  
    // ─────────────────────────────────────────────
    // DISCOVER PAGE
    // ─────────────────────────────────────────────
    discover: {
      th: { title:'ค้นพบ', noUsers:'ไม่มีผู้ใช้ออนไลน์', onlineUsers:'ผู้ใช้ออนไลน์', sendMessage:'ส่งข้อความ', viewProfile:'ดูโปรไฟล์', filters:'ตัวกรอง', },
      en: { title:'Discover', noUsers:'No users online', onlineUsers:'Online Users', sendMessage:'Send Message', viewProfile:'View Profile', filters:'Filters', },
      zh: { title:'发现', noUsers:'没有在线用户', onlineUsers:'在线用户', sendMessage:'发送消息', viewProfile:'查看资料', filters:'筛选', },
      ja: { title:'発見', noUsers:'オンラインユーザーなし', onlineUsers:'オンラインユーザー', sendMessage:'メッセージ送信', viewProfile:'プロフィール表示', filters:'フィルター', },
      ko: { title:'발견', noUsers:'온라인 사용자 없음', onlineUsers:'온라인 사용자', sendMessage:'메시지 보내기', viewProfile:'프로필 보기', filters:'필터', },
      fr: { title:'Découvrir', noUsers:'Aucun utilisateur en ligne', onlineUsers:'Utilisateurs en ligne', sendMessage:'Envoyer un message', viewProfile:'Voir le profil', filters:'Filtres', },
      de: { title:'Entdecken', noUsers:'Keine Nutzer online', onlineUsers:'Online-Nutzer', sendMessage:'Nachricht senden', viewProfile:'Profil ansehen', filters:'Filter', },
      es: { title:'Descubrir', noUsers:'No hay usuarios en línea', onlineUsers:'Usuarios en línea', sendMessage:'Enviar mensaje', viewProfile:'Ver perfil', filters:'Filtros', },
      it: { title:'Scopri', noUsers:'Nessun utente online', onlineUsers:'Utenti online', sendMessage:'Invia messaggio', viewProfile:'Vedi profilo', filters:'Filtri', },
      pt: { title:'Descobrir', noUsers:'Nenhum usuário online', onlineUsers:'Usuários online', sendMessage:'Enviar mensagem', viewProfile:'Ver perfil', filters:'Filtros', },
      ru: { title:'Открыть', noUsers:'Нет пользователей онлайн', onlineUsers:'Пользователи онлайн', sendMessage:'Отправить сообщение', viewProfile:'Просмотр профиля', filters:'Фильтры', },
      ar: { title:'اكتشف', noUsers:'لا يوجد مستخدمون متصلون', onlineUsers:'المستخدمون المتصلون', sendMessage:'إرسال رسالة', viewProfile:'عرض الملف الشخصي', filters:'الفلاتر', },
      hi: { title:'खोजें', noUsers:'कोई उपयोगकर्ता ऑनलाइन नहीं', onlineUsers:'ऑनलाइन उपयोगकर्ता', sendMessage:'संदेश भेजें', viewProfile:'प्रोफ़ाइल देखें', filters:'फ़िल्टर', },
      vi: { title:'Khám phá', noUsers:'Không có người dùng trực tuyến', onlineUsers:'Người dùng trực tuyến', sendMessage:'Gửi tin nhắn', viewProfile:'Xem hồ sơ', filters:'Bộ lọc', },
      id: { title:'Temukan', noUsers:'Tidak ada pengguna online', onlineUsers:'Pengguna Online', sendMessage:'Kirim Pesan', viewProfile:'Lihat Profil', filters:'Filter', },
      ms: { title:'Temui', noUsers:'Tiada pengguna dalam talian', onlineUsers:'Pengguna Dalam Talian', sendMessage:'Hantar Mesej', viewProfile:'Lihat Profil', filters:'Penapis', },
    },
  
    // ─────────────────────────────────────────────
    // MESSAGES PAGE
    // ─────────────────────────────────────────────
    messages: {
      th: { title:'ข้อความ', noConversations:'ยังไม่มีการสนทนา', typeMessage:'พิมพ์ข้อความ...', you:'คุณ', },
      en: { title:'Messages', noConversations:'No conversations yet', typeMessage:'Type a message...', you:'You', },
      zh: { title:'消息', noConversations:'还没有对话', typeMessage:'输入消息...', you:'你', },
      ja: { title:'メッセージ', noConversations:'会話はまだありません', typeMessage:'メッセージを入力...', you:'あなた', },
      ko: { title:'메시지', noConversations:'아직 대화가 없습니다', typeMessage:'메시지 입력...', you:'나', },
      fr: { title:'Messages', noConversations:'Pas encore de conversations', typeMessage:'Tapez un message...', you:'Vous', },
      de: { title:'Nachrichten', noConversations:'Noch keine Gespräche', typeMessage:'Nachricht eingeben...', you:'Sie', },
      es: { title:'Mensajes', noConversations:'Aún no hay conversaciones', typeMessage:'Escribe un mensaje...', you:'Tú', },
      it: { title:'Messaggi', noConversations:'Nessuna conversazione ancora', typeMessage:'Scrivi un messaggio...', you:'Tu', },
      pt: { title:'Mensagens', noConversations:'Ainda sem conversas', typeMessage:'Digite uma mensagem...', you:'Você', },
      ru: { title:'Сообщения', noConversations:'Пока нет разговоров', typeMessage:'Введите сообщение...', you:'Вы', },
      ar: { title:'الرسائل', noConversations:'لا توجد محادثات بعد', typeMessage:'اكتب رسالة...', you:'أنت', },
      hi: { title:'संदेश', noConversations:'अभी तक कोई बातचीत नहीं', typeMessage:'संदेश टाइप करें...', you:'आप', },
      vi: { title:'Tin nhắn', noConversations:'Chưa có cuộc trò chuyện', typeMessage:'Nhập tin nhắn...', you:'Bạn', },
      id: { title:'Pesan', noConversations:'Belum ada percakapan', typeMessage:'Ketik pesan...', you:'Kamu', },
      ms: { title:'Mesej', noConversations:'Belum ada perbualan', typeMessage:'Taip mesej...', you:'Anda', },
    },
  
    // ─────────────────────────────────────────────
    // ROOM CHAT
    // ─────────────────────────────────────────────
    chat: {
      th: { translating:'กำลังแปลข้อความ...', originalMsg:'ต้นฉบับ', autoTranslated:'แปลอัตโนมัติ', notVerified:'ยังไม่ได้ยืนยันตัวตน', notVerifiedSub:'ยืนยันตัวตนก่อนถึงจะส่งข้อความได้', verifyNow:'ยืนยันตัวตน', placeholder:'พิมพ์ข้อความ...', faceInCircle:'วางใบหน้าให้อยู่ในวงกลม', ticketTitle:'ส่ง Support Ticket', ticketSub:'แจ้งปัญหาเกี่ยวกับ', ticketPlaceholder:'อธิบายปัญหาที่พบ...', ticketSent:'ส่ง Ticket แล้ว!', ticketSentSub:'Admin จะติดต่อกลับเร็วๆ นี้', reportTitle:'Report User', reportSent:'Report ส่งแล้ว!', reportSentSub:'ทีมงานจะตรวจสอบโดยเร็ว', reportReasons:['พฤติกรรมไม่เหมาะสม','ข้อความ harassment','โปรไฟล์ปลอม / scam','เนื้อหาไม่เหมาะสม','อื่นๆ'], },
      en: { translating:'Translating messages...', originalMsg:'Original', autoTranslated:'Auto-translated', notVerified:'Identity Not Verified', notVerifiedSub:'Verify your identity to send messages', verifyNow:'Verify Now', placeholder:'Type your message...', faceInCircle:'Place your face in the circle', ticketTitle:'Send Support Ticket', ticketSub:'Report an issue with', ticketPlaceholder:'Describe the issue...', ticketSent:'Ticket Submitted!', ticketSentSub:'Admin will follow up shortly', reportTitle:'Report User', reportSent:'Report Submitted!', reportSentSub:'Our team will review shortly', reportReasons:['Inappropriate behavior','Harassment','Fake profile / scam','Inappropriate content','Other'], },
      zh: { translating:'正在翻译消息...', originalMsg:'原文', autoTranslated:'自动翻译', notVerified:'未完成身份验证', notVerifiedSub:'验证身份后才能发送消息', verifyNow:'立即验证', placeholder:'输入消息...', faceInCircle:'将面部放入圆圈内', ticketTitle:'提交支持工单', ticketSub:'举报有关用户的问题', ticketPlaceholder:'描述遇到的问题...', ticketSent:'工单已提交！', ticketSentSub:'管理员将尽快跟进', reportTitle:'举报用户', reportSent:'举报已提交！', reportSentSub:'我们的团队将尽快审核', reportReasons:['不当行为','骚扰','虚假资料/诈骗','不当内容','其他'], },
      ja: { translating:'メッセージを翻訳中...', originalMsg:'原文', autoTranslated:'自動翻訳', notVerified:'本人未確認', notVerifiedSub:'本人確認後にメッセージを送信できます', verifyNow:'今すぐ確認', placeholder:'メッセージを入力...', faceInCircle:'顔を円の中に置いてください', ticketTitle:'サポートチケット送信', ticketSub:'に関する問題を報告', ticketPlaceholder:'問題を説明してください...', ticketSent:'チケットを送信しました！', ticketSentSub:'管理者が間もなく対応します', reportTitle:'ユーザーを報告', reportSent:'報告を送信しました！', reportSentSub:'チームが間もなく確認します', reportReasons:['不適切な行動','ハラスメント','偽プロフィール/詐欺','不適切なコンテンツ','その他'], },
      ko: { translating:'메시지 번역 중...', originalMsg:'원문', autoTranslated:'자동 번역', notVerified:'신원 미인증', notVerifiedSub:'신원 인증 후 메시지를 보낼 수 있습니다', verifyNow:'지금 인증', placeholder:'메시지 입력...', faceInCircle:'원 안에 얼굴을 놓으세요', ticketTitle:'지원 티켓 보내기', ticketSub:'관련 문제 신고', ticketPlaceholder:'문제를 설명하세요...', ticketSent:'티켓이 제출되었습니다!', ticketSentSub:'관리자가 곧 답변드립니다', reportTitle:'사용자 신고', reportSent:'신고가 제출되었습니다!', reportSentSub:'팀이 곧 검토합니다', reportReasons:['부적절한 행동','괴롭힘','가짜 프로필/사기','부적절한 콘텐츠','기타'], },
      fr: { translating:'Traduction en cours...', originalMsg:'Original', autoTranslated:'Traduit automatiquement', notVerified:'Identité non vérifiée', notVerifiedSub:'Vérifiez votre identité pour envoyer des messages', verifyNow:'Vérifier maintenant', placeholder:'Tapez votre message...', faceInCircle:'Placez votre visage dans le cercle', ticketTitle:'Envoyer un ticket de support', ticketSub:'Signaler un problème avec', ticketPlaceholder:"Décrivez le problème...", ticketSent:'Ticket envoyé !', ticketSentSub:"L'admin vous contactera bientôt", reportTitle:'Signaler un utilisateur', reportSent:'Signalement envoyé !', reportSentSub:'Notre équipe examinera bientôt', reportReasons:['Comportement inapproprié','Harcèlement','Faux profil/arnaque','Contenu inapproprié','Autre'], },
      de: { translating:'Nachrichten werden übersetzt...', originalMsg:'Original', autoTranslated:'Automatisch übersetzt', notVerified:'Identität nicht verifiziert', notVerifiedSub:'Verifizieren Sie sich, um Nachrichten zu senden', verifyNow:'Jetzt verifizieren', placeholder:'Nachricht eingeben...', faceInCircle:'Platzieren Sie Ihr Gesicht im Kreis', ticketTitle:'Support-Ticket senden', ticketSub:'Problem melden mit', ticketPlaceholder:'Beschreiben Sie das Problem...', ticketSent:'Ticket gesendet!', ticketSentSub:'Der Admin wird sich bald melden', reportTitle:'Nutzer melden', reportSent:'Meldung gesendet!', reportSentSub:'Unser Team wird es prüfen', reportReasons:['Unangemessenes Verhalten','Belästigung','Falsches Profil/Betrug','Unangemessene Inhalte','Sonstiges'], },
      es: { translating:'Traduciendo mensajes...', originalMsg:'Original', autoTranslated:'Traducido automáticamente', notVerified:'Identidad no verificada', notVerifiedSub:'Verifica tu identidad para enviar mensajes', verifyNow:'Verificar ahora', placeholder:'Escribe tu mensaje...', faceInCircle:'Coloca tu cara en el círculo', ticketTitle:'Enviar ticket de soporte', ticketSub:'Reportar problema con', ticketPlaceholder:'Describe el problema...', ticketSent:'¡Ticket enviado!', ticketSentSub:'El admin te contactará pronto', reportTitle:'Reportar usuario', reportSent:'¡Reporte enviado!', reportSentSub:'Nuestro equipo lo revisará pronto', reportReasons:['Comportamiento inapropiado','Acoso','Perfil falso/estafa','Contenido inapropiado','Otro'], },
      it: { translating:'Traduzione messaggi...', originalMsg:'Originale', autoTranslated:'Tradotto automaticamente', notVerified:'Identità non verificata', notVerifiedSub:"Verifica l'identità per inviare messaggi", verifyNow:'Verifica ora', placeholder:'Scrivi un messaggio...', faceInCircle:'Posiziona il viso nel cerchio', ticketTitle:'Invia ticket di supporto', ticketSub:'Segnala problema con', ticketPlaceholder:'Descrivi il problema...', ticketSent:'Ticket inviato!', ticketSentSub:"L'admin ti contatterà presto", reportTitle:'Segnala utente', reportSent:'Segnalazione inviata!', reportSentSub:'Il nostro team esaminerà presto', reportReasons:['Comportamento inappropriato','Molestie','Profilo falso/truffa','Contenuto inappropriato','Altro'], },
      pt: { translating:'Traduzindo mensagens...', originalMsg:'Original', autoTranslated:'Traduzido automaticamente', notVerified:'Identidade não verificada', notVerifiedSub:'Verifique sua identidade para enviar mensagens', verifyNow:'Verificar agora', placeholder:'Digite sua mensagem...', faceInCircle:'Coloque seu rosto no círculo', ticketTitle:'Enviar ticket de suporte', ticketSub:'Reportar problema com', ticketPlaceholder:'Descreva o problema...', ticketSent:'Ticket enviado!', ticketSentSub:'O admin entrará em contato em breve', reportTitle:'Reportar usuário', reportSent:'Denúncia enviada!', reportSentSub:'Nossa equipe revisará em breve', reportReasons:['Comportamento inadequado','Assédio','Perfil falso/golpe','Conteúdo inadequado','Outro'], },
      ru: { translating:'Перевод сообщений...', originalMsg:'Оригинал', autoTranslated:'Автоперевод', notVerified:'Личность не подтверждена', notVerifiedSub:'Подтвердите личность для отправки сообщений', verifyNow:'Подтвердить сейчас', placeholder:'Введите сообщение...', faceInCircle:'Поместите лицо в круг', ticketTitle:'Отправить тикет поддержки', ticketSub:'Сообщить о проблеме с', ticketPlaceholder:'Опишите проблему...', ticketSent:'Тикет отправлен!', ticketSentSub:'Администратор свяжется в ближайшее время', reportTitle:'Пожаловаться на пользователя', reportSent:'Жалоба отправлена!', reportSentSub:'Наша команда скоро проверит', reportReasons:['Неподобающее поведение','Домогательства','Фейковый профиль/мошенничество','Неподобающий контент','Другое'], },
      ar: { translating:'جار ترجمة الرسائل...', originalMsg:'الأصل', autoTranslated:'مترجم تلقائياً', notVerified:'الهوية غير موثقة', notVerifiedSub:'وثّق هويتك لإرسال الرسائل', verifyNow:'توثيق الآن', placeholder:'اكتب رسالتك...', faceInCircle:'ضع وجهك داخل الدائرة', ticketTitle:'إرسال تذكرة دعم', ticketSub:'الإبلاغ عن مشكلة مع', ticketPlaceholder:'اشرح المشكلة...', ticketSent:'تم إرسال التذكرة!', ticketSentSub:'سيتواصل معك المسؤول قريباً', reportTitle:'الإبلاغ عن مستخدم', reportSent:'تم الإبلاغ!', reportSentSub:'سيراجع فريقنا قريباً', reportReasons:['سلوك غير لائق','تحرش','ملف مزيف/احتيال','محتوى غير لائق','أخرى'], },
      hi: { translating:'संदेश अनुवाद हो रहे हैं...', originalMsg:'मूल', autoTranslated:'स्वचालित अनुवाद', notVerified:'पहचान सत्यापित नहीं', notVerifiedSub:'संदेश भेजने के लिए पहचान सत्यापित करें', verifyNow:'अभी सत्यापित करें', placeholder:'संदेश टाइप करें...', faceInCircle:'अपना चेहरा वृत्त में रखें', ticketTitle:'सहायता टिकट भेजें', ticketSub:'के साथ समस्या की रिपोर्ट करें', ticketPlaceholder:'समस्या का वर्णन करें...', ticketSent:'टिकट सबमिट हो गया!', ticketSentSub:'व्यवस्थापक जल्द संपर्क करेगा', reportTitle:'उपयोगकर्ता की रिपोर्ट करें', reportSent:'रिपोर्ट सबमिट हो गई!', reportSentSub:'हमारी टीम जल्द समीक्षा करेगी', reportReasons:['अनुचित व्यवहार','उत्पीड़न','नकली प्रोफ़ाइल/धोखाधड़ी','अनुचित सामग्री','अन्य'], },
      vi: { translating:'Đang dịch tin nhắn...', originalMsg:'Gốc', autoTranslated:'Dịch tự động', notVerified:'Chưa xác minh danh tính', notVerifiedSub:'Xác minh danh tính để gửi tin nhắn', verifyNow:'Xác minh ngay', placeholder:'Nhập tin nhắn...', faceInCircle:'Đặt khuôn mặt vào vòng tròn', ticketTitle:'Gửi phiếu hỗ trợ', ticketSub:'Báo cáo vấn đề với', ticketPlaceholder:'Mô tả vấn đề...', ticketSent:'Đã gửi phiếu!', ticketSentSub:'Admin sẽ liên hệ sớm', reportTitle:'Báo cáo người dùng', reportSent:'Đã gửi báo cáo!', reportSentSub:'Đội ngũ sẽ xem xét sớm', reportReasons:['Hành vi không phù hợp','Quấy rối','Hồ sơ giả/lừa đảo','Nội dung không phù hợp','Khác'], },
      id: { translating:'Menerjemahkan pesan...', originalMsg:'Asli', autoTranslated:'Diterjemahkan otomatis', notVerified:'Identitas belum diverifikasi', notVerifiedSub:'Verifikasi identitas untuk mengirim pesan', verifyNow:'Verifikasi Sekarang', placeholder:'Ketik pesan...', faceInCircle:'Letakkan wajah Anda di dalam lingkaran', ticketTitle:'Kirim Tiket Dukungan', ticketSub:'Laporkan masalah dengan', ticketPlaceholder:'Jelaskan masalahnya...', ticketSent:'Tiket terkirim!', ticketSentSub:'Admin akan segera menindaklanjuti', reportTitle:'Laporkan Pengguna', reportSent:'Laporan terkirim!', reportSentSub:'Tim kami akan segera meninjau', reportReasons:['Perilaku tidak pantas','Pelecehan','Profil palsu/penipuan','Konten tidak pantas','Lainnya'], },
      ms: { translating:'Menterjemah mesej...', originalMsg:'Asal', autoTranslated:'Diterjemah secara automatik', notVerified:'Identiti belum disahkan', notVerifiedSub:'Sahkan identiti untuk menghantar mesej', verifyNow:'Sahkan Sekarang', placeholder:'Taip mesej...', faceInCircle:'Letakkan wajah anda dalam bulatan', ticketTitle:'Hantar Tiket Sokongan', ticketSub:'Laporkan masalah dengan', ticketPlaceholder:'Huraikan masalah...', ticketSent:'Tiket dihantar!', ticketSentSub:'Admin akan menghubungi tidak lama lagi', reportTitle:'Laporkan Pengguna', reportSent:'Laporan dihantar!', reportSentSub:'Pasukan kami akan menyemak tidak lama lagi', reportReasons:['Tingkah laku tidak sesuai','Gangguan','Profil palsu/penipuan','Kandungan tidak sesuai','Lain-lain'], },
    },
  
    // ─────────────────────────────────────────────
    // AUTH — Login / Register
    // ─────────────────────────────────────────────
    auth: {
      th: { login:'เข้าสู่ระบบ', register:'สมัครสมาชิก', email:'อีเมล', password:'รหัสผ่าน', forgotPassword:'ลืมรหัสผ่าน?', noAccount:'ยังไม่มีบัญชี?', hasAccount:'มีบัญชีแล้ว?', continueGoogle:'ดำเนินการด้วย Google', },
      en: { login:'Log In', register:'Sign Up', email:'Email', password:'Password', forgotPassword:'Forgot password?', noAccount:"Don't have an account?", hasAccount:'Already have an account?', continueGoogle:'Continue with Google', },
      zh: { login:'登录', register:'注册', email:'电子邮件', password:'密码', forgotPassword:'忘记密码？', noAccount:'没有账户？', hasAccount:'已有账户？', continueGoogle:'使用Google继续', },
      ja: { login:'ログイン', register:'登録', email:'メールアドレス', password:'パスワード', forgotPassword:'パスワードを忘れた？', noAccount:'アカウントをお持ちでない方は？', hasAccount:'すでにアカウントをお持ちの方は？', continueGoogle:'Googleで続ける', },
      ko: { login:'로그인', register:'회원가입', email:'이메일', password:'비밀번호', forgotPassword:'비밀번호를 잊으셨나요?', noAccount:'계정이 없으신가요?', hasAccount:'이미 계정이 있으신가요?', continueGoogle:'Google로 계속', },
      fr: { login:'Se connecter', register:"S'inscrire", email:'E-mail', password:'Mot de passe', forgotPassword:'Mot de passe oublié?', noAccount:"Pas encore de compte?", hasAccount:'Déjà un compte?', continueGoogle:'Continuer avec Google', },
      de: { login:'Anmelden', register:'Registrieren', email:'E-Mail', password:'Passwort', forgotPassword:'Passwort vergessen?', noAccount:'Noch kein Konto?', hasAccount:'Bereits ein Konto?', continueGoogle:'Mit Google fortfahren', },
      es: { login:'Iniciar sesión', register:'Registrarse', email:'Correo electrónico', password:'Contraseña', forgotPassword:'¿Olvidaste tu contraseña?', noAccount:'¿No tienes cuenta?', hasAccount:'¿Ya tienes cuenta?', continueGoogle:'Continuar con Google', },
      it: { login:'Accedi', register:'Registrati', email:'Email', password:'Password', forgotPassword:'Password dimenticata?', noAccount:'Non hai un account?', hasAccount:'Hai già un account?', continueGoogle:'Continua con Google', },
      pt: { login:'Entrar', register:'Cadastrar', email:'E-mail', password:'Senha', forgotPassword:'Esqueceu a senha?', noAccount:'Não tem uma conta?', hasAccount:'Já tem uma conta?', continueGoogle:'Continuar com Google', },
      ru: { login:'Войти', register:'Регистрация', email:'Эл. почта', password:'Пароль', forgotPassword:'Забыли пароль?', noAccount:'Нет аккаунта?', hasAccount:'Уже есть аккаунт?', continueGoogle:'Продолжить с Google', },
      ar: { login:'تسجيل الدخول', register:'التسجيل', email:'البريد الإلكتروني', password:'كلمة المرور', forgotPassword:'نسيت كلمة المرور؟', noAccount:'ليس لديك حساب؟', hasAccount:'لديك حساب بالفعل؟', continueGoogle:'متابعة مع Google', },
      hi: { login:'लॉग इन', register:'साइन अप', email:'ईमेल', password:'पासवर्ड', forgotPassword:'पासवर्ड भूल गए?', noAccount:'खाता नहीं है?', hasAccount:'पहले से खाता है?', continueGoogle:'Google से जारी रखें', },
      vi: { login:'Đăng nhập', register:'Đăng ký', email:'Email', password:'Mật khẩu', forgotPassword:'Quên mật khẩu?', noAccount:'Chưa có tài khoản?', hasAccount:'Đã có tài khoản?', continueGoogle:'Tiếp tục với Google', },
      id: { login:'Masuk', register:'Daftar', email:'Email', password:'Kata Sandi', forgotPassword:'Lupa kata sandi?', noAccount:'Belum punya akun?', hasAccount:'Sudah punya akun?', continueGoogle:'Lanjutkan dengan Google', },
      ms: { login:'Log Masuk', register:'Daftar', email:'E-mel', password:'Kata Laluan', forgotPassword:'Lupa kata laluan?', noAccount:'Belum ada akaun?', hasAccount:'Sudah ada akaun?', continueGoogle:'Teruskan dengan Google', },
    },
  
    // ─────────────────────────────────────────────
    // PAYOUT (User)
    // ─────────────────────────────────────────────
    payout: {
      th: { title:'ขอถอนเงิน', availableBalance:'ยอดคงเหลือ', requestPayout:'ยืนยัน Request Payout', minAmount:'ยอดขั้นต่ำ', belowMin:'ยอดไม่ถึงขั้นต่ำ', belowMinSub:'ต้องมีอย่างน้อย €{min} ถึงจะ request ได้', paymentMethod:'ช่องทางรับเงิน', paymentDetail:'ข้อมูลการรับเงิน', note:'หมายเหตุ (ไม่บังคับ)', history:'ประวัติการถอนเงิน', submitted:'ส่ง Request แล้ว!', submittedSub:'Admin จะตรวจสอบและโอนเงินให้ภายใน 1-3 วันทำการ', processing:'1-3 วันทำการ', },
      en: { title:'Request Payout', availableBalance:'Available Balance', requestPayout:'Confirm Payout Request', minAmount:'Minimum Amount', belowMin:'Below Minimum', belowMinSub:'Need at least €{min} to request', paymentMethod:'Payment Method', paymentDetail:'Payment Details', note:'Note (optional)', history:'Payout History', submitted:'Request Submitted!', submittedSub:'Admin will transfer within 1-3 business days', processing:'1-3 business days', },
      zh: { title:'申请提款', availableBalance:'可用余额', requestPayout:'确认提款申请', minAmount:'最低金额', belowMin:'低于最低金额', belowMinSub:'需要至少€{min}才能申请', paymentMethod:'收款方式', paymentDetail:'收款信息', note:'备注（可选）', history:'提款历史', submitted:'申请已提交！', submittedSub:'管理员将在1-3个工作日内转账', processing:'1-3个工作日', },
      ja: { title:'出金申請', availableBalance:'利用可能残高', requestPayout:'出金申請を確認', minAmount:'最低金額', belowMin:'最低金額未満', belowMinSub:'申請には最低€{min}必要です', paymentMethod:'支払方法', paymentDetail:'支払詳細', note:'メモ（任意）', history:'出金履歴', submitted:'申請が送信されました！', submittedSub:'管理者が1〜3営業日以内に送金します', processing:'1〜3営業日', },
      ko: { title:'출금 요청', availableBalance:'사용 가능 잔액', requestPayout:'출금 요청 확인', minAmount:'최소 금액', belowMin:'최소 금액 미만', belowMinSub:'요청하려면 최소 €{min}이 필요합니다', paymentMethod:'지불 방법', paymentDetail:'지불 세부 정보', note:'메모 (선택 사항)', history:'출금 내역', submitted:'요청이 제출되었습니다!', submittedSub:'관리자가 1-3 영업일 이내에 이체합니다', processing:'1-3 영업일', },
      fr: { title:'Demande de retrait', availableBalance:'Solde disponible', requestPayout:'Confirmer la demande', minAmount:'Montant minimum', belowMin:'En dessous du minimum', belowMinSub:'Il faut au moins €{min} pour demander', paymentMethod:'Méthode de paiement', paymentDetail:'Détails de paiement', note:'Note (facultatif)', history:'Historique des retraits', submitted:'Demande envoyée!', submittedSub:"L'admin transférera dans 1-3 jours ouvrables", processing:'1-3 jours ouvrables', },
      de: { title:'Auszahlung anfordern', availableBalance:'Verfügbares Guthaben', requestPayout:'Auszahlung bestätigen', minAmount:'Mindestbetrag', belowMin:'Unter Mindestbetrag', belowMinSub:'Mindestens €{min} erforderlich', paymentMethod:'Zahlungsmethode', paymentDetail:'Zahlungsdetails', note:'Notiz (optional)', history:'Auszahlungsverlauf', submitted:'Anfrage gesendet!', submittedSub:'Admin überweist innerhalb von 1-3 Werktagen', processing:'1-3 Werktage', },
      es: { title:'Solicitar retiro', availableBalance:'Saldo disponible', requestPayout:'Confirmar solicitud', minAmount:'Monto mínimo', belowMin:'Por debajo del mínimo', belowMinSub:'Se necesita al menos €{min} para solicitar', paymentMethod:'Método de pago', paymentDetail:'Detalles de pago', note:'Nota (opcional)', history:'Historial de retiros', submitted:'¡Solicitud enviada!', submittedSub:'El admin transferirá en 1-3 días hábiles', processing:'1-3 días hábiles', },
      it: { title:'Richiedi prelievo', availableBalance:'Saldo disponibile', requestPayout:'Conferma richiesta', minAmount:'Importo minimo', belowMin:'Sotto il minimo', belowMinSub:'Serve almeno €{min} per richiedere', paymentMethod:'Metodo di pagamento', paymentDetail:'Dettagli pagamento', note:'Nota (opzionale)', history:'Cronologia prelievi', submitted:'Richiesta inviata!', submittedSub:"L'admin trasferirà entro 1-3 giorni lavorativi", processing:'1-3 giorni lavorativi', },
      pt: { title:'Solicitar saque', availableBalance:'Saldo disponível', requestPayout:'Confirmar solicitação', minAmount:'Valor mínimo', belowMin:'Abaixo do mínimo', belowMinSub:'Precisa de pelo menos €{min} para solicitar', paymentMethod:'Método de pagamento', paymentDetail:'Detalhes de pagamento', note:'Nota (opcional)', history:'Histórico de saques', submitted:'Solicitação enviada!', submittedSub:'O admin transferirá em 1-3 dias úteis', processing:'1-3 dias úteis', },
      ru: { title:'Запрос вывода', availableBalance:'Доступный баланс', requestPayout:'Подтвердить вывод', minAmount:'Минимальная сумма', belowMin:'Ниже минимума', belowMinSub:'Необходимо минимум €{min}', paymentMethod:'Способ оплаты', paymentDetail:'Платёжные реквизиты', note:'Примечание (необязательно)', history:'История выводов', submitted:'Запрос отправлен!', submittedSub:'Администратор переведёт в течение 1-3 рабочих дней', processing:'1-3 рабочих дня', },
      ar: { title:'طلب سحب', availableBalance:'الرصيد المتاح', requestPayout:'تأكيد طلب السحب', minAmount:'الحد الأدنى', belowMin:'أقل من الحد الأدنى', belowMinSub:'تحتاج على الأقل €{min} للطلب', paymentMethod:'طريقة الدفع', paymentDetail:'تفاصيل الدفع', note:'ملاحظة (اختياري)', history:'سجل السحب', submitted:'تم إرسال الطلب!', submittedSub:'سيحوّل المسؤول خلال 1-3 أيام عمل', processing:'1-3 أيام عمل', },
      hi: { title:'भुगतान अनुरोध', availableBalance:'उपलब्ध शेष', requestPayout:'भुगतान अनुरोध की पुष्टि करें', minAmount:'न्यूनतम राशि', belowMin:'न्यूनतम से कम', belowMinSub:'अनुरोध के लिए कम से कम €{min} चाहिए', paymentMethod:'भुगतान विधि', paymentDetail:'भुगतान विवरण', note:'नोट (वैकल्पिक)', history:'भुगतान इतिहास', submitted:'अनुरोध सबमिट हो गया!', submittedSub:'व्यवस्थापक 1-3 कार्य दिवसों में स्थानांतरित करेगा', processing:'1-3 कार्य दिवस', },
      vi: { title:'Yêu cầu rút tiền', availableBalance:'Số dư khả dụng', requestPayout:'Xác nhận yêu cầu', minAmount:'Số tiền tối thiểu', belowMin:'Dưới mức tối thiểu', belowMinSub:'Cần ít nhất €{min} để yêu cầu', paymentMethod:'Phương thức thanh toán', paymentDetail:'Chi tiết thanh toán', note:'Ghi chú (tùy chọn)', history:'Lịch sử rút tiền', submitted:'Yêu cầu đã gửi!', submittedSub:'Admin sẽ chuyển trong 1-3 ngày làm việc', processing:'1-3 ngày làm việc', },
      id: { title:'Minta Penarikan', availableBalance:'Saldo Tersedia', requestPayout:'Konfirmasi Penarikan', minAmount:'Jumlah Minimum', belowMin:'Di Bawah Minimum', belowMinSub:'Perlu minimal €{min} untuk mengajukan', paymentMethod:'Metode Pembayaran', paymentDetail:'Detail Pembayaran', note:'Catatan (opsional)', history:'Riwayat Penarikan', submitted:'Permintaan Terkirim!', submittedSub:'Admin akan mentransfer dalam 1-3 hari kerja', processing:'1-3 hari kerja', },
      ms: { title:'Minta Pengeluaran', availableBalance:'Baki Tersedia', requestPayout:'Sahkan Permintaan', minAmount:'Jumlah Minimum', belowMin:'Di Bawah Minimum', belowMinSub:'Perlu sekurang-kurangnya €{min} untuk meminta', paymentMethod:'Kaedah Pembayaran', paymentDetail:'Butiran Pembayaran', note:'Nota (pilihan)', history:'Sejarah Pengeluaran', submitted:'Permintaan Dihantar!', submittedSub:'Admin akan memindahkan dalam 1-3 hari bekerja', processing:'1-3 hari bekerja', },
    },
  };
  
  /**
   * ดึง translation object สำหรับ page + language
   * @param {string} page - 'common' | 'discover' | 'messages' | 'chat' | 'auth' | 'payout'
   * @param {string} lang - 'th' | 'en' | 'zh' | ...
   * @returns {object} translation keys
   */
  export function getT(page, lang = 'en') {
    const pageTrans = T[page];
    if (!pageTrans) return {};
    return pageTrans[lang] || pageTrans['en'] || {};
  }
  
  /**
   * ดึง translation หลายหน้าพร้อมกัน + common
   * @param {string[]} pages
   * @param {string} lang
   * @returns {object} merged translation
   */
  export function getTMany(pages, lang = 'en') {
    const result = { ...getT('common', lang) };
    for (const page of pages) {
      Object.assign(result, getT(page, lang));
    }
    return result;
  }
  
  export default T;
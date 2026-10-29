/**
 * Données descriptives du schéma Supabase de l'Étape 1
 */

export interface TableSpec {
  name: string;
  category: string;
  descriptionFr: string;
  descriptionAr: string;
  columnsCount: number;
  hasRLS: boolean;
  securityFr: string;
  securityAr: string;
  columns: {
    name: string;
    type: string;
    isPrimary?: boolean;
    isForeign?: boolean;
    nullable?: boolean;
    descFr: string;
    descAr: string;
  }[];
}

export const SQL_TABLES: TableSpec[] = [
  {
    name: 'user_profiles',
    category: 'Sécurité & Authentification',
    descriptionFr: 'Profils abonnés, rôles RBAC (admin/viewer), quota appareils et date d’expiration.',
    descriptionAr: 'ملفات تعريف المشتركين، الصلاحيات، حصة الأجهزة وتاريخ انتهاء الصلاحية.',
    columnsCount: 8,
    hasRLS: true,
    securityFr: 'Admin: accès total. Viewer: lecture de son propre profil uniquement.',
    securityAr: 'المشرف: وصول كامل. المشاهد: قراءة ملفه الشخصي فقط.',
    columns: [
      { name: 'id', type: 'UUID', isPrimary: true, isForeign: true, descFr: 'Clé primaire liée à auth.users(id)', descAr: 'المفتاح الأساسي المرتبط بالمستخدم' },
      { name: 'email', type: 'TEXT', nullable: false, descFr: 'Adresse email du compte', descAr: 'البريد الإلكتروني' },
      { name: 'role', type: 'TEXT (admin | viewer)', nullable: false, descFr: 'Rôle d’accès système', descAr: 'صلاحية النظام' },
      { name: 'is_active', type: 'BOOLEAN', nullable: false, descFr: 'Statut du compte (actif/suspendu)', descAr: 'حالة الحساب' },
      { name: 'max_devices', type: 'INTEGER', nullable: false, descFr: 'Nombre max d’écrans simultanés (1-10)', descAr: 'الحد الأقصى للشاشات المسموحة' },
      { name: 'expires_at', type: 'TIMESTAMPTZ', descFr: 'Date de fin de l’abonnement', descAr: 'تاريخ انتهاء الاشتراك' },
      { name: 'created_at', type: 'TIMESTAMPTZ', descFr: 'Date de création', descAr: 'تاريخ الإنشاء' },
      { name: 'updated_at', type: 'TIMESTAMPTZ', descFr: 'Dernière mise à jour automatique', descAr: 'تاريخ التحديث التلقائي' },
    ],
  },
  {
    name: 'sources',
    category: 'Fournisseurs & Synchro',
    descriptionFr: 'Sources autorisées M3U, Xtream Codes et Stalker Portal. Données ultra-confidentielles.',
    descriptionAr: 'المصادر المعتمدة M3U و Xtream Codes و Stalker. بيانات سرية للغاية.',
    columnsCount: 14,
    hasRLS: true,
    securityFr: 'STRICTEMENT ADMIN. 100% bloqué pour les applications clientes et viewers.',
    securityAr: 'حصري للمشرف فقط. محظور تماماً عن تطبيقات العملاء والمشاهدين.',
    columns: [
      { name: 'id', type: 'UUID', isPrimary: true, descFr: 'Identifiant unique de la source', descAr: 'المعرف الفريد للمصدر' },
      { name: 'name', type: 'TEXT', nullable: false, descFr: 'Nom convivial de la source', descAr: 'اسم المصدر' },
      { name: 'type', type: 'TEXT (m3u|xtream|stalker)', nullable: false, descFr: 'Protocole de la source', descAr: 'نوع بروتوكول المصدر' },
      { name: 'server_url', type: 'TEXT', nullable: false, descFr: 'URL du serveur fournisseur', descAr: 'رابط خادم المزود' },
      { name: 'username', type: 'TEXT', descFr: 'Identifiant fournisseur (sécurisé)', descAr: 'اسم المستخدم للمزود' },
      { name: 'password', type: 'TEXT', descFr: 'Mot de passe fournisseur (sécurisé)', descAr: 'كلمة سر المزود' },
      { name: 'mac_address', type: 'TEXT', descFr: 'Adresse MAC pour Stalker Portal', descAr: 'عنوان MAC لبوابة ستالكر' },
      { name: 'is_active', type: 'BOOLEAN', descFr: 'Activation / Désactivation', descAr: 'تفعيل أو تعطيل المصدر' },
      { name: 'sync_interval_hours', type: 'INTEGER', descFr: 'Fréquence de synchronisation (h)', descAr: 'دورة المزامنة بالساعات' },
      { name: 'last_sync_at', type: 'TIMESTAMPTZ', descFr: 'Horodatage de la dernière synchro', descAr: 'تاريخ آخر مزامنة' },
      { name: 'last_sync_status', type: 'TEXT', descFr: 'pending | running | success | failed', descAr: 'حالة آخر عملية مزامنة' },
      { name: 'last_error', type: 'TEXT', descFr: 'Détail de la dernière erreur rencontrée', descAr: 'تفاصيل الخطأ الأخير' },
    ],
  },
  {
    name: 'categories',
    category: 'Catalogue',
    descriptionFr: 'Catégories Live TV, Films et Séries avec prise en charge du bilinguisme FR/AR.',
    descriptionAr: 'تصنيفات البث المباشر والأفلام والمسلسلات مع دعم اللغتين الفرنسية والعربية.',
    columnsCount: 10,
    hasRLS: true,
    securityFr: 'Admin: CRUD complet. Abonnés actifs: lecture des catégories visibles uniquement.',
    securityAr: 'المشرف: إدارة كاملة. المشتركون النشطون: قراءة التصنيفات المرئية فقط.',
    columns: [
      { name: 'id', type: 'UUID', isPrimary: true, descFr: 'Clé primaire', descAr: 'المفتاح الأساسي' },
      { name: 'source_id', type: 'UUID', isForeign: true, descFr: 'Lien vers sources(id)', descAr: 'معرف المصدر' },
      { name: 'category_type', type: 'TEXT (live|movie|series)', nullable: false, descFr: 'Type de contenu', descAr: 'نوع المحتوى' },
      { name: 'category_ext_id', type: 'TEXT', descFr: 'ID externe attribué par le fournisseur', descAr: 'المعرف الخارجي للمزود' },
      { name: 'name', type: 'TEXT', nullable: false, descFr: 'Libellé en français', descAr: 'الاسم بالفرنسية' },
      { name: 'name_ar', type: 'TEXT', descFr: 'Libellé en arabe', descAr: 'الاسم بالعربية' },
      { name: 'is_visible', type: 'BOOLEAN', descFr: 'Visibilité dans les applications', descAr: 'إمكانية الظهور في التطبيق' },
      { name: 'sort_order', type: 'INTEGER', descFr: 'Ordre d’affichage prioritaire', descAr: 'ترتيب العرض' },
    ],
  },
  {
    name: 'channels',
    category: 'Catalogue',
    descriptionFr: 'Chaînes de télévision en direct (Live TV) avec logo, numérotation et lien EPG.',
    descriptionAr: 'قنوات البث التلفزيوني المباشر مع الشعارات، الترقيم ودليل البرامج.',
    columnsCount: 13,
    hasRLS: true,
    securityFr: 'Abonnés actifs uniquement. Les abonnements expirés ne peuvent pas lire les flux.',
    securityAr: 'للمشتركين النشطين فقط. الاشتراكات المنتهية لا يمكنها قراءة الروابط.',
    columns: [
      { name: 'id', type: 'UUID', isPrimary: true, descFr: 'Clé primaire de la chaîne', descAr: 'المعرف الفريد للقناة' },
      { name: 'source_id', type: 'UUID', isForeign: true, descFr: 'Lien source', descAr: 'معرف المصدر' },
      { name: 'category_id', type: 'UUID', isForeign: true, descFr: 'Lien catégorie', descAr: 'معرف التصنيف' },
      { name: 'name', type: 'TEXT', nullable: false, descFr: 'Nom de la chaîne', descAr: 'اسم القناة' },
      { name: 'stream_url', type: 'TEXT', nullable: false, descFr: 'Flux HLS/MPEG-TS', descAr: 'رابط البث المباشر' },
      { name: 'logo_url', type: 'TEXT', descFr: 'Logo haute résolution', descAr: 'شعار القناة' },
      { name: 'epg_channel_id', type: 'TEXT', descFr: 'Identifiant du canal EPG XMLTV', descAr: 'معرف القناة في دليل EPG' },
      { name: 'is_active', type: 'BOOLEAN', descFr: 'Actif ou masqué', descAr: 'مفعلة أو معطلة' },
    ],
  },
  {
    name: 'movies',
    category: 'Catalogue VOD',
    descriptionFr: 'Films VOD avec métadonnées complètes, jaquettes, note et durée.',
    descriptionAr: 'أفلام الفيديو حسب الطلب مع البيانات الوصفية، البوسترات والتقييمات.',
    columnsCount: 14,
    hasRLS: true,
    securityFr: 'Abonnés actifs uniquement.',
    securityAr: 'للمشتركين النشطين فقط.',
    columns: [
      { name: 'id', type: 'UUID', isPrimary: true, descFr: 'Clé primaire', descAr: 'المفتاح الأساسي' },
      { name: 'title', type: 'TEXT', nullable: false, descFr: 'Titre du film', descAr: 'عنوان الفيلم' },
      { name: 'stream_url', type: 'TEXT', nullable: false, descFr: 'URL vidéo MP4/MKV', descAr: 'رابط الفيديو' },
      { name: 'poster_url', type: 'TEXT', descFr: 'Affiche verticale', descAr: 'صورة البوستر' },
      { name: 'rating', type: 'NUMERIC(3,1)', descFr: 'Note sur 10', descAr: 'التقييم من 10' },
      { name: 'release_year', type: 'INTEGER', descFr: 'Année de sortie', descAr: 'سنة الإصدار' },
      { name: 'duration_mins', type: 'INTEGER', descFr: 'Durée en minutes', descAr: 'المدة بالدقائق' },
      { name: 'synopsis', type: 'TEXT', descFr: 'Résumé du film', descAr: 'ملخص الفيلم' },
    ],
  },
  {
    name: 'series',
    category: 'Catalogue VOD',
    descriptionFr: 'Séries télévisées avec affiches, saisons et résumé scénaristique.',
    descriptionAr: 'المسلسلات التلفزيونية مع البوسترات، عدد المواسم والقصة.',
    columnsCount: 12,
    hasRLS: true,
    securityFr: 'Abonnés actifs uniquement.',
    securityAr: 'للمشتركين النشطين فقط.',
    columns: [
      { name: 'id', type: 'UUID', isPrimary: true, descFr: 'Clé primaire série', descAr: 'المفتاح الأساسي للمسلسل' },
      { name: 'title', type: 'TEXT', nullable: false, descFr: 'Titre de la série', descAr: 'عنوان المسلسل' },
      { name: 'poster_url', type: 'TEXT', descFr: 'Affiche', descAr: 'البوستر' },
      { name: 'rating', type: 'NUMERIC(3,1)', descFr: 'Note', descAr: 'التقييم' },
      { name: 'seasons_count', type: 'INTEGER', descFr: 'Nombre total de saisons', descAr: 'عدد المواسم' },
      { name: 'is_active', type: 'BOOLEAN', descFr: 'Disponibilité', descAr: 'الحالة' },
    ],
  },
  {
    name: 'episodes',
    category: 'Catalogue VOD',
    descriptionFr: 'Épisodes rattachés aux séries avec numéro de saison, durée et flux.',
    descriptionAr: 'حلقات المسلسلات مع أرقام المواسم والحلقات والمدة وروابط التشغيل.',
    columnsCount: 11,
    hasRLS: true,
    securityFr: 'Abonnés actifs uniquement.',
    securityAr: 'للمشتركين النشطين فقط.',
    columns: [
      { name: 'id', type: 'UUID', isPrimary: true, descFr: 'Clé primaire épisode', descAr: 'المفتاح الأساسي للحلقة' },
      { name: 'series_id', type: 'UUID', isForeign: true, descFr: 'Lien vers series(id)', descAr: 'معرف المسلسل' },
      { name: 'season_number', type: 'INTEGER', descFr: 'Numéro de saison', descAr: 'رقم الموسم' },
      { name: 'episode_number', type: 'INTEGER', descFr: 'Numéro de l’épisode', descAr: 'رقم الحلقة' },
      { name: 'title', type: 'TEXT', descFr: 'Titre de l’épisode', descAr: 'عنوان الحلقة' },
      { name: 'stream_url', type: 'TEXT', descFr: 'URL vidéo', descAr: 'رابط التشغيل' },
    ],
  },
  {
    name: 'epg_programs',
    category: 'Guide TV (EPG)',
    descriptionFr: 'Grille des programmes en direct avec heure de début, fin, titre et descriptif.',
    descriptionAr: 'جدول البرامج التلفزيونية الحية مع أوقات البدء والانتهاء والتفاصيل.',
    columnsCount: 8,
    hasRLS: true,
    securityFr: 'Lecture autorisée pour tous les abonnés connectés.',
    securityAr: 'متاح للقراءة لجميع المشتركين المتصلين.',
    columns: [
      { name: 'id', type: 'UUID', isPrimary: true, descFr: 'ID du programme', descAr: 'معرف البرنامج' },
      { name: 'channel_id', type: 'UUID', isForeign: true, descFr: 'Lien chaîne', descAr: 'معرف القناة' },
      { name: 'epg_channel_id', type: 'TEXT', descFr: 'ID canal XMLTV', descAr: 'معرف القناة في XMLTV' },
      { name: 'title', type: 'TEXT', descFr: 'Titre de l’émission', descAr: 'اسم البرنامج أو الفيلم' },
      { name: 'start_time', type: 'TIMESTAMPTZ', descFr: 'Début', descAr: 'وقت البدء' },
      { name: 'end_time', type: 'TIMESTAMPTZ', descFr: 'Fin', descAr: 'وقت الانتهاء' },
    ],
  },
  {
    name: 'sync_logs',
    category: 'Audit & Journalisation',
    descriptionFr: 'Historique des synchronisations avec comptage, temps d’exécution et erreurs.',
    descriptionAr: 'سجل المزامنة مع الإحصائيات، وقت التنفيذ وسجل الأخطاء.',
    columnsCount: 12,
    hasRLS: true,
    securityFr: 'STRICTEMENT ADMIN.',
    securityAr: 'حصري للمشرف فقط.',
    columns: [
      { name: 'id', type: 'UUID', isPrimary: true, descFr: 'ID du journal', descAr: 'معرف السجل' },
      { name: 'source_id', type: 'UUID', isForeign: true, descFr: 'Source synchronisée', descAr: 'المصدر' },
      { name: 'status', type: 'TEXT', descFr: 'started | success | failed | partial', descAr: 'حالة العملية' },
      { name: 'channels_count', type: 'INTEGER', descFr: 'Nombre de chaînes importées', descAr: 'عدد القنوات المحدثة' },
      { name: 'movies_count', type: 'INTEGER', descFr: 'Nombre de films importés', descAr: 'عدد الأفلام المحدثة' },
      { name: 'series_count', type: 'INTEGER', descFr: 'Nombre de séries importées', descAr: 'عدد المسلسلات' },
      { name: 'error_details', type: 'TEXT', descFr: 'Message d’erreur si échec', descAr: 'تفاصيل الخطأ' },
      { name: 'duration_ms', type: 'INTEGER', descFr: 'Temps d’exécution en ms', descAr: 'المدة بالميلي ثانية' },
    ],
  },
  {
    name: 'client_devices',
    category: 'Sécurité Appareils',
    descriptionFr: 'Gestion des terminaux Android et Android TV connectés avec contrôle des limites.',
    descriptionAr: 'إدارة أجهزة أندرويد وتلفزيون أندرويد المتصلة مع ضبط الحدود.',
    columnsCount: 10,
    hasRLS: true,
    securityFr: 'Chaque abonné gère ses appareils. Admin vue globale et révocation.',
    securityAr: 'يدير كل مشترك أجهزته الخاصة. يملك المشرف نظرة شاملة وإمكانية الحظر.',
    columns: [
      { name: 'id', type: 'UUID', isPrimary: true, descFr: 'ID session appareil', descAr: 'معرف الجهاز' },
      { name: 'user_id', type: 'UUID', isForeign: true, descFr: 'Abonné propriétaire', descAr: 'معرف المستخدم' },
      { name: 'device_id', type: 'TEXT', descFr: 'UUID matériel unique', descAr: 'المعرف المادي للجهاز' },
      { name: 'device_type', type: 'TEXT (android_tv|android_mobile|web)', descFr: 'Type d’appareil', descAr: 'نوع الجهاز' },
      { name: 'is_revoked', type: 'BOOLEAN', descFr: 'Révocation immédiate', descAr: 'حظر الجهاز' },
      { name: 'last_seen_at', type: 'TIMESTAMPTZ', descFr: 'Dernier signalement réseau', descAr: 'آخر ظهور' },
    ],
  },
  {
    name: 'user_favorites',
    category: 'Personnalisation',
    descriptionFr: 'Chaînes, films et séries favoris synchronisés par utilisateur.',
    descriptionAr: 'قنوات وأفلام ومسلسلات مفضلة متزامنة لكل مستخدم.',
    columnsCount: 5,
    hasRLS: true,
    securityFr: 'Chaque utilisateur gère ses propres favoris.',
    securityAr: 'يدير كل مستخدم مفضلاته الشخصية.',
    columns: [
      { name: 'id', type: 'UUID', isPrimary: true, descFr: 'ID favori', descAr: 'معرف المفضلة' },
      { name: 'user_id', type: 'UUID', isForeign: true, descFr: 'Lien abonné', descAr: 'معرف المستخدم' },
      { name: 'item_type', type: 'TEXT (channel|movie|series)', descFr: 'Type d’élément', descAr: 'نوع العنصر' },
      { name: 'item_id', type: 'UUID', descFr: 'ID de l’élément favori', descAr: 'معرف العنصر' },
    ],
  },
];

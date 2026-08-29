import React, { useState, useEffect } from 'react';

// ==========================================
// DATA DEFAULT PORTFOLIO (Sesuai Gambar User)
// ==========================================
const DEFAULT_PROJECTS = [
  {
    id: '1',
    title: 'Deploy',
    description: 'Toolkit manajemen server yang disederhanakan yang mengotomatiskan deployment, SSL, log, dan rilis zero-downtime untuk tim modern.',
    meta: 'Twitter · 2023',
    theme: 'deploy',
    visits: 1420,
    clicks: 342
  },
  {
    id: '2',
    title: 'Screencast',
    description: 'Platform kursus untuk para kreator dan tim lengkap dengan daftar putar, pelacakan kemajuan, kuis, dan alat penulisan materi yang bersih.',
    meta: 'Meta · 2024',
    theme: 'screencast',
    visits: 980,
    clicks: 189
  },
  {
    id: '3',
    title: 'Commerce',
    description: 'Sistem desain e-commerce siap produksi dengan alur pembayaran, halaman produk, analitik, dan pola admin premium.',
    meta: 'Apple · 2025',
    theme: 'commerce',
    visits: 2310,
    clicks: 512
  },
  {
    id: '4',
    title: 'Provision',
    description: 'Platform yang menyediakan server ke tahap produksi dalam hitungan menit lengkap dengan preset, rahasia, rollback, dan log audit.',
    meta: 'Twitter · 2023',
    theme: 'provision',
    visits: 850,
    clicks: 120
  },
  {
    id: '5',
    title: 'Axis',
    description: 'Dasbor perdagangan yang mudah diakses yang mengubah data toko menjadi keputusan jelas dengan metrik utama (KPI), tren, kohort, dan peringatan.',
    meta: 'Stripe · 2024',
    theme: 'axis',
    visits: 3100,
    clicks: 890
  },
  {
    id: '6',
    title: 'Clinic',
    description: 'Templat dasbor klinis untuk Next.js dengan catatan pasien, janji temu, resep obat, dan alur kerja yang mematuhi standar keamanan medis HIPAA.',
    meta: 'Vercel · 2025',
    theme: 'clinic',
    visits: 1150,
    clicks: 245
  }
];

const DEFAULT_PROFILE = {
  name: 'Elodie',
  intro: 'Saya sangat bersemangat dalam membangun berbagai hal yang membawa perubahan positif. Berikut adalah beberapa proyek yang telah saya kerjakan, baik proyek pribadi maupun profesional.',
  aboutText: 'Saya adalah seorang Desainer Produk dan Pengembang Web yang berfokus pada pembuatan antarmuka digital yang indah, responsif, dan fungsional. Berpengalaman selama lebih dari 5 tahun merancang sistem desain dan arsitektur frontend skala besar.',
  books: [
    { title: 'Designing Design', author: 'Kenya Hara' },
    { title: 'Zero to One', author: 'Peter Thiel' },
    { title: 'Atomic Habits', author: 'James Clear' }
  ],
  music: [
    { title: 'Midnight City', artist: 'M83' },
    { title: 'In the End', artist: 'Linkin Park' },
    { title: 'Starboy', artist: 'The Weeknd' }
  ],
  bookmarks: [
    { title: 'Tailwind CSS Docs', url: 'https://tailwindcss.com' },
    { title: 'Refactoring UI', url: 'https://refactoringui.com' },
    { title: 'React Documentation', url: 'https://react.dev' }
  ],
  socials: {
    github: 'elodie_dev',
    twitter: 'elodie_codes',
    bsky: 'elodie.bsky.social',
    threads: 'elodie_threads',
    instagram: 'elodie_gallery'
  }
};

export default function App() {
  // --- STATE UTAMA ---
  const [activeTab, setActiveTab] = useState('portfolio'); // 'portfolio' atau 'admin'
  const [portfolioTab, setPortfolioTab] = useState('projects'); // 'projects' atau 'about' dalam pratinjau portfolio
  const [projects, setProjects] = useState(() => {
    const saved = localStorage.getItem('elodie_projects');
    return saved ? JSON.parse(saved) : DEFAULT_PROJECTS;
  });
  const [profile, setProfile] = useState(() => {
    const saved = localStorage.getItem('elodie_profile');
    return saved ? JSON.parse(saved) : DEFAULT_PROFILE;
  });
  
  // --- STATE ADMIN & MODAL ---
  const [adminSection, setAdminSection] = useState('dashboard'); // 'dashboard', 'projects', 'profile', 'logs'
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [notification, setNotification] = useState(null);
  const [logs, setLogs] = useState([
    { id: 1, time: '11:40', text: 'Sistem admin berhasil diinisialisasi.' },
    { id: 2, time: '11:41', text: 'Dasbor analitik proyek disinkronkan.' }
  ]);

  // --- STATE FORM PROYEK ---
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formMeta, setFormMeta] = useState('');
  const [formTheme, setFormTheme] = useState('deploy');

  // --- STATE FORM PROFIL ---
  const [profileName, setProfileName] = useState(profile.name);
  const [profileIntro, setProfileIntro] = useState(profile.intro);
  const [profileAbout, setProfileAbout] = useState(profile.aboutText);
  const [socialGithub, setSocialGithub] = useState(profile.socials.github);
  const [socialTwitter, setSocialTwitter] = useState(profile.socials.twitter);
  const [socialBsky, setSocialBsky] = useState(profile.socials.bsky);
  const [socialThreads, setSocialThreads] = useState(profile.socials.threads);
  const [socialInstagram, setSocialInstagram] = useState(profile.socials.instagram);

  // --- SIMPAN KE LOCAL STORAGE ---
  useEffect(() => {
    localStorage.setItem('elodie_projects', JSON.stringify(projects));
  }, [projects]);

  useEffect(() => {
    localStorage.setItem('elodie_profile', JSON.stringify(profile));
  }, [profile]);

  // --- NOTIFIKASI KUSTOM ---
  const showToast = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // --- LOG SIMULATOR ---
  useEffect(() => {
    const actions = [
      'Seorang pengguna baru saja melihat portofolio Anda.',
      'Seseorang mengklik detail proyek Deploy.',
      'Lalu lintas pengunjung dari Twitter mengalami peningkatan.',
      'Simulator: Server Klein melakukan build ulang secara otomatis.',
      'Seseorang mengunduh CV Anda dari halaman Tentang.'
    ];

    const interval = setInterval(() => {
      const now = new Date();
      const timeStr = now.toTimeString().split(' ')[0].substring(0, 5);
      const randomAction = actions[Math.floor(Math.random() * actions.length)];
      
      setLogs(prev => [
        { id: Date.now(), time: timeStr, text: randomAction },
        ...prev.slice(0, 19)
      ]);

      // Acak penambahan stat pengunjung kecil-kecilan
      setProjects(prev => prev.map(p => {
        if (Math.random() > 0.7) {
          return {
            ...p,
            visits: p.visits + Math.floor(Math.random() * 3) + 1,
            clicks: p.clicks + (Math.random() > 0.6 ? 1 : 0)
          };
        }
        return p;
      }));
    }, 12000);

    return () => clearInterval(interval);
  }, []);

  // --- LOGIKA MANAJEMEN PROYEK ---
  const handleOpenAddModal = () => {
    setEditingProject(null);
    setFormTitle('');
    setFormDesc('');
    setFormMeta('Twitter · 2026');
    setFormTheme('deploy');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (project) => {
    setEditingProject(project);
    setFormTitle(project.title);
    setFormDesc(project.description);
    setFormMeta(project.meta);
    setFormTheme(project.theme || 'deploy');
    setIsModalOpen(true);
  };

  const handleSaveProject = (e) => {
    e.preventDefault();
    if (!formTitle.trim() || !formDesc.trim()) {
      showToast('Judul dan deskripsi proyek wajib diisi!', 'error');
      return;
    }

    if (editingProject) {
      // Edit Proyek
      setProjects(prev => prev.map(p => p.id === editingProject.id ? {
        ...p,
        title: formTitle,
        description: formDesc,
        meta: formMeta,
        theme: formTheme
      } : p));
      showToast(`Proyek "${formTitle}" berhasil diperbarui!`);
    } else {
      // Tambah Proyek Baru
      const newProj = {
        id: Date.now().toString(),
        title: formTitle,
        description: formDesc,
        meta: formMeta,
        theme: formTheme,
        visits: 0,
        clicks: 0
      };
      setProjects(prev => [...prev, newProj]);
      showToast(`Proyek "${formTitle}" berhasil ditambahkan!`);
    }
    setIsModalOpen(false);
  };

  const handleDeleteProject = (id, title) => {
    setProjects(prev => prev.filter(p => p.id !== id));
    showToast(`Proyek "${title}" berhasil dihapus.`, 'error');
  };

  // --- SIMPAN PENGATURAN PROFIL ---
  const handleSaveProfile = (e) => {
    e.preventDefault();
    const updated = {
      ...profile,
      name: profileName,
      intro: profileIntro,
      aboutText: profileAbout,
      socials: {
        github: socialGithub,
        twitter: socialTwitter,
        bsky: socialBsky,
        threads: socialThreads,
        instagram: socialInstagram
      }
    };
    setProfile(updated);
    showToast('Profil Anda berhasil diperbarui!');
  };

  return (
    <div className="min-h-screen bg-[#090a0b] text-[#f3f4f6] font-sans antialiased overflow-x-hidden flex flex-col">
      
      {/* ==========================================
          HEADER UTAMA (Navigasi Antara Portfolio & Admin)
          ========================================== */}
      <header className="sticky top-0 z-50 bg-[#090a0b]/90 backdrop-blur-md border-b border-[#1c1d1f] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
          <span className="text-sm font-medium tracking-wide text-[#8e939e]">
            {activeTab === 'portfolio' ? 'Mode Pratinjau Portofolio' : 'Mode Panel Kontrol Admin'}
          </span>
        </div>

        {/* Tombol Toggle Mode */}
        <div className="flex bg-[#121314] p-1 rounded-full border border-[#1c1d1f]">
          <button
            onClick={() => setActiveTab('portfolio')}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all duration-300 flex items-center space-x-2 ${
              activeTab === 'portfolio'
                ? 'bg-[#1c1d1f] text-white shadow-lg shadow-black/40'
                : 'text-[#8e939e] hover:text-[#f3f4f6]'
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            <span>Pratinjau Portofolio</span>
          </button>
          
          <button
            onClick={() => setActiveTab('admin')}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all duration-300 flex items-center space-x-2 ${
              activeTab === 'admin'
                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                : 'text-[#8e939e] hover:text-[#f3f4f6]'
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>Panel Admin</span>
          </button>
        </div>
      </header>

      {/* ==========================================
          NOTIFIKASI ALERTS / TOAST
          ========================================== */}
      {notification && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center space-x-3 px-4 py-3 rounded-lg border shadow-2xl transition-all duration-300 transform translate-y-0 ${
          notification.type === 'error'
            ? 'bg-rose-950/40 border-rose-800 text-rose-300'
            : 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
        }`}>
          <div className={`h-2 w-2 rounded-full ${notification.type === 'error' ? 'bg-rose-500' : 'bg-emerald-500'}`}></div>
          <span className="text-sm font-medium">{notification.message}</span>
        </div>
      )}

      {/* ==========================================
          AREA UTAMA TERGANTUNG TAB AKTIF
          ========================================== */}
      <main className="flex-1 flex overflow-hidden">
        
        {/* ==========================================
            MODE 1: PRATINJAU PORTFOLIO (Sesuai Desain Unggahan)
            ========================================== */}
        {activeTab === 'portfolio' && (
          <div className="flex-1 flex flex-col md:flex-row max-w-7xl mx-auto w-full px-4 md:px-12 py-10 gap-12 transition-all duration-500">
            
            {/* SIDEBAR KIRI PORTFOLIO */}
            <aside className="w-full md:w-56 shrink-0 flex flex-col space-y-10">
              {/* Logo / Brand Name */}
              <div className="flex items-center space-x-2">
                <h1 className="text-2xl font-bold tracking-tight text-white hover:opacity-80 cursor-pointer transition-all">
                  {profile.name}
                </h1>
              </div>

              {/* Kelompok Navigasi: INDEX */}
              <div className="space-y-4">
                <span className="text-[10px] uppercase tracking-[0.2em] text-[#8e939e] font-bold block">
                  Indeks
                </span>
                <nav className="flex flex-col space-y-2.5">
                  <button
                    onClick={() => setPortfolioTab('projects')}
                    className={`flex items-center space-x-3 text-left transition-all group ${
                      portfolioTab === 'projects' ? 'text-white' : 'text-[#8e939e] hover:text-[#f3f4f6]'
                    }`}
                  >
                    <svg className="w-4 h-4 text-[#8e939e] group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    <span className="text-sm font-medium">Proyek</span>
                  </button>
                  <button
                    onClick={() => setPortfolioTab('about')}
                    className={`flex items-center space-x-3 text-left transition-all group ${
                      portfolioTab === 'about' ? 'text-white' : 'text-[#8e939e] hover:text-[#f3f4f6]'
                    }`}
                  >
                    <svg className="w-4 h-4 text-[#8e939e] group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span className="text-sm font-medium">Tentang</span>
                  </button>
                </nav>
              </div>

              {/* Kelompok Navigasi: CONSUMING (Sedang Dinikmati) */}
              <div className="space-y-4">
                <span className="text-[10px] uppercase tracking-[0.2em] text-[#8e939e] font-bold block">
                  Aktivitas
                </span>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-[#8e939e]">
                    <span className="flex items-center space-x-3">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                      <span>Buku</span>
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1c1d1f] text-white">
                      {profile.books.length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-[#8e939e]">
                    <span className="flex items-center space-x-3">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                      </svg>
                      <span>Musik</span>
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1c1d1f] text-white">
                      {profile.music.length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-[#8e939e]">
                    <span className="flex items-center space-x-3">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                      </svg>
                      <span>Markah</span>
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1c1d1f] text-white">
                      {profile.bookmarks.length}
                    </span>
                  </div>
                </div>
              </div>

              {/* Kelompok Navigasi: FIND ME (Media Sosial) */}
              <div className="space-y-4">
                <span className="text-[10px] uppercase tracking-[0.2em] text-[#8e939e] font-bold block">
                  Temukan Saya
                </span>
                <div className="flex flex-col space-y-2.5 text-sm">
                  {Object.entries(profile.socials).map(([platform, handle]) => {
                    if (!handle) return null;
                    return (
                      <a
                        key={platform}
                        href="#"
                        onClick={(e) => e.preventDefault()}
                        className="text-[#8e939e] hover:text-white flex items-center justify-between transition-colors group"
                      >
                        <span className="capitalize">{platform === 'bsky' ? 'Bluesky' : platform}</span>
                        <svg className="w-3 h-3 transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                      </a>
                    );
                  })}
                </div>
              </div>
            </aside>

            {/* AREA UTAMA PORTFOLIO */}
            <section className="flex-1">
              
              {/* HALAMAN 1: TAB PROJECTS (REPLIKA PERSIS GAMBAR) */}
              {portfolioTab === 'projects' && (
                <div className="space-y-8 animate-fadeIn">
                  {/* Judul Proyek & Pengantar */}
                  <div className="space-y-4 max-w-2xl">
                    <div className="flex items-center space-x-2.5">
                      <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <h2 className="text-xl font-semibold text-white">Proyek</h2>
                    </div>
                    <p className="text-[#8e939e] leading-relaxed text-[15px]">
                      {profile.intro}
                    </p>
                  </div>

                  {/* Grid Proyek */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-10 pt-4">
                    {projects.map((proj) => (
                      <div key={proj.id} className="group cursor-pointer flex flex-col space-y-4">
                        
                        {/* CONTAINER SCREENSHOT MOCKUP (Didesain Sangat Detail & Elegan dengan CSS & SVG) */}
                        <div className="w-full aspect-[16/10] rounded-xl bg-[#121314] border border-[#1c1d1f] overflow-hidden relative group-hover:border-[#3b82f6]/40 transition-all duration-500 shadow-xl shadow-black/50">
                          
                          {/* 1. MOCKUP THEME: DEPLOY */}
                          {proj.theme === 'deploy' && (
                            <div className="absolute inset-0 p-3 flex flex-col justify-between bg-gradient-to-br from-[#0c0d0e] to-[#121314]">
                              <div className="flex items-center justify-between border-b border-[#1c1d1f] pb-2">
                                <div className="flex items-center space-x-2 text-[9px] text-[#8e939e]">
                                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                                  <span>Home</span>
                                  <span>Servers</span>
                                  <span>Pricing</span>
                                </div>
                                <div className="text-[8px] bg-blue-950/40 text-blue-400 border border-blue-800/30 px-1.5 py-0.5 rounded">
                                  Kurt Cobain
                                </div>
                              </div>
                              <div className="my-auto space-y-1.5 px-2">
                                <p className="text-[7px] text-[#8e939e] tracking-wider">APA YANG BARU?</p>
                                <h4 className="text-[11px] font-bold text-white tracking-tight leading-tight">
                                  The fastest way to deploy and <span className="text-blue-400">scale</span> web applications.
                                </h4>
                                <div className="flex space-x-1.5 pt-1">
                                  <span className="text-[8px] bg-blue-600 px-2 py-0.5 rounded font-medium text-white shadow-sm">Get Started</span>
                                  <span className="text-[8px] bg-[#1c1d1f] px-2 py-0.5 rounded text-[#8e939e]">Dashboard →</span>
                                </div>
                              </div>
                              <div className="h-10 bg-[#090a0b] border-t border-[#1c1d1f] rounded-t-lg p-2 flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  <div className="w-2.5 h-2.5 bg-blue-600/20 rounded border border-blue-500/30 flex items-center justify-center">
                                    <div className="w-1 h-1 bg-blue-400 rounded-full"></div>
                                  </div>
                                  <div className="space-y-0.5">
                                    <p className="text-[7px] font-medium text-white leading-none">Production Server</p>
                                    <p className="text-[6px] text-emerald-400 leading-none">Active</p>
                                  </div>
                                </div>
                                <div className="text-[6px] text-[#8e939e]">Vultr . AWS . GCP . Azure</div>
                              </div>
                            </div>
                          )}

                          {/* 2. MOCKUP THEME: SCREENCAST */}
                          {proj.theme === 'screencast' && (
                            <div className="absolute inset-0 p-3 flex flex-col justify-between bg-[#0a0a0c]">
                              <div className="flex items-center justify-between border-b border-[#1c1d1f] pb-2">
                                <div className="flex items-center space-x-2 text-[8px] text-[#8e939e]">
                                  <span>Home</span>
                                  <span className="text-white">Courses</span>
                                  <span>Forum</span>
                                </div>
                                <div className="w-4 h-4 rounded-full bg-indigo-500/30 border border-indigo-400/50 flex items-center justify-center">
                                  <div className="w-2 h-2 bg-indigo-400 rounded-full"></div>
                                </div>
                              </div>
                              <div className="my-auto text-center space-y-1.5">
                                <span className="text-[6px] bg-indigo-950/40 text-indigo-400 border border-indigo-800/30 px-1 py-0.5 rounded">Baru Rilis!</span>
                                <h4 className="text-[11px] font-bold text-white tracking-tight leading-tight">
                                  Hands-on learning from real experts
                                </h4>
                                <p className="text-[7px] text-[#8e939e] max-w-[150px] mx-auto">Master new skills with practical video lessons, clear notes, and code.</p>
                              </div>
                              <div className="grid grid-cols-3 gap-1 pt-1 border-t border-[#1c1d1f]/60">
                                <div className="bg-[#121314] rounded p-1 flex items-center space-x-1">
                                  <div className="w-1.5 h-1.5 bg-orange-400 rounded-full"></div>
                                  <span className="text-[5px] text-[#8e939e]">Laravel</span>
                                </div>
                                <div className="bg-[#121314] rounded p-1 flex items-center space-x-1">
                                  <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
                                  <span className="text-[5px] text-[#8e939e]">Tailwind</span>
                                </div>
                                <div className="bg-[#121314] rounded p-1 flex items-center space-x-1">
                                  <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full"></div>
                                  <span className="text-[5px] text-[#8e939e]">JS ES6</span>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* 3. MOCKUP THEME: COMMERCE */}
                          {proj.theme === 'commerce' && (
                            <div className="absolute inset-0 p-3 flex flex-col justify-between bg-gradient-to-tr from-[#12100e] to-[#0c0d0e]">
                              <div className="flex items-center justify-between border-b border-[#1c1d1f] pb-2">
                                <div className="text-[8px] font-semibold tracking-wider text-amber-500">NEW SEASON</div>
                                <div className="flex space-x-1.5">
                                  <div className="w-1.5 h-1.5 rounded-full bg-white/25"></div>
                                  <div className="w-1.5 h-1.5 rounded-full bg-white/25"></div>
                                </div>
                              </div>
                              <div className="my-auto space-y-1.5 relative z-10">
                                <span className="text-[7px] tracking-widest text-amber-500 font-bold block">NEW SEASON 2026</span>
                                <h4 className="text-[12px] font-extrabold text-white tracking-tight leading-tight max-w-[120px]">
                                  Curated for those who appreciate the finer things
                                </h4>
                                <span className="text-[7px] bg-amber-500 text-black px-2 py-0.5 rounded-full font-bold inline-block shadow-lg">Shop Now</span>
                              </div>
                              {/* Glowing Sneaker Silhouette Art Background */}
                              <div className="absolute right-2 bottom-2 w-28 h-20 opacity-40 bg-gradient-to-br from-amber-500/40 to-transparent rounded-full blur-xl pointer-events-none"></div>
                              <svg className="absolute right-4 bottom-2 w-20 h-14 text-amber-500/30 pointer-events-none" viewBox="0 0 100 100" fill="currentColor">
                                <path d="M10 80 Q 30 40 50 50 T 90 20 L 95 30 L 90 60 Q 70 80 10 80 Z" />
                              </svg>
                            </div>
                          )}

                          {/* 4. MOCKUP THEME: PROVISION */}
                          {proj.theme === 'provision' && (
                            <div className="absolute inset-0 p-3 flex flex-col bg-[#0b0c0d] overflow-hidden">
                              <div className="flex items-center justify-between border-b border-[#1c1d1f] pb-2 mb-2">
                                <span className="text-[8px] text-[#8e939e] font-mono">Macojevic Inc.</span>
                                <div className="flex space-x-2 text-[7px] text-[#8e939e]">
                                  <span className="text-white font-medium border-b border-blue-500 pb-0.5">Deployments</span>
                                  <span>Activity</span>
                                  <span>Settings</span>
                                </div>
                              </div>
                              <div className="grid grid-cols-3 gap-2 flex-1">
                                <div className="bg-[#121314] rounded border border-[#1f2022] p-1.5 flex flex-col justify-between">
                                  <span className="text-[8px] font-bold text-white">Fadel</span>
                                  <span className="text-[6px] text-[#8e939e] line-clamp-1">fadel.dev</span>
                                  <div className="flex items-center space-x-1 pt-1 border-t border-[#1f2022]">
                                    <div className="w-1 h-1 rounded-full bg-emerald-400"></div>
                                    <span className="text-[5px] text-emerald-400">ready</span>
                                  </div>
                                </div>
                                <div className="bg-[#121314] rounded border border-[#1f2022] p-1.5 flex flex-col justify-between">
                                  <span className="text-[8px] font-bold text-white">Klein</span>
                                  <span className="text-[6px] text-[#8e939e] line-clamp-1">klein.sh</span>
                                  <div className="flex items-center space-x-1 pt-1 border-t border-[#1f2022]">
                                    <div className="w-1.5 h-1.5 rounded-full border-2 border-amber-400/30 border-t-amber-400 animate-spin"></div>
                                    <span className="text-[5px] text-amber-400">deploying</span>
                                  </div>
                                </div>
                                <div className="bg-[#121314] rounded border border-[#1f2022] p-1.5 flex flex-col justify-between">
                                  <span className="text-[8px] font-bold text-white">Leuschke</span>
                                  <span className="text-[6px] text-[#8e939e] line-clamp-1">leusch.net</span>
                                  <div className="flex items-center space-x-1 pt-1 border-t border-[#1f2022]">
                                    <div className="w-1 h-1 rounded-full bg-rose-500"></div>
                                    <span className="text-[5px] text-rose-500">error</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* 5. MOCKUP THEME: AXIS */}
                          {proj.theme === 'axis' && (
                            <div className="absolute inset-0 p-3 flex flex-col justify-between bg-[#09090b] overflow-hidden">
                              <div className="flex items-center justify-between text-[8px] text-[#8e939e] border-b border-[#1c1d1f] pb-1.5">
                                <span className="font-bold text-white">Axis</span>
                                <span className="text-[7px]">Welcome back, John!</span>
                              </div>
                              <div className="flex-1 flex items-center justify-between py-1">
                                <div className="space-y-1">
                                  <span className="text-[6px] text-[#8e939e] uppercase tracking-wider block">Gross Volume</span>
                                  <span className="text-[12px] font-extrabold text-white">€447.00</span>
                                  <span className="text-[5px] text-emerald-400 block">+12.4% vs last 30d</span>
                                </div>
                                {/* Mini chart representation */}
                                <div className="w-24 h-10 relative">
                                  <svg className="w-full h-full text-blue-500" viewBox="0 0 100 40" fill="none">
                                    <path d="M0 35 Q 15 20 30 25 T 60 10 T 90 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M0 35 Q 15 20 30 25 T 60 10 T 90 5 L 90 40 L 0 40 Z" fill="currentColor" fillOpacity="0.08" />
                                  </svg>
                                </div>
                              </div>
                              <div className="grid grid-cols-4 gap-1 text-[5px] text-[#8e939e] border-t border-[#1c1d1f] pt-1">
                                <div>
                                  <span className="block text-white font-semibold">€2.1K</span>
                                  <span>Succeeded</span>
                                </div>
                                <div>
                                  <span className="block text-white font-semibold">€240</span>
                                  <span>Refunded</span>
                                </div>
                                <div>
                                  <span className="block text-white font-semibold">€1.1K</span>
                                  <span>Uncaptured</span>
                                </div>
                                <div>
                                  <span className="block text-white font-semibold">0.0%</span>
                                  <span>Disputes</span>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* 6. MOCKUP THEME: CLINIC */}
                          {proj.theme === 'clinic' && (
                            <div className="absolute inset-0 p-3 flex flex-col justify-between bg-[#080a0c]">
                              <div className="flex items-center justify-between border-b border-[#1c1d1f] pb-1.5">
                                <div className="flex items-center space-x-1.5">
                                  <div className="w-2 h-2 rounded bg-sky-500"></div>
                                  <span className="text-[8px] font-bold text-white">Clinic</span>
                                </div>
                                <span className="text-[7px] text-[#8e939e]">Good morning, Dr. Page</span>
                              </div>
                              <div className="flex-1 flex gap-2 items-center py-1">
                                <div className="flex-1 bg-[#121314] rounded p-1 space-y-1">
                                  <span className="text-[5px] text-[#8e939e] uppercase block">Total Appointments</span>
                                  <span className="text-lg font-extrabold text-sky-400">1240</span>
                                </div>
                                <div className="flex-1 h-full relative">
                                  <svg className="w-full h-full text-sky-400" viewBox="0 0 80 40" fill="none">
                                    <path d="M0 30 Q 15 10 30 25 T 60 5 T 80 20" stroke="currentColor" strokeWidth="1.5" />
                                  </svg>
                                </div>
                              </div>
                              <div className="text-[5px] text-[#8e939e] border-t border-[#1c1d1f] pt-1 flex justify-between">
                                <span>Overview Patients</span>
                                <span className="text-emerald-400">Compliance: 98%</span>
                              </div>
                            </div>
                          )}

                        </div>

                        {/* DETAIL PROYEK DI BAWAH SCREENSHOT */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <h3 className="text-[15px] font-semibold text-white group-hover:text-blue-400 transition-colors">
                              {proj.title}
                            </h3>
                            <span className="text-[11px] text-[#8e939e]">{proj.meta}</span>
                          </div>
                          <p className="text-[13px] text-[#8e939e] leading-relaxed line-clamp-2">
                            {proj.description}
                          </p>
                        </div>

                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* HALAMAN 2: TAB ABOUT (TENTANG) */}
              {portfolioTab === 'about' && (
                <div className="space-y-8 max-w-2xl animate-fadeIn">
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2.5">
                      <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <h2 className="text-xl font-semibold text-white">Tentang Saya</h2>
                    </div>
                    <p className="text-[#8e939e] leading-relaxed text-[15px]">
                      {profile.aboutText}
                    </p>
                  </div>

                  {/* Pembatas Elegan */}
                  <div className="h-px bg-[#1c1d1f]"></div>

                  {/* Detail Hobi & Kebiasaan */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Buku */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[#8e939e]">Buku Terakhir</h4>
                      <ul className="space-y-2 text-sm text-white">
                        {profile.books.map((b, i) => (
                          <li key={i} className="bg-[#121314] p-2.5 rounded-lg border border-[#1c1d1f]">
                            <p className="font-semibold">{b.title}</p>
                            <p className="text-xs text-[#8e939e]">oleh {b.author}</p>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Musik */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[#8e939e]">Musik Favorit</h4>
                      <ul className="space-y-2 text-sm text-white">
                        {profile.music.map((m, i) => (
                          <li key={i} className="bg-[#121314] p-2.5 rounded-lg border border-[#1c1d1f]">
                            <p className="font-semibold">{m.title}</p>
                            <p className="text-xs text-[#8e939e]">{m.artist}</p>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Markah / Tautan */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[#8e939e]">Markah Populer</h4>
                      <ul className="space-y-2 text-sm text-white">
                        {profile.bookmarks.map((bm, i) => (
                          <li key={i} className="bg-[#121314] p-2.5 rounded-lg border border-[#1c1d1f] hover:border-blue-500/30 transition-colors">
                            <a href={bm.url} target="_blank" rel="noreferrer" className="flex items-center justify-between">
                              <span className="font-semibold truncate">{bm.title}</span>
                              <svg className="w-3 h-3 text-[#8e939e]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 00-2 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

            </section>
          </div>
        )}

        {/* ==========================================
            MODE 2: PANEL ADMIN (Untuk Mengontrol Seluruh Konten)
            ========================================== */}
        {activeTab === 'admin' && (
          <div className="flex-1 flex flex-col md:flex-row transition-all duration-500">
            
            {/* Sidebar Kiri Panel Admin */}
            <aside className="w-full md:w-64 bg-[#121314] border-r border-[#1c1d1f] p-6 flex flex-col space-y-6">
              <div className="space-y-2">
                <h3 className="text-sm font-semibold tracking-wider text-[#8e939e] uppercase">
                  Kontrol Panel
                </h3>
                <p className="text-xs text-blue-400">Pengaturan Portofolio Anda</p>
              </div>

              <nav className="flex flex-col space-y-1.5">
                <button
                  onClick={() => setAdminSection('dashboard')}
                  className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm transition-all ${
                    adminSection === 'dashboard'
                      ? 'bg-blue-600/10 text-blue-400 font-medium'
                      : 'text-[#8e939e] hover:bg-[#1c1d1f] hover:text-white'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z" />
                  </svg>
                  <span>Dashboard Ringkasan</span>
                </button>

                <button
                  onClick={() => setAdminSection('projects')}
                  className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm transition-all ${
                    adminSection === 'projects'
                      ? 'bg-blue-600/10 text-blue-400 font-medium'
                      : 'text-[#8e939e] hover:bg-[#1c1d1f] hover:text-white'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  <span>Kelola Proyek</span>
                </button>

                <button
                  onClick={() => setAdminSection('profile')}
                  className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm transition-all ${
                    adminSection === 'profile'
                      ? 'bg-blue-600/10 text-blue-400 font-medium'
                      : 'text-[#8e939e] hover:bg-[#1c1d1f] hover:text-white'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span>Identitas & Profil</span>
                </button>

                <button
                  onClick={() => setAdminSection('logs')}
                  className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm transition-all ${
                    adminSection === 'logs'
                      ? 'bg-blue-600/10 text-blue-400 font-medium'
                      : 'text-[#8e939e] hover:bg-[#1c1d1f] hover:text-white'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Log Aktivitas</span>
                </button>
              </nav>

              <div className="pt-6 border-t border-[#1c1d1f] text-xs text-[#8e939e] space-y-3 mt-auto">
                <p>Status: <span className="text-emerald-400">Online & Sinkron</span></p>
                <div className="bg-[#1c1d1f] p-3 rounded-lg border border-[#2a2c30]">
                  <p className="font-semibold text-white">Butuh bantuan?</p>
                  <p className="mt-1 text-[11px]">Setiap perubahan disimpan secara otomatis ke browser Anda.</p>
                </div>
              </div>
            </aside>

            {/* Konten Utama Area Admin */}
            <div className="flex-1 p-6 md:p-10 overflow-y-auto max-w-6xl">
              
              {/* SUBSECTION 1: DASHBOARD RINGKASAN */}
              {adminSection === 'dashboard' && (
                <div className="space-y-8 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-bold text-white">Dasbor Analitik Real-Time</h2>
                      <p className="text-[#8e939e] text-sm">Metrik performa portofolio Anda secara agregat.</p>
                    </div>
                    <button
                      onClick={() => {
                        // Reset ke data awal bawaan
                        if (confirm('Apakah Anda yakin ingin mengatur ulang ke data default gambar?')) {
                          setProjects(DEFAULT_PROJECTS);
                          setProfile(DEFAULT_PROFILE);
                          showToast('Data berhasil di-reset ke default.');
                        }
                      }}
                      className="px-3 py-1.5 rounded-lg border border-rose-950 bg-rose-950/20 text-rose-300 hover:bg-rose-900/30 text-xs transition-colors"
                    >
                      Reset Data Default
                    </button>
                  </div>

                  {/* Grid Statistik */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-[#121314] p-5 rounded-xl border border-[#1c1d1f] space-y-1">
                      <span className="text-xs text-[#8e939e] uppercase font-bold tracking-wider">Total Proyek</span>
                      <p className="text-3xl font-extrabold text-white">{projects.length}</p>
                      <span className="text-[11px] text-emerald-400">Aktif di portofolio</span>
                    </div>

                    <div className="bg-[#121314] p-5 rounded-xl border border-[#1c1d1f] space-y-1">
                      <span className="text-xs text-[#8e939e] uppercase font-bold tracking-wider">Total Kunjungan</span>
                      <p className="text-3xl font-extrabold text-blue-400">
                        {projects.reduce((acc, curr) => acc + curr.visits, 0).toLocaleString()}
                      </p>
                      <span className="text-[11px] text-[#8e939e]">Bulan ini (simulasi)</span>
                    </div>

                    <div className="bg-[#121314] p-5 rounded-xl border border-[#1c1d1f] space-y-1">
                      <span className="text-xs text-[#8e939e] uppercase font-bold tracking-wider">Total Klik Detail</span>
                      <p className="text-3xl font-extrabold text-indigo-400">
                        {projects.reduce((acc, curr) => acc + curr.clicks, 0).toLocaleString()}
                      </p>
                      <span className="text-[11px] text-[#8e939e]">Rasio Konversi: {((projects.reduce((acc, curr) => acc + curr.clicks, 0) / (projects.reduce((acc, curr) => acc + curr.visits, 0) || 1)) * 100).toFixed(1)}%</span>
                    </div>

                    <div className="bg-[#121314] p-5 rounded-xl border border-[#1c1d1f] space-y-1">
                      <span className="text-xs text-[#8e939e] uppercase font-bold tracking-wider">Skor Kecepatan</span>
                      <p className="text-3xl font-extrabold text-emerald-400">99</p>
                      <span className="text-[11px] text-[#8e939e]">Sangat Cepat (Vercel Edge)</span>
                    </div>
                  </div>

                  {/* Analisis Grafik Sederhana dan Log Terakhir */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Ringkasan Distribusi Proyek */}
                    <div className="lg:col-span-2 bg-[#121314] rounded-xl border border-[#1c1d1f] p-5 space-y-4">
                      <h3 className="text-sm font-semibold text-white">Visualisasi Performa per Proyek</h3>
                      <div className="space-y-3.5">
                        {projects.map(p => {
                          const maxVisits = Math.max(...projects.map(pro => pro.visits), 1);
                          const pct = (p.visits / maxVisits) * 100;
                          return (
                            <div key={p.id} className="space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-medium text-white">{p.title}</span>
                                <span className="text-[#8e939e]">{p.visits} Kunjungan ({p.clicks} Klik)</span>
                              </div>
                              <div className="h-1.5 bg-[#1c1d1f] rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-blue-500 rounded-full transition-all duration-1000"
                                  style={{ width: `${pct}%` }}
                                ></div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Log Aktivitas Terakhir di Dashboard */}
                    <div className="bg-[#121314] rounded-xl border border-[#1c1d1f] p-5 flex flex-col justify-between">
                      <div className="space-y-3">
                        <h3 className="text-sm font-semibold text-white">Log Live Terakhir</h3>
                        <div className="space-y-2.5 max-h-[180px] overflow-y-auto pr-1">
                          {logs.slice(0, 4).map(l => (
                            <div key={l.id} className="text-xs flex items-start space-x-2">
                              <span className="font-mono text-blue-400 select-none">{l.time}</span>
                              <span className="text-[#8e939e] leading-snug">{l.text}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <button
                        onClick={() => setAdminSection('logs')}
                        className="w-full text-center py-2 border border-[#1c1d1f] hover:border-[#2a2c30] rounded-lg text-xs font-semibold text-white mt-4"
                      >
                        Lihat Semua Log
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* SUBSECTION 2: KELOLA PROYEK */}
              {adminSection === 'projects' && (
                <div className="space-y-6 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-bold text-white">Manajemen Proyek</h2>
                      <p className="text-[#8e939e] text-sm">Tambah, edit, atau hapus proyek dari tampilan portofolio Anda.</p>
                    </div>
                    <button
                      onClick={handleOpenAddModal}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition-colors flex items-center space-x-2 shadow-lg shadow-blue-950/40"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                      </svg>
                      <span>Tambah Proyek Baru</span>
                    </button>
                  </div>

                  {/* List Proyek */}
                  <div className="bg-[#121314] rounded-xl border border-[#1c1d1f] overflow-hidden">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-[#1c1d1f] text-[10px] uppercase tracking-wider text-[#8e939e] bg-[#0c0d0e]">
                          <th className="p-4 font-bold">Proyek</th>
                          <th className="p-4 font-bold">Metadata / Platform</th>
                          <th className="p-4 font-bold">Gaya Tema Visual</th>
                          <th className="p-4 font-bold">Kunjungan / Klik</th>
                          <th className="p-4 font-bold text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1c1d1f] text-sm">
                        {projects.map((p) => (
                          <tr key={p.id} className="hover:bg-[#1c1d1f]/30 transition-colors">
                            <td className="p-4">
                              <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 rounded-lg bg-[#1c1d1f] flex items-center justify-center font-bold text-blue-400">
                                  {p.title.charAt(0)}
                                </div>
                                <div className="space-y-0.5">
                                  <p className="font-semibold text-white">{p.title}</p>
                                  <p className="text-xs text-[#8e939e] line-clamp-1 max-w-sm">{p.description}</p>
                                </div>
                              </div>
                            </td>
                            <td className="p-4 text-[#8e939e] font-mono text-xs">
                              {p.meta}
                            </td>
                            <td className="p-4">
                              <span className="capitalize text-xs bg-[#1c1d1f] px-2 py-1 rounded text-white border border-[#2a2c30]">
                                {p.theme}
                              </span>
                            </td>
                            <td className="p-4 text-xs">
                              <div className="space-y-0.5">
                                <p className="text-white font-medium">{p.visits} views</p>
                                <p className="text-[#8e939e]">{p.clicks} clicks</p>
                              </div>
                            </td>
                            <td className="p-4 text-right">
                              <div className="flex items-center justify-end space-x-2">
                                <button
                                  onClick={() => handleOpenEditModal(p)}
                                  className="p-1.5 text-[#8e939e] hover:text-blue-400 hover:bg-[#1c1d1f] rounded transition-colors"
                                  title="Edit Proyek"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2.5 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => {
                                    if (confirm(`Apakah Anda yakin ingin menghapus proyek "${p.title}"?`)) {
                                      handleDeleteProject(p.id, p.title);
                                    }
                                  }}
                                  className="p-1.5 text-[#8e939e] hover:text-rose-500 hover:bg-rose-950/20 rounded transition-colors"
                                  title="Hapus Proyek"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* SUBSECTION 3: IDENTITAS & PROFIL */}
              {adminSection === 'profile' && (
                <div className="space-y-6 animate-fadeIn">
                  <div>
                    <h2 className="text-2xl font-bold text-white">Identitas & Profil</h2>
                    <p className="text-[#8e939e] text-sm">Sesuaikan konten utama, biografi singkat, dan media sosial Anda.</p>
                  </div>

                  <form onSubmit={handleSaveProfile} className="bg-[#121314] rounded-xl border border-[#1c1d1f] p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase tracking-wider text-[#8e939e]">Nama Brand / Pemilik</label>
                        <input
                          type="text"
                          value={profileName}
                          onChange={(e) => setProfileName(e.target.value)}
                          className="w-full bg-[#0c0d0e] border border-[#1c1d1f] focus:border-blue-500 rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none transition-colors"
                          placeholder="Contoh: Elodie"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase tracking-wider text-[#8e939e]">Pengantar Beranda Proyek</label>
                        <input
                          type="text"
                          value={profileIntro}
                          onChange={(e) => setProfileIntro(e.target.value)}
                          className="w-full bg-[#0c0d0e] border border-[#1c1d1f] focus:border-blue-500 rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none transition-colors"
                        />
                      </div>

                      <div className="md:col-span-2 space-y-2">
                        <label className="text-xs font-semibold uppercase tracking-wider text-[#8e939e]">Biografi Tentang Saya (Panjang)</label>
                        <textarea
                          rows={4}
                          value={profileAbout}
                          onChange={(e) => setProfileAbout(e.target.value)}
                          className="w-full bg-[#0c0d0e] border border-[#1c1d1f] focus:border-blue-500 rounded-lg p-3.5 text-sm text-white focus:outline-none transition-colors"
                        ></textarea>
                      </div>
                    </div>

                    <div className="h-px bg-[#1c1d1f]"></div>

                    {/* Media Sosial Section */}
                    <div className="space-y-4">
                      <h4 className="text-sm font-semibold text-white">Tautan Media Sosial</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-xs text-[#8e939e]">Github Username</label>
                          <input
                            type="text"
                            value={socialGithub}
                            onChange={(e) => setSocialGithub(e.target.value)}
                            className="w-full bg-[#0c0d0e] border border-[#1c1d1f] focus:border-blue-500 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs text-[#8e939e]">Twitter Username</label>
                          <input
                            type="text"
                            value={socialTwitter}
                            onChange={(e) => setSocialTwitter(e.target.value)}
                            className="w-full bg-[#0c0d0e] border border-[#1c1d1f] focus:border-blue-500 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs text-[#8e939e]">Bluesky Handle</label>
                          <input
                            type="text"
                            value={socialBsky}
                            onChange={(e) => setSocialBsky(e.target.value)}
                            className="w-full bg-[#0c0d0e] border border-[#1c1d1f] focus:border-blue-500 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs text-[#8e939e]">Threads Handle</label>
                          <input
                            type="text"
                            value={socialThreads}
                            onChange={(e) => setSocialThreads(e.target.value)}
                            className="w-full bg-[#0c0d0e] border border-[#1c1d1f] focus:border-blue-500 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs text-[#8e939e]">Instagram Handle</label>
                          <input
                            type="text"
                            value={socialInstagram}
                            onChange={(e) => setSocialInstagram(e.target.value)}
                            className="w-full bg-[#0c0d0e] border border-[#1c1d1f] focus:border-blue-500 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition-colors shadow-lg shadow-blue-950/40"
                    >
                      Simpan Perubahan Profil
                    </button>
                  </form>
                </div>
              )}

              {/* SUBSECTION 4: LOG AKTIVITAS */}
              {adminSection === 'logs' && (
                <div className="space-y-6 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-bold text-white">Log Aktivitas Server</h2>
                      <p className="text-[#8e939e] text-sm">Pemantauan real-time aktivitas kunjungan, deployment, dan pembaruan stat.</p>
                    </div>
                    <button
                      onClick={() => setLogs([])}
                      className="text-xs text-[#8e939e] hover:text-white"
                    >
                      Bersihkan Log
                    </button>
                  </div>

                  <div className="bg-[#121314] rounded-xl border border-[#1c1d1f] p-6 font-mono text-sm space-y-3 max-h-[500px] overflow-y-auto">
                    {logs.length === 0 ? (
                      <p className="text-[#8e939e] text-center py-10">Tidak ada log aktivitas saat ini.</p>
                    ) : (
                      logs.map((l) => (
                        <div key={l.id} className="flex items-start space-x-3 text-xs leading-relaxed border-b border-[#1c1d1f]/40 pb-2.5">
                          <span className="text-blue-400 select-none">[{l.time}]</span>
                          <span className="text-[#8e939e]"><span className="text-emerald-400 font-bold">✓</span> {l.text}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

            </div>
          </div>
        )}

      </main>

      {/* ==========================================
          MODAL KUSTOM (Tambah & Edit Proyek)
          ========================================== */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121314] rounded-xl border border-[#1c1d1f] w-full max-w-lg overflow-hidden animate-zoomIn">
            
            {/* Header Modal */}
            <div className="px-6 py-4 border-b border-[#1c1d1f] flex items-center justify-between">
              <h3 className="text-base font-bold text-white">
                {editingProject ? `Edit Proyek: ${editingProject.title}` : 'Tambah Proyek Baru'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-[#8e939e] hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {/* Form Modal */}
            <form onSubmit={handleSaveProject} className="p-6 space-y-4">
              
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#8e939e]">Nama Proyek</label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full bg-[#0c0d0e] border border-[#1c1d1f] focus:border-blue-500 rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none"
                  placeholder="Contoh: Analytics Hub"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#8e939e]">Metadata & Platform / Tahun</label>
                <input
                  type="text"
                  required
                  value={formMeta}
                  onChange={(e) => setFormMeta(e.target.value)}
                  className="w-full bg-[#0c0d0e] border border-[#1c1d1f] focus:border-blue-500 rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none"
                  placeholder="Contoh: Apple · 2026"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#8e939e]">Gaya Ilustrasi / Tema Mockup Visual</label>
                <select
                  value={formTheme}
                  onChange={(e) => setFormTheme(e.target.value)}
                  className="w-full bg-[#0c0d0e] border border-[#1c1d1f] focus:border-blue-500 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
                >
                  <option value="deploy">Deploy (Dashboard Landing Biru)</option>
                  <option value="screencast">Screencast (Tema Kursus & Belajar)</option>
                  <option value="commerce">Commerce (E-commerce Mewah Emas)</option>
                  <option value="provision">Provision (Grid Pemantauan Server)</option>
                  <option value="axis">Axis (Dasbor Grafik Keuangan)</option>
                  <option value="clinic">Clinic (Grafik Telemetri Klinis)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#8e939e]">Deskripsi Proyek</label>
                <textarea
                  required
                  rows={3}
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  className="w-full bg-[#0c0d0e] border border-[#1c1d1f] focus:border-blue-500 rounded-lg p-3 text-sm text-white focus:outline-none"
                  placeholder="Deskripsikan fitur utama atau kegunaan proyek..."
                ></textarea>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-[#1c1d1f] flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-[#1c1d1f] hover:border-[#2a2c30] text-[#8e939e] hover:text-white rounded-lg text-xs font-semibold transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition-colors shadow-lg shadow-blue-950/40"
                >
                  {editingProject ? 'Simpan Perubahan' : 'Tambahkan'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* Tambahan Animasi CSS dalam format Tailwind classes */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes zoomIn {
          from { opacity: 0; transform: scale(0.96); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.4s ease-out forwards;
        }
        .animate-zoomIn {
          animation: zoomIn 0.2s ease-out forwards;
        }
      `}</style>
      
    </div>
  );
}

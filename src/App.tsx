import { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  ClipboardList,
  FileSpreadsheet,
  Gauge,
  LayoutDashboard,
  ListChecks,
  Menu,
  MessageSquareText,
  RefreshCw,
  ShieldCheck,
  Target,
  Trash2,
  Upload,
  UsersRound,
  X,
} from 'lucide-react';
import { demoData } from './mockData';
import { parseCleanWorkbook } from './lib/excelParser';
import { clearPlatformData, loadPlatformData, savePlatformData } from './lib/storage';
import type { NavigationQuery, PageKey, PersonRecord, PlatformData } from './types';
import Dashboard from './pages/Dashboard';
import PeoplePage from './pages/People';
import { CriteriaPage, EvaluationsPage, GapsPage, NotesPage, QualityPage, TasksPage } from './pages/Explorers';
import ProfilePage from './pages/Profile';
import './styles.css';

const navItems: Array<{ key: Exclude<PageKey, 'profile'>; label: string; icon: typeof LayoutDashboard }> = [
  { key: 'dashboard', label: 'الملخص التنفيذي', icon: LayoutDashboard },
  { key: 'people', label: 'الأشخاص', icon: UsersRound },
  { key: 'evaluations', label: 'مستكشف التقييمات', icon: ClipboardList },
  { key: 'tasks', label: 'مستكشف المهام', icon: ListChecks },
  { key: 'criteria', label: 'مستكشف المعايير', icon: Target },
  { key: 'notes', label: 'الملاحظات والتوصيات', icon: MessageSquareText },
  { key: 'gaps', label: 'فجوات التقييم', icon: Gauge },
  { key: 'quality', label: 'جودة البيانات', icon: ShieldCheck },
];

export default function App() {
  const [data, setData] = useState<PlatformData>(demoData);
  const [page, setPage] = useState<PageKey>('dashboard');
  const [navigationQuery, setNavigationQuery] = useState<NavigationQuery>({});
  const [selectedPersonCode, setSelectedPersonCode] = useState(demoData.people[0]?.code ?? '');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [restoring, setRestoring] = useState(true);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    loadPlatformData().then((stored) => {
      if (stored?.people?.length) {
        setData(stored);
        setSelectedPersonCode(stored.people[0]?.code ?? '');
      }
    }).finally(() => setRestoring(false));
  }, []);

  const navigate = (target: PageKey, query: NavigationQuery = {}) => {
    setNavigationQuery(query);
    setPage(target);
  };
  const openProfile = (person: PersonRecord) => {
    setSelectedPersonCode(person.code);
    setPage('profile');
    setNavigationQuery({});
  };
  const selectedPerson = data.people.find((person) => person.code === selectedPersonCode) ?? data.people[0];

  const handleFile = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    setLoadError('');
    try {
      const parsed = await parseCleanWorkbook(file);
      setData(parsed);
      setSelectedPersonCode(parsed.people[0]?.code ?? '');
      await savePlatformData(parsed);
      navigate('dashboard');
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'حدث خطأ غير متوقع أثناء قراءة الملف.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const useDemo = async () => {
    setData(demoData);
    setSelectedPersonCode(demoData.people[0]?.code ?? '');
    await clearPlatformData();
    navigate('dashboard');
  };
  const clearStored = async () => {
    await clearPlatformData();
    setData(demoData);
    setSelectedPersonCode(demoData.people[0]?.code ?? '');
    navigate('dashboard');
  };

  const pageTitle = page === 'profile' ? 'الملف التحليلي للشخص' : navItems.find((item) => item.key === page)?.label ?? 'المنصة';
  const pageKey = `${page}-${JSON.stringify(navigationQuery)}`;

  return <div className={`app-shell ${sidebarOpen ? '' : 'sidebar-collapsed'}`} dir="rtl">
    <aside className="sidebar">
      <div className="brand-block">
        <div className="brand-mark">360°</div>
        <div className="brand-copy"><strong>تقييم الأداء</strong><span>دائرة الموارد البشرية</span></div>
        <button className="icon-button sidebar-close" onClick={() => setSidebarOpen(false)} aria-label="إغلاق القائمة"><X size={18} /></button>
      </div>
      <div className="sidebar-entity"><span>الجهة</span><strong>مديرية التنمية الإدارية بحمص</strong><small>منصة تحليل نتائج تقييم الأداء 360</small></div>
      <nav className="side-nav">{navItems.map((item) => { const Icon = item.icon; return <button key={item.key} className={page === item.key ? 'active' : ''} onClick={() => navigate(item.key)}><Icon size={19} /><span>{item.label}</span></button>; })}</nav>
      <div className="sidebar-footer">
        <div className="data-source-card"><FileSpreadsheet size={20} /><div><span>مصدر البيانات الحالي</span><strong title={data.fileName}>{data.fileName}</strong><small>{new Date(data.importedAt).toLocaleString('ar-SY')}</small></div></div>
        <button className="sidebar-data-action" onClick={() => fileInputRef.current?.click()}><Upload size={16} /> استبدال ملف البيانات</button>
      </div>
    </aside>

    <main className={page === 'dashboard' ? 'main-area dashboard-main' : 'main-area detail-main'}>
      <header className="topbar">
        <div className="topbar-title">{!sidebarOpen && <button className="icon-button" onClick={() => setSidebarOpen(true)}><Menu size={20} /></button>}<div><span>مديرية التنمية الإدارية بحمص · دائرة الموارد البشرية</span><h1>{pageTitle}</h1></div></div>
        <div className="topbar-actions"><button className="secondary-button" onClick={useDemo}><RefreshCw size={17} /> بيانات تجريبية</button><button className="secondary-button danger-outline" onClick={clearStored}><Trash2 size={17} /> حذف البيانات المحلية</button><button className="primary-button" onClick={() => fileInputRef.current?.click()} disabled={uploading}><Upload size={17} /> {uploading ? 'جارٍ التحليل...' : 'رفع ملف Excel'}</button><input ref={fileInputRef} type="file" accept=".xlsx,.xls" hidden onChange={(event) => handleFile(event.target.files?.[0])} /></div>
      </header>

      {restoring && <div className="loading-strip">جارٍ استعادة آخر ملف محفوظ محليًا...</div>}
      {loadError && <div className="error-banner"><AlertTriangle size={18} /><span>{loadError}</span><button onClick={() => setLoadError('')}><X size={16} /></button></div>}

      <section className="page-content" key={pageKey}>
        {page === 'dashboard' && <Dashboard data={data} navigate={navigate} openProfile={openProfile} />}
        {page === 'people' && <PeoplePage data={data} openProfile={openProfile} initial={navigationQuery} />}
        {page === 'evaluations' && <EvaluationsPage data={data} openProfile={openProfile} initial={navigationQuery} />}
        {page === 'tasks' && <TasksPage data={data} openProfile={openProfile} initial={navigationQuery} />}
        {page === 'criteria' && <CriteriaPage data={data} openProfile={openProfile} initial={navigationQuery} />}
        {page === 'notes' && <NotesPage data={data} openProfile={openProfile} initial={navigationQuery} />}
        {page === 'gaps' && <GapsPage data={data} openProfile={openProfile} initial={navigationQuery} />}
        {page === 'quality' && <QualityPage data={data} />}
        {page === 'profile' && selectedPerson && <ProfilePage data={data} person={selectedPerson} onBack={() => navigate('people')} />}
      </section>
    </main>
  </div>;
}

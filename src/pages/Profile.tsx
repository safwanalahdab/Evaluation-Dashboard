import { useMemo, useState } from 'react';
import {
  ArrowRight,
  CalendarDays,
  Download,
  FileText,
  LayoutList,
  List,
  MessageSquareText,
  ShieldCheck,
  Table2,
  UserRound,
} from 'lucide-react';
import { PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer } from 'recharts';
import type { CriterionRecord, EvaluationRecord, NarrativeRecord, NoteCategory, PersonRecord, PlatformData, TaskRecord } from '../types';
import { DashboardCard, EmptyState, PanelHeader, ScoreBar, SearchInput, Select, unique, valueOrDash } from '../components/common';
import { exportPersonWorkbook } from '../lib/excelExport';
import { exportPersonWord } from '../lib/wordExport';

type Tab = 'overview' | 'tasks' | 'criteria' | 'notes' | 'evaluations';
type Props = { data: PlatformData; person: PersonRecord; onBack: () => void };

const noteCategoryOrder: Array<[NoteCategory, string, string]> = [
  ['strengths', 'نقاط القوة والإيجابيات', 'positive'],
  ['improvements', 'الجوانب التي تحتاج إلى تحسين', 'negative'],
  ['challenges', 'التحديات والجوانب السلبية', 'warning'],
  ['development', 'مجالات التطوير', 'neutral'],
  ['recommendations', 'التوصيات ومقترحات التطوير', 'teal'],
  ['general', 'ملاحظات عامة', 'neutral'],
];

export default function ProfilePage({ data, person, onBack }: Props) {
  const [tab, setTab] = useState<Tab>('overview');
  const [exporting, setExporting] = useState(false);
  const evaluations = data.evaluations.filter((item) => item.personCode === person.code || (!item.personCode && item.personName === person.name));
  const tasks = data.tasks.filter((item) => item.personCode === person.code || (!item.personCode && item.personName === person.name));
  const criteria = data.criteria.filter((item) => item.personCode === person.code || (!item.personCode && item.personName === person.name));
  const narratives = data.narratives.filter((item) => item.personCode === person.code || (!item.personCode && item.personName === person.name));

  const handleWord = async () => {
    setExporting(true);
    try { await exportPersonWord(person); } finally { setExporting(false); }
  };
  const handleExcel = () => exportPersonWorkbook(person, evaluations, tasks, criteria, narratives);

  return <div className="profile-page">
    <button className="back-link" onClick={onBack}><ArrowRight size={17} /> العودة إلى قائمة الأشخاص</button>
    <section className="profile-identity-card">
      <div className="profile-person"><div className="profile-avatar">{person.name.charAt(0)}</div><div><span className="profile-role">{person.role}</span><h2>{person.name}</h2><p>{person.jobTitle || 'المسمى الوظيفي غير متاح'}</p><div className="identity-meta"><span>{person.department}</span><span>المدير/الإدارة: {person.managerName || 'غير متاح'}</span><span>عدد التقييمات: {person.evaluationCount}</span></div></div></div>
      <div className="profile-score-summary"><span>{person.role === 'رئيس دائرة' ? 'تقييم الإدارة' : 'تقييم المدير المباشر'}</span><strong>{valueOrDash(person.managerScore)}</strong><em>من 100</em><small>{person.classification}</small></div>
      <div className="profile-actions"><button className="primary-button" onClick={handleWord} disabled={exporting}><FileText size={17} /> {exporting ? 'جارٍ إنشاء التقرير...' : 'تصدير تقرير Word'}</button><button className="secondary-button" onClick={handleExcel}><Download size={17} /> تصدير التفاصيل Excel</button></div>
    </section>

    <nav className="profile-tabs">
      {([
        ['overview', 'نظرة عامة'], ['tasks', 'المهام'], ['criteria', 'المعايير والسلوكيات'], ['notes', 'الملاحظات والتوصيات'], ['evaluations', 'سجل التقييمات'],
      ] as Array<[Tab, string]>).map(([key, label]) => <button key={key} className={tab === key ? 'active' : ''} onClick={() => setTab(key)}>{label}</button>)}
    </nav>

    {tab === 'overview' && <ProfileOverview person={person} tasks={tasks} criteria={criteria} />}
    {tab === 'tasks' && <ProfileTasks tasks={tasks} />}
    {tab === 'criteria' && <ProfileCriteria criteria={criteria} />}
    {tab === 'notes' && <ProfileNotes narratives={narratives} />}
    {tab === 'evaluations' && <ProfileEvaluations evaluations={evaluations} />}
  </div>;
}

function ProfileOverview({ person, tasks, criteria }: { person: PersonRecord; tasks: TaskRecord[]; criteria: CriterionRecord[] }) {
  const sources = [
    { name: person.role === 'رئيس دائرة' ? 'الإدارة' : 'المدير المباشر', value: person.managerScore },
    { name: 'التقييم الذاتي', value: person.selfScore },
    { name: 'الزملاء', value: person.peerScore },
    ...(person.role === 'رئيس دائرة' ? [{ name: 'الموظفون', value: person.subordinateScore }] : []),
  ];
  const criteriaAggregate = useMemo(() => aggregateCriteria(criteria), [criteria]);
  const topCriteria = [...criteriaAggregate].sort((a, b) => b.score - a.score).slice(0, 2);
  const lowCriteria = [...criteriaAggregate].sort((a, b) => a.score - b.score).slice(0, 2);
  const topTask = [...tasks].sort((a, b) => b.percentage - a.percentage)[0];
  const lowTask = [...tasks].sort((a, b) => a.percentage - b.percentage)[0];
  const summaryParts = [
    person.managerScore == null ? 'لا تتوفر نتيجة تقييم المدير/الإدارة ضمن الملف الحالي.' : `بلغ تقييم المدير/الإدارة ${person.managerScore.toFixed(1)} من 100، بينما ${person.finalScore == null ? 'لم يكتمل احتساب التقييم الكلي' : `بلغ التقييم الكلي ${person.finalScore.toFixed(1)}`}.`,
    topCriteria.length ? `أعلى المعايير أداءً: ${topCriteria.map((item) => item.name).join('، ')}.` : '',
    lowCriteria.length ? `المعايير الأقل أداءً: ${lowCriteria.map((item) => item.name).join('، ')}.` : '',
    topTask ? `أعلى مهمة مسجلة: ${topTask.task} بنسبة ${topTask.percentage.toFixed(1)}%.` : '',
    lowTask && lowTask !== topTask ? `أقل مهمة مسجلة: ${lowTask.task} بنسبة ${lowTask.percentage.toFixed(1)}%.` : '',
  ].filter(Boolean);

  return <div className="profile-overview-grid">
    <section className="light-card analytic-summary"><PanelHeader title="الملخص التحليلي" subtitle="ملخص آلي حتمي مبني على الأرقام المسجلة دون توليد أو تخمين" /><div className="summary-narrative">{summaryParts.map((part, index) => <p key={index}>{part}</p>)}</div></section>
    <section className="light-card source-scores"><PanelHeader title="مسارات التقييم" subtitle="كل مصدر ظاهر بصورة مستقلة" /><div className="source-score-grid">{sources.map((source) => <div key={source.name}><span>{source.name}</span><strong>{valueOrDash(source.value)}</strong><ScoreBar value={source.value ?? 0} compact /></div>)}</div></section>
    <section className="light-card gap-card"><PanelHeader title="فجوة التقييم" subtitle="الفرق بين الذاتي والمدير/الإدارة" /><div className={`big-gap ${(person.gap ?? 0) >= 25 ? 'danger' : ''}`}><strong>{valueOrDash(person.gap)}</strong><span>نقطة</span></div><p>{person.gap == null ? 'لا تتوفر بيانات كافية للمقارنة.' : `${person.gapDirection}. ${(person.gap ?? 0) >= 25 ? 'تحتاج الحالة إلى مراجعة إدارية.' : 'الفجوة ضمن النطاق المعتدل.'}`}</p></section>
    <section className="light-card radar-card"><PanelHeader title="بصمة المعايير" subtitle="متوسط مستقل للمعايير المتاحة" />{criteriaAggregate.length ? <ResponsiveContainer width="100%" height={310}><RadarChart data={criteriaAggregate.slice(0, 8)}><PolarGrid stroke="#cbd8e0" /><PolarAngleAxis dataKey="shortName" tick={{ fill: '#5e6d79', fontSize: 11 }} /><Radar name="المتوسط" dataKey="score" stroke="#0caabd" fill="#16bed2" fillOpacity={0.3} /></RadarChart></ResponsiveContainer> : <EmptyState text="لا توجد معايير قابلة للرسم." />}</section>
    <section className="light-card narrative-preview"><PanelHeader title="النقاط السردية التي كتبها الآخرون" subtitle={`${person.othersNoteCount} نقطة ستدخل في تقرير Word دون إظهار مصدرها`} /><div className="mini-notes">{noteCategoryOrder.slice(0, 3).map(([key, title, tone]) => <NotePreview key={key} title={title} items={person.notes[key]} tone={tone} />)}</div></section>
  </div>;
}

function ProfileTasks({ tasks }: { tasks: TaskRecord[] }) {
  const [view, setView] = useState<'cards' | 'table'>('cards');
  const [search, setSearch] = useState('');
  const [type, setType] = useState('الكل');
  const [evaluator, setEvaluator] = useState('الكل');
  const filtered = tasks.filter((item) => {
    const query = search.toLocaleLowerCase('ar');
    return (!query || [item.task, item.indicator, item.evaluatorName, item.code].some((value) => value.toLocaleLowerCase('ar').includes(query)))
      && (type === 'الكل' || item.evaluationType === type)
      && (evaluator === 'الكل' || item.evaluatorName === evaluator);
  });
  return <section className="single-panel profile-tab-panel"><PanelHeader title="تفاصيل المهام" subtitle={`${filtered.length} سجل؛ لا يتم دمج التقييم الذاتي مع تقييم المدير`} actions={<div className="view-toggle"><button className={view === 'cards' ? 'active' : ''} onClick={() => setView('cards')}><LayoutList size={16} /> عرض تحليلي</button><button className={view === 'table' ? 'active' : ''} onClick={() => setView('table')}><Table2 size={16} /> جدول</button></div>} /><div className="profile-filter-row"><SearchInput value={search} onChange={setSearch} placeholder="بحث في المهمة أو المؤشر أو المُقيّم" /><Select value={type} onChange={setType} options={unique(tasks.map((item) => item.evaluationType))} /><Select value={evaluator} onChange={setEvaluator} options={unique(tasks.map((item) => item.evaluatorName))} /></div>
    {view === 'cards' ? <div className="task-card-list">{filtered.map((item, index) => <article className="task-detail-card" key={`${item.evaluationId}-${index}`}><header><span>المهمة {item.number}</span><em>{item.percentage.toFixed(1)}%</em></header><h3>{item.task}</h3><div className="task-indicator"><strong>مؤشر الأداء</strong><p>{item.indicator || 'غير متاح'}</p></div><div className="task-metrics"><span>الوزن <strong>{item.weight}</strong></span><span>الدرجة <strong>{item.score}</strong></span><span>نوع التقييم <strong>{item.evaluationType}</strong></span><span>المُقيّم <strong>{item.evaluatorName || 'غير متاح'}</strong></span></div><ScoreBar value={item.percentage} /></article>)}{!filtered.length && <EmptyState text="لا توجد مهام مطابقة." />}</div>
      : <div className="table-scroll"><table className="data-table tasks-table"><thead><tr><th>نوع التقييم</th><th>اسم المُقيّم</th><th>رقم المهمة</th><th>المهمة</th><th>مؤشر الأداء</th><th>الوزن</th><th>الدرجة</th><th>النسبة</th></tr></thead><tbody>{filtered.map((item, index) => <tr key={`${item.evaluationId}-${index}`}><td>{item.evaluationType}</td><td><strong>{item.evaluatorName || 'غير متاح'}</strong></td><td>{item.number}</td><td className="long-text-cell">{item.task}</td><td className="long-text-cell">{item.indicator}</td><td>{item.weight}</td><td>{item.score}</td><td><ScoreBar value={item.percentage} /></td></tr>)}</tbody></table></div>}
  </section>;
}

function ProfileCriteria({ criteria }: { criteria: CriterionRecord[] }) {
  const [view, setView] = useState<'cards' | 'table'>('cards');
  const [search, setSearch] = useState('');
  const [type, setType] = useState('الكل');
  const [evaluator, setEvaluator] = useState('الكل');
  const filtered = criteria.filter((item) => {
    const query = search.toLocaleLowerCase('ar');
    return (!query || [item.criterion, item.evaluatorName].some((value) => value.toLocaleLowerCase('ar').includes(query)))
      && (type === 'الكل' || item.evaluationType === type)
      && (evaluator === 'الكل' || item.evaluatorName === evaluator);
  });
  return <section className="single-panel profile-tab-panel"><PanelHeader title="تفاصيل المعايير والسلوكيات" subtitle={`${filtered.length} سجل مع إظهار أسماء المُقيّمين للأدمن`} actions={<div className="view-toggle"><button className={view === 'cards' ? 'active' : ''} onClick={() => setView('cards')}><LayoutList size={16} /> عرض تحليلي</button><button className={view === 'table' ? 'active' : ''} onClick={() => setView('table')}><Table2 size={16} /> جدول</button></div>} /><div className="profile-filter-row"><SearchInput value={search} onChange={setSearch} placeholder="بحث في المعيار أو المُقيّم" /><Select value={type} onChange={setType} options={unique(criteria.map((item) => item.evaluationType))} /><Select value={evaluator} onChange={setEvaluator} options={unique(criteria.map((item) => item.evaluatorName))} /></div>
    {view === 'cards' ? <div className="criteria-card-list">{filtered.map((item, index) => <article className="criterion-detail-card" key={`${item.evaluationId}-${index}`}><div><span>{item.evaluationType}</span><h3>{item.criterion}</h3><p>المُقيّم: <strong>{item.evaluatorName || 'غير متاح'}</strong></p></div><div className="criterion-score"><strong>{item.score} / {item.maximum}</strong><ScoreBar value={item.percentage} compact /></div></article>)}{!filtered.length && <EmptyState text="لا توجد معايير مطابقة." />}</div>
      : <div className="table-scroll"><table className="data-table"><thead><tr><th>نوع التقييم</th><th>اسم المُقيّم</th><th>المعيار</th><th>الدرجة القصوى</th><th>الدرجة</th><th>النسبة</th></tr></thead><tbody>{filtered.map((item, index) => <tr key={`${item.evaluationId}-${index}`}><td>{item.evaluationType}</td><td><strong>{item.evaluatorName || 'غير متاح'}</strong></td><td>{item.criterion}</td><td>{item.maximum}</td><td>{item.score}</td><td><ScoreBar value={item.percentage} /></td></tr>)}</tbody></table></div>}
  </section>;
}

function ProfileNotes({ narratives }: { narratives: NarrativeRecord[] }) {
  const [category, setCategory] = useState('الكل');
  const [evaluator, setEvaluator] = useState('الكل');
  const otherNotes = narratives.filter((item) => !item.isSelf && (category === 'الكل' || item.categoryLabel === category) && (evaluator === 'الكل' || item.evaluatorName === evaluator));
  const selfNotes = narratives.filter((item) => item.isSelf);
  return <div className="profile-notes-layout"><section className="single-panel"><PanelHeader title="ما كتبه الآخرون عن الشخص" subtitle="هذه النقاط تدخل في تقرير Word بعد إخفاء مصدرها" actions={<ShieldCheck size={20} />} /><div className="profile-filter-row"><Select value={category} onChange={setCategory} options={unique(narratives.filter((item) => !item.isSelf).map((item) => item.categoryLabel))} /><Select value={evaluator} onChange={setEvaluator} options={unique(narratives.filter((item) => !item.isSelf).map((item) => item.evaluatorName))} /></div><div className="narrative-admin-grid profile-narratives">{otherNotes.map((item) => <article className="admin-note-card other" key={item.id}><header><span>{item.categoryLabel}</span><em>كتبها شخص آخر</em></header><p>{item.text}</p><footer><span>المُقيّم: <strong>{item.evaluatorName || 'غير متاح'}</strong></span><span>{item.evaluationType}</span><span>{item.date || '—'}</span></footer></article>)}{!otherNotes.length && <EmptyState text="لا توجد نقاط سردية مطابقة." />}</div></section>
    <section className="single-panel self-notes-panel"><PanelHeader title="إفادة الشخص الذاتية" subtitle="تظهر للأدمن داخل المنصة، ولا تدخل في تقرير Word" actions={<UserRound size={20} />} /><div className="narrative-admin-grid profile-narratives">{selfNotes.map((item) => <article className="admin-note-card self" key={item.id}><header><span>{item.categoryLabel}</span><em>تقييم ذاتي</em></header><p>{item.text}</p><footer><span>{item.evaluationType}</span><span>{item.date || '—'}</span></footer></article>)}{!selfNotes.length && <EmptyState text="لا توجد إفادة ذاتية سردية." />}</div></section>
  </div>;
}

function ProfileEvaluations({ evaluations }: { evaluations: EvaluationRecord[] }) {
  const [view, setView] = useState<'timeline' | 'table'>('timeline');
  const sorted = [...evaluations].sort((a, b) => String(b.date ?? '').localeCompare(String(a.date ?? '')));
  return <section className="single-panel profile-tab-panel"><PanelHeader title="سجل التقييمات" subtitle={`${sorted.length} استجابة مرتبطة بالشخص`} actions={<div className="view-toggle"><button className={view === 'timeline' ? 'active' : ''} onClick={() => setView('timeline')}><List size={16} /> خط زمني</button><button className={view === 'table' ? 'active' : ''} onClick={() => setView('table')}><Table2 size={16} /> جدول</button></div>} />
    {view === 'timeline' ? <div className="evaluation-timeline">{sorted.map((item) => <article key={item.id}><div className="timeline-dot" /><div className="timeline-date"><CalendarDays size={16} /> {item.date || 'تاريخ غير متاح'}</div><div className="timeline-card"><header><h3>{item.type}</h3><strong>{valueOrDash(item.calculatedScore)}</strong></header><p>المُقيّم: <b>{item.evaluatorName || 'غير متاح'}</b></p><div><span>{item.taskCount} مهام</span><span>{item.criterionCount} معايير</span><span>{item.status}</span></div></div></article>)}{!sorted.length && <EmptyState text="لا توجد تقييمات مرتبطة." />}</div>
      : <div className="table-scroll"><table className="data-table"><thead><tr><th>نوع التقييم</th><th>اسم المُقيّم</th><th>التاريخ</th><th>المهام</th><th>المعايير</th><th>نتيجة المهام</th><th>نتيجة المعايير</th><th>النتيجة</th><th>الحالة</th></tr></thead><tbody>{sorted.map((item) => <tr key={item.id}><td>{item.type}</td><td><strong>{item.evaluatorName || 'غير متاح'}</strong></td><td>{item.date || '—'}</td><td>{item.taskCount}</td><td>{item.criterionCount}</td><td>{valueOrDash(item.taskScore)}</td><td>{valueOrDash(item.criterionScore)}</td><td className="strong cyan-text">{valueOrDash(item.calculatedScore)}</td><td>{item.status}</td></tr>)}</tbody></table></div>}
  </section>;
}

function aggregateCriteria(criteria: CriterionRecord[]) {
  const map = new Map<string, number[]>();
  criteria.forEach((item) => map.set(item.criterion, [...(map.get(item.criterion) ?? []), item.percentage]));
  return Array.from(map.entries()).map(([name, values]) => ({ name, shortName: name.length > 22 ? `${name.slice(0, 22)}…` : name, score: values.reduce((sum, value) => sum + value, 0) / values.length }));
}

function NotePreview({ title, items, tone }: { title: string; items: string[]; tone: string }) {
  return <div className={`note-preview ${tone}`}><h4>{title}</h4>{items.length ? <ul>{items.slice(0, 3).map((item, index) => <li key={index}>{item}</li>)}</ul> : <p>لا توجد بيانات.</p>}</div>;
}

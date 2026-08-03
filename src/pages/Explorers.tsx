import { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, ChevronLeft, Database, FileWarning, UserRound } from 'lucide-react';
import type { NavigationQuery, NarrativeRecord, PersonRecord, PlatformData } from '../types';
import { EmptyState, ExplorerLayout, FilterField, PanelHeader, ScoreBar, SearchInput, Select, unique, valueOrDash } from '../components/common';
import { exportRowsToExcel } from '../lib/excelExport';

const findPerson = (data: PlatformData, code: string, name: string) => data.people.find((item) => item.code === code || (!code && item.name === name));

export function EvaluationsPage({ data, openProfile, initial = {} }: { data: PlatformData; openProfile: (person: PersonRecord) => void; initial?: NavigationQuery }) {
  const [search, setSearch] = useState(initial.search ?? '');
  const [type, setType] = useState('الكل');
  const [department, setDepartment] = useState(initial.department ?? 'الكل');
  const [evaluator, setEvaluator] = useState('الكل');
  const [status, setStatus] = useState('الكل');
  const filtered = useMemo(() => data.evaluations.filter((item) => {
    const query = search.toLocaleLowerCase('ar');
    return (!query || [item.personName, item.personCode, item.evaluatorName, item.type, item.id].some((value) => value.toLocaleLowerCase('ar').includes(query)))
      && (type === 'الكل' || item.type === type)
      && (department === 'الكل' || item.personDepartment === department)
      && (evaluator === 'الكل' || item.evaluatorName === evaluator)
      && (status === 'الكل' || item.status === status);
  }), [data.evaluations, search, type, department, evaluator, status]);
  const exportData = () => exportRowsToExcel('مستكشف-التقييمات.xlsx', 'التقييمات', filtered.map((item) => ({
    'الشخص محل التقييم': item.personName, 'كود الشخص': item.personCode, 'نوع التقييم': item.type, 'اسم المُقيّم': item.evaluatorName,
    'دائرة الشخص': item.personDepartment, 'المسمى الوظيفي': item.personJobTitle, 'تاريخ التقييم': item.date,
    'عدد المهام': item.taskCount, 'عدد المعايير': item.criterionCount, 'نتيجة المهام': item.taskScore,
    'نتيجة المعايير': item.criterionScore, 'النتيجة': item.calculatedScore, 'الحالة': item.status, 'معرف التقييم': item.id,
  })));
  return <ExplorerLayout title="مستكشف التقييمات" count={filtered.length} onExport={exportData} filters={<>
    <SearchInput value={search} onChange={setSearch} placeholder="الشخص، المُقيّم، النوع أو معرف التقييم" />
    <Select value={type} onChange={setType} options={unique(data.evaluations.map((item) => item.type))} />
    <Select value={department} onChange={setDepartment} options={unique(data.evaluations.map((item) => item.personDepartment))} />
    <Select value={evaluator} onChange={setEvaluator} options={unique(data.evaluations.map((item) => item.evaluatorName))} />
    <Select value={status} onChange={setStatus} options={unique(data.evaluations.map((item) => item.status))} />
  </>}>
    <div className="table-scroll"><table className="data-table"><thead><tr><th>الشخص محل التقييم</th><th>نوع التقييم</th><th>اسم المُقيّم</th><th>دائرة الشخص</th><th>التاريخ</th><th>المهام</th><th>المعايير</th><th>نتيجة المهام</th><th>نتيجة المعايير</th><th>النتيجة</th><th>الحالة</th><th /></tr></thead><tbody>
      {filtered.map((item) => { const person = findPerson(data, item.personCode, item.personName); return <tr key={item.id}><td><button className="plain-link" disabled={!person} onClick={() => person && openProfile(person)}>{item.personName || item.personCode || 'غير متاح'}</button><small className="block-code">{item.personCode}</small></td><td>{item.type}</td><td><strong>{item.evaluatorName || 'غير متاح'}</strong><small className="block-code">{item.evaluatorJobTitle}</small></td><td>{item.personDepartment}</td><td>{item.date || '—'}</td><td>{item.taskCount}</td><td>{item.criterionCount}</td><td>{valueOrDash(item.taskScore)}</td><td>{valueOrDash(item.criterionScore)}</td><td className="numeric strong cyan-text">{valueOrDash(item.calculatedScore)}</td><td>{item.status}</td><td><span className="technical-link" title={item.id}>تفاصيل السجل</span></td></tr>; })}
      {!filtered.length && <tr><td colSpan={12}><EmptyState text="لا توجد تقييمات مطابقة." /></td></tr>}
    </tbody></table></div>
  </ExplorerLayout>;
}

export function TasksPage({ data, openProfile, initial = {} }: { data: PlatformData; openProfile: (person: PersonRecord) => void; initial?: NavigationQuery }) {
  const [search, setSearch] = useState(initial.search ?? '');
  const [type, setType] = useState('الكل');
  const [department, setDepartment] = useState(initial.department ?? 'الكل');
  const [evaluator, setEvaluator] = useState('الكل');
  const [threshold, setThreshold] = useState('100');
  const filtered = useMemo(() => data.tasks.filter((item) => {
    const query = search.toLocaleLowerCase('ar');
    return (!query || [item.personName, item.personCode, item.evaluatorName, item.task, item.indicator, item.code].some((value) => value.toLocaleLowerCase('ar').includes(query)))
      && (type === 'الكل' || item.evaluationType === type)
      && (department === 'الكل' || item.department === department)
      && (evaluator === 'الكل' || item.evaluatorName === evaluator)
      && item.percentage <= Number(threshold || 100);
  }), [data.tasks, search, type, department, evaluator, threshold]);
  const exportData = () => exportRowsToExcel('مستكشف-المهام.xlsx', 'المهام', filtered.map((item) => ({
    'الشخص': item.personName, 'الدائرة': item.department, 'نوع التقييم': item.evaluationType, 'اسم المُقيّم': item.evaluatorName,
    'رقم المهمة': item.number, 'رمز المهمة': item.code, 'المهمة': item.task, 'مؤشر الأداء': item.indicator,
    'الوزن': item.weight, 'الدرجة': item.score, 'النسبة': item.percentage, 'معرف التقييم': item.evaluationId,
  })));
  return <ExplorerLayout title="مستكشف المهام" count={filtered.length} onExport={exportData} filters={<>
    <SearchInput value={search} onChange={setSearch} placeholder="الشخص، المُقيّم، المهمة أو المؤشر" />
    <Select value={type} onChange={setType} options={unique(data.tasks.map((item) => item.evaluationType))} />
    <Select value={department} onChange={setDepartment} options={unique(data.tasks.map((item) => item.department))} />
    <Select value={evaluator} onChange={setEvaluator} options={unique(data.tasks.map((item) => item.evaluatorName))} />
    <FilterField label="النسبة حتى"><input type="number" min="0" max="100" value={threshold} onChange={(event) => setThreshold(event.target.value)} /></FilterField>
  </>}>
    <div className="table-scroll"><table className="data-table tasks-table"><thead><tr><th>الشخص</th><th>الدائرة</th><th>نوع التقييم</th><th>اسم المُقيّم</th><th>رقم المهمة</th><th>المهمة</th><th>مؤشر الأداء</th><th>الوزن</th><th>الدرجة</th><th>النسبة</th></tr></thead><tbody>
      {filtered.map((item, index) => { const person = findPerson(data, item.personCode, item.personName); return <tr key={`${item.evaluationId}-${index}`}><td><button className="plain-link" disabled={!person} onClick={() => person && openProfile(person)}>{item.personName || item.personCode}</button></td><td>{item.department}</td><td>{item.evaluationType}</td><td><strong>{item.evaluatorName || 'غير متاح'}</strong></td><td>{item.number}</td><td className="long-text-cell">{item.task}</td><td className="long-text-cell">{item.indicator}</td><td>{item.weight}</td><td>{item.score}</td><td><ScoreBar value={item.percentage} /></td></tr>; })}
      {!filtered.length && <tr><td colSpan={10}><EmptyState text="لا توجد مهام مطابقة." /></td></tr>}
    </tbody></table></div>
  </ExplorerLayout>;
}

export function CriteriaPage({ data, openProfile, initial = {} }: { data: PlatformData; openProfile: (person: PersonRecord) => void; initial?: NavigationQuery }) {
  const [search, setSearch] = useState(initial.search ?? '');
  const [type, setType] = useState('الكل');
  const [department, setDepartment] = useState(initial.department ?? 'الكل');
  const [evaluator, setEvaluator] = useState('الكل');
  const [threshold, setThreshold] = useState('100');
  const filtered = useMemo(() => data.criteria.filter((item) => {
    const query = search.toLocaleLowerCase('ar');
    return (!query || [item.personName, item.evaluatorName, item.criterion, item.code].some((value) => value.toLocaleLowerCase('ar').includes(query)))
      && (type === 'الكل' || item.evaluationType === type)
      && (department === 'الكل' || item.department === department)
      && (evaluator === 'الكل' || item.evaluatorName === evaluator)
      && item.percentage <= Number(threshold || 100);
  }), [data.criteria, search, type, department, evaluator, threshold]);
  const exportData = () => exportRowsToExcel('مستكشف-المعايير.xlsx', 'المعايير', filtered.map((item) => ({
    'الشخص': item.personName, 'الدائرة': item.department, 'نوع التقييم': item.evaluationType, 'اسم المُقيّم': item.evaluatorName,
    'المعيار': item.criterion, 'الدرجة القصوى': item.maximum, 'الدرجة': item.score, 'النسبة': item.percentage, 'معرف التقييم': item.evaluationId,
  })));
  return <ExplorerLayout title="مستكشف المعايير والسلوكيات" count={filtered.length} onExport={exportData} filters={<>
    <SearchInput value={search} onChange={setSearch} placeholder="الشخص، المُقيّم أو المعيار" />
    <Select value={type} onChange={setType} options={unique(data.criteria.map((item) => item.evaluationType))} />
    <Select value={department} onChange={setDepartment} options={unique(data.criteria.map((item) => item.department))} />
    <Select value={evaluator} onChange={setEvaluator} options={unique(data.criteria.map((item) => item.evaluatorName))} />
    <FilterField label="النسبة حتى"><input type="number" min="0" max="100" value={threshold} onChange={(event) => setThreshold(event.target.value)} /></FilterField>
  </>}>
    <div className="table-scroll"><table className="data-table"><thead><tr><th>الشخص</th><th>الدائرة</th><th>نوع التقييم</th><th>اسم المُقيّم</th><th>المعيار</th><th>الدرجة القصوى</th><th>الدرجة</th><th>النسبة</th></tr></thead><tbody>
      {filtered.map((item, index) => { const person = findPerson(data, item.personCode, item.personName); return <tr key={`${item.evaluationId}-${index}`}><td><button className="plain-link" disabled={!person} onClick={() => person && openProfile(person)}>{item.personName || item.personCode}</button></td><td>{item.department}</td><td>{item.evaluationType}</td><td><strong>{item.evaluatorName || 'غير متاح'}</strong></td><td className="wrap-cell">{item.criterion}</td><td>{item.maximum}</td><td>{item.score}</td><td><ScoreBar value={item.percentage} /></td></tr>; })}
      {!filtered.length && <tr><td colSpan={8}><EmptyState text="لا توجد معايير مطابقة." /></td></tr>}
    </tbody></table></div>
  </ExplorerLayout>;
}

export function NotesPage({ data, openProfile, initial = {} }: { data: PlatformData; openProfile: (person: PersonRecord) => void; initial?: NavigationQuery }) {
  const [search, setSearch] = useState(initial.search ?? '');
  const [category, setCategory] = useState('الكل');
  const [evaluator, setEvaluator] = useState('الكل');
  const [type, setType] = useState('الكل');
  const [sourceMode, setSourceMode] = useState('الكل');
  const filtered = useMemo(() => data.narratives.filter((item) => {
    const query = search.toLocaleLowerCase('ar');
    return (!query || [item.personName, item.evaluatorName, item.text, item.categoryLabel, item.evaluationType].some((value) => value.toLocaleLowerCase('ar').includes(query)))
      && (category === 'الكل' || item.categoryLabel === category)
      && (evaluator === 'الكل' || item.evaluatorName === evaluator)
      && (type === 'الكل' || item.evaluationType === type)
      && (sourceMode === 'الكل' || (sourceMode === 'الآخرون' ? !item.isSelf : item.isSelf));
  }), [data.narratives, search, category, evaluator, type, sourceMode]);
  const exportData = () => exportRowsToExcel('الملاحظات-والتوصيات.xlsx', 'الملاحظات', filtered.map((item) => ({
    'الشخص محل التقييم': item.personName, 'تصنيف الملاحظة': item.categoryLabel, 'النص': item.text,
    'اسم المُقيّم': item.evaluatorName, 'نوع التقييم': item.evaluationType, 'تقييم ذاتي': item.isSelf ? 'نعم' : 'لا', 'التاريخ': item.date,
  })));
  return <ExplorerLayout title="الملاحظات والتوصيات" count={filtered.length} onExport={exportData} filters={<>
    <SearchInput value={search} onChange={setSearch} placeholder="بحث نصي داخل الملاحظات أو بالأسماء" />
    <Select value={category} onChange={setCategory} options={unique(data.narratives.map((item) => item.categoryLabel))} />
    <Select value={evaluator} onChange={setEvaluator} options={unique(data.narratives.map((item) => item.evaluatorName))} />
    <Select value={type} onChange={setType} options={unique(data.narratives.map((item) => item.evaluationType))} />
    <Select value={sourceMode} onChange={setSourceMode} options={['الكل', 'الآخرون', 'ذاتي']} />
  </>}>
    <div className="narrative-admin-grid">{filtered.map((item) => { const person = findPerson(data, item.personCode, item.personName); return <article className={`admin-note-card ${item.isSelf ? 'self' : 'other'}`} key={item.id}><header><span>{item.categoryLabel}</span><em>{item.isSelf ? 'إفادة ذاتية' : 'كتبه شخص آخر'}</em></header><p>{item.text}</p><footer><button disabled={!person} onClick={() => person && openProfile(person)}>{item.personName || item.personCode}</button><span>المُقيّم: <strong>{item.evaluatorName || 'غير متاح'}</strong></span><span>{item.evaluationType}</span><span>{item.date || '—'}</span></footer></article>; })}{!filtered.length && <EmptyState text="لا توجد ملاحظات مطابقة." />}</div>
  </ExplorerLayout>;
}

export function GapsPage({ data, openProfile, initial = {} }: { data: PlatformData; openProfile: (person: PersonRecord) => void; initial?: NavigationQuery }) {
  const [search, setSearch] = useState(initial.search ?? '');
  const [department, setDepartment] = useState(initial.department ?? 'الكل');
  const [role, setRole] = useState(initial.role ?? 'الكل');
  const [completion, setCompletion] = useState(initial.completion ?? 'الكل');
  const [direction, setDirection] = useState('الكل');
  const [minGap, setMinGap] = useState(String(initial.minGap ?? (initial.reviewOnly ? 25 : 0)));
  const [maxGap, setMaxGap] = useState(String(initial.maxGap ?? 100));
  const [reviewOnly, setReviewOnly] = useState(initial.reviewOnly ?? false);
  const filtered = useMemo(() => data.people.filter((person) => {
    const query = search.toLocaleLowerCase('ar');
    const gap = person.gap ?? -1;
    return (!query || [person.name, person.department, person.jobTitle, person.managerName].some((value) => value.toLocaleLowerCase('ar').includes(query)))
      && (department === 'الكل' || person.department === department)
      && (role === 'الكل' || person.role === role)
      && (completion === 'الكل' || person.completion === completion)
      && (direction === 'الكل' || person.gapDirection === direction)
      && gap >= Number(minGap || 0) && gap <= Number(maxGap || 100)
      && (!reviewOnly || gap >= 25);
  }).sort((a, b) => (b.gap ?? -1) - (a.gap ?? -1)), [data.people, search, department, role, completion, direction, minGap, maxGap, reviewOnly]);
  const exportData = () => exportRowsToExcel('فجوات-التقييم.xlsx', 'فجوات التقييم', filtered.map((person) => ({
    'اسم الشخص': person.name, 'الصفة': person.role, 'الدائرة': person.department, 'المسمى الوظيفي': person.jobTitle,
    'اسم المدير/الإدارة': person.managerName, 'التقييم الذاتي': person.selfScore, 'تقييم المدير/الإدارة': person.managerScore,
    'الفجوة': person.gap, 'اتجاه الفجوة': person.gapDirection, 'التقييم الكلي': person.finalScore, 'الاكتمال': person.completion,
  })));
  return <div className="single-panel gap-page"><PanelHeader title="فجوات التقييم" subtitle="جميع الأشخاص متاحون للأدمن، وعتبة المراجعة قابلة للتغيير" />
    <div className="quick-tabs"><button className={!reviewOnly ? 'active' : ''} onClick={() => setReviewOnly(false)}>جميع الأشخاص</button><button className={reviewOnly ? 'active danger-tab' : ''} onClick={() => { setReviewOnly(true); setMinGap('25'); }}>الحالات التي تحتاج مراجعة</button></div>
    <div className="gap-alert"><AlertTriangle size={22} /><strong>{data.people.filter((person) => (person.gap ?? 0) >= 25).length}</strong><span>حالة تجاوزت عتبة 25 نقطة وتحتاج مراجعة إدارية.</span></div>
    <div className="explorer-filters"><SearchInput value={search} onChange={setSearch} placeholder="بحث بالاسم أو الدائرة أو المدير" /><Select value={department} onChange={setDepartment} options={unique(data.people.map((item) => item.department))} /><Select value={role} onChange={setRole} options={['الكل', 'موظف', 'رئيس دائرة']} /><Select value={completion} onChange={setCompletion} options={['الكل', 'مكتمل', 'جزئي', 'غير مكتمل']} /><Select value={direction} onChange={setDirection} options={['الكل', 'الذاتي أعلى', 'المدير/الإدارة أعلى', 'متساوي', 'غير متاح']} /><FilterField label="الفجوة من"><input type="number" value={minGap} onChange={(event) => setMinGap(event.target.value)} /></FilterField><FilterField label="إلى"><input type="number" value={maxGap} onChange={(event) => setMaxGap(event.target.value)} /></FilterField><button className="secondary-button" onClick={exportData}>تصدير</button></div>
    <div className="table-scroll"><table className="data-table"><thead><tr><th>الشخص</th><th>الصفة</th><th>الدائرة</th><th>المسمى الوظيفي</th><th>المدير/الإدارة</th><th>التقييم الذاتي</th><th>تقييم المدير/الإدارة</th><th>الفجوة</th><th>الاتجاه</th><th>التقييم الكلي</th><th>الاكتمال</th><th /></tr></thead><tbody>
      {filtered.map((person) => <tr key={person.code}><td><button className="plain-link" onClick={() => openProfile(person)}>{person.name}</button></td><td>{person.role}</td><td>{person.department}</td><td>{person.jobTitle}</td><td>{person.managerName || '—'}</td><td>{valueOrDash(person.selfScore)}</td><td>{valueOrDash(person.managerScore)}</td><td className={(person.gap ?? 0) >= 25 ? 'danger-text strong' : 'strong'}>{valueOrDash(person.gap)}</td><td>{person.gapDirection}</td><td>{valueOrDash(person.finalScore)}</td><td>{person.completion}</td><td><button className="row-action" onClick={() => openProfile(person)}>فتح الملف <ChevronLeft size={15} /></button></td></tr>)}
      {!filtered.length && <tr><td colSpan={12}><EmptyState text="لا توجد فجوات مطابقة للفلاتر." /></td></tr>}
    </tbody></table></div>
  </div>;
}

export function QualityPage({ data }: { data: PlatformData }) {
  const high = data.qualityIssues.filter((item) => String(item.severity).startsWith('عال')).length;
  const medium = data.qualityIssues.filter((item) => String(item.severity).startsWith('متوسط')).length;
  return <div className="quality-layout"><div className="quality-kpis"><QualityKpi icon={Database} label="إجمالي المشكلات" value={data.qualityIssues.length} /><QualityKpi icon={FileWarning} label="عالية الخطورة" value={high} /><QualityKpi icon={AlertTriangle} label="متوسطة الخطورة" value={medium} /><QualityKpi icon={CheckCircle2} label="أشخاص قابلون للتحليل" value={data.people.length} /></div><section className="single-panel"><PanelHeader title="سجل جودة البيانات" subtitle="المشكلات المكتشفة في ملف التنظيف" /><div className="table-scroll"><table className="data-table"><thead><tr><th>الخطورة</th><th>نوع المشكلة</th><th>الوصف</th><th>الإجراء المقترح</th><th>الشيت</th><th>السجل</th><th>معرف التقييم</th></tr></thead><tbody>{data.qualityIssues.map((item, index) => <tr key={`${item.evaluationId}-${index}`}><td><span className={`severity ${String(item.severity).startsWith('عال') ? 'high' : String(item.severity).startsWith('متوسط') ? 'medium' : 'low'}`}>{item.severity}</span></td><td>{item.category}</td><td className="long-text-cell">{item.message}</td><td className="long-text-cell">{item.suggestedAction || '—'}</td><td>{item.sheet || '—'}</td><td>{item.row || '—'}</td><td><small>{item.evaluationId || '—'}</small></td></tr>)}{!data.qualityIssues.length && <tr><td colSpan={7}><EmptyState text="لا توجد مشكلات جودة مسجلة." /></td></tr>}</tbody></table></div></section></div>;
}

function QualityKpi({ icon: Icon, label, value }: { icon: typeof UserRound; label: string; value: number }) {
  return <div className="quality-kpi"><Icon size={21} /><div><strong>{value}</strong><span>{label}</span></div></div>;
}

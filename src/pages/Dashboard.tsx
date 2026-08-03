import { useState, type CSSProperties } from 'react';
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  ClipboardList,
  FileText,
  Gauge,
  MessageSquareText,
  UsersRound,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { NavigationQuery, PageKey, PersonRecord, PlatformData } from '../types';
import { averageNumbers, DashboardCard, valueOrDash } from '../components/common';

type Props = {
  data: PlatformData;
  navigate: (page: PageKey, query?: NavigationQuery) => void;
  openProfile: (person: PersonRecord) => void;
};

type PopulationFilter = 'all' | 'employees' | 'directors';
type SourceKey = 'manager' | 'administration' | 'self' | 'peers' | 'subordinates' | 'other';
type SourceDatum = { key: SourceKey; name: string; score: number; count: number; searchTerm: string };
type DepartmentDatum = { department: string; score: number; count: number };

type DepartmentTickProps = {
  x?: number;
  y?: number;
  payload?: { value?: string };
};

const colors = ['#16bed2', '#62a8ff', '#36d7c7', '#8c7cf6', '#f4b860', '#ef7181'];
const sourceColors: Record<SourceKey, string> = {
  manager: '#16bed2',
  administration: '#62a8ff',
  self: '#8c7cf6',
  peers: '#36d7c7',
  subordinates: '#f4b860',
  other: '#8ba1ae',
};
const tooltipStyle = { background: '#0b2b45', border: '1px solid #214b66', borderRadius: 10, color: '#fff', fontFamily: 'Dubai, Cairo, sans-serif' };

const sourceDetails = (evaluationType: string): { key: SourceKey; name: string; searchTerm: string } => {
  if (evaluationType.includes('تقييم الإدارة لرئيس الدائرة')) return { key: 'administration', name: 'الإدارة', searchTerm: 'تقييم الإدارة لرئيس الدائرة' };
  if (evaluationType.includes('تقييم المدير') && evaluationType.includes('الموظف')) return { key: 'manager', name: 'المدير المباشر', searchTerm: 'تقييم المدير' };
  if (evaluationType.includes('ذاتي')) return { key: 'self', name: 'التقييم الذاتي', searchTerm: 'تقييم ذاتي' };
  if (evaluationType.includes('زميل')) return { key: 'peers', name: 'الزملاء', searchTerm: 'زميل' };
  if (evaluationType.includes('الموظف لمديره') || evaluationType.includes('الموظف للمدير')) return { key: 'subordinates', name: 'المرؤوسون', searchTerm: 'الموظف لمديره' };
  return { key: 'other', name: 'مصادر أخرى', searchTerm: evaluationType };
};

const populationMatches = (person: PersonRecord | undefined, filter: PopulationFilter) => {
  if (filter === 'all') return true;
  return filter === 'employees' ? person?.role === 'موظف' : person?.role === 'رئيس دائرة';
};

const splitDepartmentLabel = (value: string, maxChars = 25): string[] => {
  if (value.length <= maxChars) return [value];
  const words = value.split(' ');
  const lines: string[] = [];
  let current = '';
  words.forEach((word) => {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  });
  if (current) lines.push(current);
  if (lines.length <= 2) return lines;
  return [lines[0], `${lines.slice(1).join(' ').slice(0, maxChars - 1)}…`];
};

function DepartmentAxisTick({ x = 0, y = 0, payload }: DepartmentTickProps) {
  const lines = splitDepartmentLabel(String(payload?.value ?? ''));
  return <g transform={`translate(${x + 14},${y})`}>
    <text fill="#dce7ed" fontSize="13" fontWeight="600" textAnchor="start" direction="rtl">
      {lines.map((line, index) => <tspan key={`${line}-${index}`} x="0" dy={index === 0 ? (lines.length > 1 ? -6 : 4) : 18}>{line}</tspan>)}
    </text>
  </g>;
}

function SourceTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload?: SourceDatum }> }) {
  const item = payload?.[0]?.payload;
  if (!active || !item) return null;
  return <div className="chart-tooltip">
    <strong>{item.name}</strong>
    <span>متوسط النتيجة: {item.score.toFixed(1)}%</span>
    <span>عدد التقييمات: {item.count}</span>
  </div>;
}

function DepartmentTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload?: DepartmentDatum }> }) {
  const item = payload?.[0]?.payload;
  if (!active || !item) return null;
  return <div className="chart-tooltip">
    <strong>{item.department}</strong>
    <span>متوسط نتائج الموظفين: {item.score.toFixed(1)}%</span>
    <span>عدد الموظفين المحتسبين: {item.count}</span>
  </div>;
}

export default function Dashboard({ data, navigate, openProfile }: Props) {
  const [sourcePopulation, setSourcePopulation] = useState<PopulationFilter>('all');
  const [criteriaPopulation, setCriteriaPopulation] = useState<PopulationFilter>('all');
  const [criteriaSource, setCriteriaSource] = useState<SourceKey | 'all'>('all');
  const [showAllDepartments, setShowAllDepartments] = useState(false);

  const employeeCount = data.people.filter((person) => person.role === 'موظف').length;
  const directorCount = data.people.filter((person) => person.role === 'رئيس دائرة').length;
  const completeCount = data.people.filter((person) => person.completion === 'مكتمل').length;
  const incompleteCount = data.people.length - completeCount;
  const highGapCount = data.people.filter((person) => (person.gap ?? 0) >= 25).length;
  const completeness = data.people.length ? (completeCount / data.people.length) * 100 : 0;
  const finalAverage = averageNumbers(data.people.map((person) => person.finalScore));
  const managerAverage = averageNumbers(data.people.map((person) => person.managerScore));
  const departmentCount = new Set(data.people.map((person) => person.department).filter(Boolean)).size;
  const narrativeCount = data.narratives.filter((item) => !item.isSelf).length;
  const personByCode = new Map(data.people.map((person) => [person.code, person]));

  const classificationData = ['ممتاز', 'جيد', 'مقبول', 'ضعيف', 'ضعيف جدًا'].map((name) => ({
    name,
    value: data.people.filter((person) => person.classification === name).length,
  })).filter((item) => item.value > 0);

  const employeeDepartmentData = Array.from(new Set(data.people
    .filter((person) => person.role === 'موظف')
    .map((person) => person.department || 'غير محدد')))
    .map((department) => {
      const rows = data.people.filter((person) => person.role === 'موظف'
        && (person.department || 'غير محدد') === department
        && person.completion === 'مكتمل'
        && person.finalScore != null);
      return {
        department,
        score: averageNumbers(rows.map((person) => person.finalScore)),
        count: rows.length,
      };
    })
    .filter((item): item is { department: string; score: number; count: number } => item.score != null && item.count > 0)
    .sort((a, b) => b.score - a.score);

  const sourceBuckets = new Map<SourceKey, { name: string; values: number[]; searchTerm: string }>();
  data.evaluations.forEach((evaluation) => {
    const person = personByCode.get(evaluation.personCode);
    if (!populationMatches(person, sourcePopulation) || evaluation.calculatedScore == null) return;
    const source = sourceDetails(evaluation.type);
    if (source.key === 'other') return;
    const bucket = sourceBuckets.get(source.key) ?? { name: source.name, values: [], searchTerm: source.searchTerm };
    bucket.values.push(evaluation.calculatedScore);
    sourceBuckets.set(source.key, bucket);
  });
  const sourceOrder: SourceKey[] = ['manager', 'administration', 'self', 'peers', 'subordinates'];
  const sourceData: SourceDatum[] = sourceOrder.flatMap((key) => {
    const bucket = sourceBuckets.get(key);
    if (!bucket?.values.length) return [];
    return [{ key, name: bucket.name, score: averageNumbers(bucket.values) ?? 0, count: bucket.values.length, searchTerm: bucket.searchTerm }];
  });

  const topResults = [...data.people]
    .filter((person) => (person.finalScore ?? person.managerScore) != null)
    .sort((a, b) => (b.finalScore ?? b.managerScore ?? 0) - (a.finalScore ?? a.managerScore ?? 0))
    .slice(0, 5);
  const topGaps = [...data.people].filter((person) => person.gap != null).sort((a, b) => (b.gap ?? 0) - (a.gap ?? 0)).slice(0, 5);

  const criteriaMap = new Map<string, number[]>();
  const criteriaCountMap = new Map<string, number>();
  data.criteria.forEach((item) => {
    const person = personByCode.get(item.personCode);
    const source = sourceDetails(item.evaluationType);
    if (!populationMatches(person, criteriaPopulation)) return;
    if (criteriaSource !== 'all' && source.key !== criteriaSource) return;
    criteriaMap.set(item.criterion, [...(criteriaMap.get(item.criterion) ?? []), item.percentage]);
    criteriaCountMap.set(item.criterion, (criteriaCountMap.get(item.criterion) ?? 0) + 1);
  });
  const lowCriteria = Array.from(criteriaMap.entries())
    .map(([criterion, values]) => ({
      criterion,
      score: values.reduce((sum, value) => sum + value, 0) / values.length,
      count: criteriaCountMap.get(criterion) ?? values.length,
    }))
    .sort((a, b) => a.score - b.score)
    .slice(0, 5);

  const kpis = [
    { icon: UsersRound, label: 'إجمالي الأشخاص', value: data.people.length, hint: `${employeeCount} موظف و${directorCount} رئيس دائرة`, action: () => navigate('people') },
    { icon: ClipboardList, label: 'التقييمات المسجلة', value: data.evaluations.length, hint: 'جميع أنواع التقييم', action: () => navigate('evaluations') },
    { icon: CheckCircle2, label: 'اكتمال الملفات', value: `${completeness.toFixed(0)}%`, hint: `${completeCount} ملف مكتمل`, action: () => navigate('people', { completion: 'مكتمل' }) },
    { icon: Gauge, label: 'متوسط التقييم الكلي', value: valueOrDash(finalAverage), hint: 'للملفات المكتملة', action: () => navigate('people', { sort: 'final-desc' }) },
    { icon: AlertTriangle, label: 'فجوات مرتفعة', value: highGapCount, hint: 'فرق 25 نقطة أو أكثر', action: () => navigate('gaps', { reviewOnly: true, minGap: 25 }) },
    { icon: MessageSquareText, label: 'النقاط السردية', value: narrativeCount, hint: 'كتبها الآخرون عن الأشخاص', action: () => navigate('notes') },
    { icon: Building2, label: 'الدوائر والجهات', value: departmentCount, hint: 'بعد توحيد التسميات', action: () => navigate('people') },
    { icon: FileText, label: 'ملفات غير مكتملة', value: incompleteCount, hint: 'تحتاج استكمال مصدر تقييم', action: () => navigate('people', { completion: 'جزئي' }) },
  ];

  const populationButtons = (value: PopulationFilter, setter: (next: PopulationFilter) => void) => <div className="dashboard-filter-tabs" aria-label="تصفية نوع الشخص">
    <button className={value === 'all' ? 'active' : ''} onClick={() => setter('all')}>الجميع</button>
    <button className={value === 'employees' ? 'active' : ''} onClick={() => setter('employees')}>الموظفون</button>
    <button className={value === 'directors' ? 'active' : ''} onClick={() => setter('directors')}>رؤساء الدوائر</button>
  </div>;

  const visibleDepartmentRanking = showAllDepartments ? employeeDepartmentData : employeeDepartmentData.slice(0, 5);

  return <div className="dashboard-grid">
    <section className="dashboard-hero card-dark">
      <div>
        <span className="eyebrow">مديرية التنمية الإدارية بحمص · دائرة الموارد البشرية</span>
        <h2>منصة تحليل نتائج تقييم الأداء 360</h2>
        <p>لوحة تفاعلية مرتبطة بكل التفاصيل: الأشخاص، التقييمات، المهام، المعايير، الفجوات والمحتوى السردي.</p>
      </div>
      <div className="hero-score">
        <div className="score-ring" style={{ '--score': `${managerAverage ?? 0}%` } as CSSProperties}>
          <strong>{valueOrDash(managerAverage)}</strong><span>متوسط تقييم المدير/الإدارة</span>
        </div>
      </div>
    </section>

    <div className="kpi-grid kpi-grid-8">
      {kpis.map(({ icon: Icon, label, value, hint, action }) => <button className="stat-card interactive" key={label} onClick={action}>
        <span className="stat-icon"><Icon size={21} /></span><span className="stat-copy"><small>{label}</small><strong>{value}</strong><em>{hint}</em></span>
      </button>)}
    </div>

    <DashboardCard title="توزيع التصنيفات" subtitle="انقر على أي تصنيف لعرض الأشخاص" className="chart-card medium">
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie data={classificationData} dataKey="value" nameKey="name" innerRadius={68} outerRadius={98} paddingAngle={4}
            onClick={(entry) => navigate('people', { classification: String(entry?.name ?? entry?.payload?.name ?? '') })}>
            {classificationData.map((_, index) => <Cell key={index} fill={colors[index % colors.length]} cursor="pointer" />)}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} /><Legend verticalAlign="bottom" height={28} />
        </PieChart>
      </ResponsiveContainer>
    </DashboardCard>

    <DashboardCard title="متوسط نتائج الموظفين حسب الدائرة" subtitle="الموظفون ذوو النتائج المكتملة فقط؛ انقر على أي دائرة لفتح تفاصيلها" className="chart-card wide">
      {employeeDepartmentData.length ? <div className="department-chart-wrap">
        <ResponsiveContainer width="100%" height={Math.max(380, employeeDepartmentData.length * 58)}>
          <BarChart data={employeeDepartmentData} layout="vertical" margin={{ top: 12, right: 18, left: 28, bottom: 10 }} barCategoryGap={18}>
            <CartesianGrid strokeDasharray="3 3" stroke="#28445a" opacity={0.35} horizontal vertical />
            <XAxis type="number" domain={[0, 100]} tick={{ fill: '#b7c5d0', fontSize: 12 }} axisLine={{ stroke: '#496379' }} tickLine={false} />
            <YAxis type="category" dataKey="department" orientation="right" width={300} tick={<DepartmentAxisTick />} axisLine={false} tickLine={false} interval={0} />
            <Tooltip content={<DepartmentTooltip />} cursor={{ fill: 'rgba(255,255,255,.035)' }} />
            <Bar dataKey="score" fill="#16bed2" radius={[8, 8, 8, 8]} cursor="pointer" maxBarSize={28}
              onClick={(entry) => navigate('people', { department: String(entry?.payload?.department ?? entry?.department ?? ''), role: 'موظف', sort: 'final-desc' })}>
              <LabelList dataKey="score" position="insideLeft" formatter={(value: unknown) => `${Number(value).toFixed(1)}%`} fill="#032c3a" fontSize={12} fontWeight={800} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div> : <div className="dashboard-empty">لا توجد نتائج موظفين مكتملة يمكن احتساب متوسطاتها حسب الدائرة.</div>}
    </DashboardCard>

    <DashboardCard title="متوسط النتائج حسب مصدر التقييم" subtitle="متوسط الدرجة الكلية لكل مصدر مع عدد التقييمات الداخلة بالحساب" className="chart-card wide" actions={populationButtons(sourcePopulation, setSourcePopulation)}>
      {sourceData.length ? <ResponsiveContainer width="100%" height={300}>
        <BarChart data={sourceData} margin={{ top: 34, right: 14, left: 14, bottom: 6 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#28445a" opacity={0.35} vertical={false} />
          <XAxis dataKey="name" tick={{ fill: '#d2e0e7', fontSize: 12 }} axisLine={{ stroke: '#496379' }} tickLine={false} />
          <YAxis domain={[0, 100]} tick={{ fill: '#b7c5d0', fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip content={<SourceTooltip />} cursor={{ fill: 'rgba(255,255,255,.035)' }} />
          <Bar dataKey="score" radius={[8, 8, 0, 0]} maxBarSize={74} cursor="pointer"
            onClick={(entry) => navigate('evaluations', { search: String(entry?.payload?.searchTerm ?? '') })}>
            {sourceData.map((item) => <Cell key={item.key} fill={sourceColors[item.key]} />)}
            <LabelList dataKey="score" position="top" formatter={(value: unknown) => Number(value).toFixed(1)} fill="#e9f5f8" fontSize={12} fontWeight={800} />
          </Bar>
        </BarChart>
      </ResponsiveContainer> : <div className="dashboard-empty">لا توجد تقييمات مطابقة للتصفية المحددة.</div>}
    </DashboardCard>

    <DashboardCard title="أعلى النتائج بالتقييم الكلي" subtitle="التقييم النهائي المرجّح للملفات المكتملة" className="list-card medium" actions={<button className="card-link" onClick={() => navigate('people', { sort: 'final-desc' })}>عرض الكل</button>}>
      <div className="ranking-list">{topResults.map((person, index) => <button key={person.code} onClick={() => openProfile(person)}><span className="rank">{index + 1}</span><span className="rank-copy"><strong>{person.name}</strong><small>{person.department}</small></span><span className="rank-value">{valueOrDash(person.finalScore ?? person.managerScore)}</span></button>)}</div>
    </DashboardCard>

    <DashboardCard title="أكبر فجوات التقييم" subtitle="الفرق بين التقييم الذاتي والمدير/الإدارة" className="list-card half" actions={<button className="card-link" onClick={() => navigate('gaps', { sort: 'gap-desc' })}>عرض الكل</button>}>
      <div className="ranking-list">{topGaps.map((person) => <button key={person.code} onClick={() => openProfile(person)}><span className="gap-dot" /><span className="rank-copy"><strong>{person.name}</strong><small>{person.department} · {person.gapDirection}</small></span><span className={`rank-value ${(person.gap ?? 0) >= 25 ? 'danger' : ''}`}>{valueOrDash(person.gap)}</span></button>)}</div>
    </DashboardCard>

    <DashboardCard title="الدوائر الأعلى تقييمًا" subtitle="حسب متوسط النتائج الكلية للموظفين المكتملين" className="list-card half" actions={<button className="card-link" onClick={() => setShowAllDepartments((current) => !current)}>{showAllDepartments ? 'عرض الأعلى فقط' : 'عرض الكل'}</button>}>
      {visibleDepartmentRanking.length ? <div className="ranking-list department-ranking">{visibleDepartmentRanking.map((item, index) => <button key={item.department} onClick={() => navigate('people', { department: item.department, role: 'موظف', sort: 'final-desc' })}>
        <span className="rank">{index + 1}</span>
        <span className="rank-copy"><strong>{item.department}</strong><small>{item.count} {item.count === 1 ? 'موظف دخل في الحساب' : 'موظفين دخلوا في الحساب'}</small></span>
        <span className="rank-value">{item.score.toFixed(1)}</span>
      </button>)}</div> : <div className="dashboard-empty compact">لا توجد دوائر ببيانات موظفين مكتملة.</div>}
    </DashboardCard>

    <DashboardCard title="المعايير الأكثر احتياجًا للتحسين" subtitle="أقل متوسطات المعايير ضمن الفلاتر المحددة" className="list-card full" actions={<div className="criteria-card-filters">
      {populationButtons(criteriaPopulation, setCriteriaPopulation)}
      <select value={criteriaSource} onChange={(event) => setCriteriaSource(event.target.value as SourceKey | 'all')} aria-label="مصدر التقييم">
        <option value="all">جميع المصادر</option>
        <option value="manager">المدير المباشر</option>
        <option value="administration">الإدارة</option>
        <option value="self">التقييم الذاتي</option>
        <option value="peers">الزملاء</option>
        <option value="subordinates">المرؤوسون</option>
      </select>
      <button className="card-link" onClick={() => navigate('criteria')}>فتح المستكشف</button>
    </div>}>
      {lowCriteria.length ? <div className="criterion-insights">{lowCriteria.map((item, index) => <button key={item.criterion} onClick={() => navigate('criteria', { search: item.criterion })}>
        <span className="rank">{index + 1}</span>
        <span className="criterion-insight-copy">
          <strong>{item.criterion}</strong>
          <small>{item.count} تقييمًا دخل في المتوسط</small>
          <span className="criterion-progress"><i style={{ width: `${Math.max(0, Math.min(100, item.score))}%` }} /></span>
        </span>
        <span className="rank-value">{item.score.toFixed(1)}</span>
      </button>)}</div> : <div className="dashboard-empty compact">لا توجد معايير مطابقة للفلاتر المحددة.</div>}
    </DashboardCard>
  </div>;
}

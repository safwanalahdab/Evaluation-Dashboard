import { useMemo, useState } from 'react';
import { ChevronLeft, Download, Filter, RefreshCw, SlidersHorizontal } from 'lucide-react';
import type { NavigationQuery, PersonRecord, PlatformData } from '../types';
import { classificationTone, EmptyState, FilterField, Pagination, PanelHeader, SearchInput, Select, valueOrDash, unique } from '../components/common';
import { exportRowsToExcel } from '../lib/excelExport';

type Props = { data: PlatformData; openProfile: (person: PersonRecord) => void; initial?: NavigationQuery };

export default function PeoplePage({ data, openProfile, initial = {} }: Props) {
  const [search, setSearch] = useState(initial.search ?? '');
  const [department, setDepartment] = useState(initial.department ?? 'الكل');
  const [role, setRole] = useState(initial.role ?? 'الكل');
  const [classification, setClassification] = useState(initial.classification ?? 'الكل');
  const [completion, setCompletion] = useState(initial.completion ?? 'الكل');
  const [notesOnly, setNotesOnly] = useState(false);
  const [gapOnly, setGapOnly] = useState(false);
  const [minScore, setMinScore] = useState('');
  const [maxScore, setMaxScore] = useState('');
  const [sort, setSort] = useState(initial.sort ?? 'final-desc');
  const [pageSize, setPageSize] = useState('25');
  const [pageIndex, setPageIndex] = useState(0);

  const filtered = useMemo(() => {
    const rows = data.people.filter((person) => {
      const query = search.trim().toLocaleLowerCase('ar');
      const score = person.finalScore ?? person.managerScore;
      return (!query || [person.name, person.code, person.jobTitle, person.department, person.managerName].some((value) => value.toLocaleLowerCase('ar').includes(query)))
        && (department === 'الكل' || person.department === department)
        && (role === 'الكل' || person.role === role)
        && (classification === 'الكل' || person.classification === classification)
        && (completion === 'الكل' || person.completion === completion)
        && (!notesOnly || person.othersNoteCount > 0)
        && (!gapOnly || (person.gap ?? 0) >= 25)
        && (!minScore || (score != null && score >= Number(minScore)))
        && (!maxScore || (score != null && score <= Number(maxScore)));
    });
    return rows.sort((a, b) => {
      if (sort === 'final-asc') return (a.finalScore ?? a.managerScore ?? -1) - (b.finalScore ?? b.managerScore ?? -1);
      if (sort === 'gap-desc') return (b.gap ?? -1) - (a.gap ?? -1);
      if (sort === 'manager-desc') return (b.managerScore ?? -1) - (a.managerScore ?? -1);
      return (b.finalScore ?? b.managerScore ?? -1) - (a.finalScore ?? a.managerScore ?? -1);
    });
  }, [data.people, search, department, role, classification, completion, notesOnly, gapOnly, minScore, maxScore, sort]);

  const numericPageSize = pageSize === 'all' ? Math.max(filtered.length, 1) : Number(pageSize);
  const pageCount = Math.max(1, Math.ceil(filtered.length / numericPageSize));
  const visible = filtered.slice(pageIndex * numericPageSize, pageIndex * numericPageSize + numericPageSize);

  const reset = () => {
    setSearch(''); setDepartment('الكل'); setRole('الكل'); setClassification('الكل'); setCompletion('الكل');
    setNotesOnly(false); setGapOnly(false); setMinScore(''); setMaxScore(''); setSort('final-desc'); setPageIndex(0);
  };

  const exportFiltered = () => exportRowsToExcel('الأشخاص-نتائج-مفلترة.xlsx', 'الأشخاص', filtered.map((person) => ({
    'اسم الشخص': person.name,
    'الصفة': person.role,
    'الدائرة': person.department,
    'المسمى الوظيفي': person.jobTitle,
    'المدير/الإدارة': person.managerName,
    'تقييم المدير/الإدارة': person.managerScore,
    'التقييم الذاتي': person.selfScore,
    'متوسط الزملاء': person.peerScore,
    'متوسط المرؤوسين': person.subordinateScore,
    'التقييم الكلي': person.finalScore,
    'التصنيف': person.classification,
    'الاكتمال': person.completion,
    'فجوة التقييم': person.gap,
    'اتجاه الفجوة': person.gapDirection,
    'عدد النقاط السردية من الآخرين': person.othersNoteCount,
  })));

  return <div className="detail-layout">
    <aside className="filters-panel">
      <div className="panel-title"><Filter size={18} /><div><h3>الفلاتر المتقدمة</h3><p>كل الأسماء والنتائج متاحة للأدمن</p></div></div>
      <FilterField label="بحث شامل"><SearchInput value={search} onChange={(value) => { setSearch(value); setPageIndex(0); }} placeholder="الاسم، الكود، المسمى، المدير..." /></FilterField>
      <FilterField label="الدائرة"><Select value={department} onChange={(value) => { setDepartment(value); setPageIndex(0); }} options={unique(data.people.map((person) => person.department))} /></FilterField>
      <FilterField label="نوع الشخص"><Select value={role} onChange={setRole} options={['الكل', 'موظف', 'رئيس دائرة']} /></FilterField>
      <FilterField label="التصنيف"><Select value={classification} onChange={setClassification} options={['الكل', 'ممتاز', 'جيد', 'مقبول', 'ضعيف', 'ضعيف جدًا', 'غير متاح']} /></FilterField>
      <FilterField label="اكتمال التقييم"><Select value={completion} onChange={setCompletion} options={['الكل', 'مكتمل', 'جزئي', 'غير مكتمل']} /></FilterField>
      <FilterField label="ترتيب النتائج"><Select value={sort} onChange={(value) => setSort(value as typeof sort)} options={['final-desc', 'final-asc', 'manager-desc', 'gap-desc']} labels={{ 'final-desc': 'التقييم الكلي: الأعلى أولًا', 'final-asc': 'التقييم الكلي: الأقل أولًا', 'manager-desc': 'تقييم المدير: الأعلى أولًا', 'gap-desc': 'الفجوة: الأعلى أولًا' }} /></FilterField>
      <div className="range-fields"><FilterField label="النتيجة من"><input type="number" value={minScore} onChange={(event) => setMinScore(event.target.value)} min="0" max="100" /></FilterField><FilterField label="إلى"><input type="number" value={maxScore} onChange={(event) => setMaxScore(event.target.value)} min="0" max="100" /></FilterField></div>
      <label className="check-filter"><input type="checkbox" checked={notesOnly} onChange={(event) => setNotesOnly(event.target.checked)} /><span>لديهم نقاط سردية من الآخرين</span></label>
      <label className="check-filter"><input type="checkbox" checked={gapOnly} onChange={(event) => setGapOnly(event.target.checked)} /><span>فجوة 25 نقطة أو أكثر</span></label>
      <button className="reset-button" onClick={reset}><RefreshCw size={16} /> إعادة ضبط الفلاتر</button>
    </aside>

    <section className="table-panel">
      <PanelHeader title="قائمة الأشخاص" subtitle={`عرض ${visible.length} من أصل ${filtered.length} شخصًا`} actions={<button className="secondary-button" onClick={exportFiltered}><Download size={16} /> تصدير النتائج المفلترة</button>} />
      <div className="active-filter-strip"><SlidersHorizontal size={16} /><span>الفلترة والترتيب يعملان على جميع الأسماء، ويمكن فتح الملف التحليلي من أي صف.</span><label>حجم الصفحة <Select value={pageSize} onChange={(value) => { setPageSize(value); setPageIndex(0); }} options={['10', '25', '50', '100', 'all']} labels={{ all: 'عرض الكل' }} /></label></div>
      <div className="table-scroll"><table className="data-table"><thead><tr><th>الشخص</th><th>الصفة</th><th>الدائرة</th><th>المسمى الوظيفي</th><th>المدير/الإدارة</th><th>عدد التقييمات</th><th>تقييم المدير/الإدارة</th><th>التقييم الكلي</th><th>التصنيف</th><th>الاكتمال</th><th>الفجوة</th><th>النقاط السردية</th><th /></tr></thead><tbody>
        {visible.map((person) => <tr key={person.code}>
          <td><button className="person-link" onClick={() => openProfile(person)}><span className="avatar">{person.name.charAt(0)}</span><span><strong>{person.name}</strong><small>{person.code}</small></span></button></td>
          <td>{person.role}</td><td>{person.department}</td><td className="wrap-cell">{person.jobTitle || '—'}</td><td>{person.managerName || '—'}</td><td>{person.evaluationCount}</td>
          <td className="numeric strong">{valueOrDash(person.managerScore)}</td><td className="numeric strong cyan-text">{valueOrDash(person.finalScore)}</td>
          <td><span className={`status-pill ${classificationTone(person.classification)}`}>{person.classification}</span></td><td><span className={`completion-pill ${person.completion === 'مكتمل' ? 'complete' : 'partial'}`}>{person.completion}</span></td>
          <td><span className={(person.gap ?? 0) >= 25 ? 'danger-text strong' : ''}>{valueOrDash(person.gap)}<small className="block-code">{person.gapDirection}</small></span></td><td>{person.othersNoteCount}</td><td><button className="row-action" onClick={() => openProfile(person)}>فتح <ChevronLeft size={15} /></button></td>
        </tr>)}
        {!visible.length && <tr><td colSpan={13}><EmptyState text="لا توجد نتائج مطابقة للفلاتر الحالية." /></td></tr>}
      </tbody></table></div>
      {pageSize !== 'all' && <Pagination pageIndex={pageIndex} pageCount={pageCount} onChange={(next) => setPageIndex(Math.min(Math.max(next, 0), pageCount - 1))} />}
    </section>
  </div>;
}

import * as XLSX from 'xlsx';
import { normalizeDepartmentName, normalizePersonName } from './departmentNormalizer';
import type {
  CriterionRecord,
  EvaluationRecord,
  NarrativeRecord,
  NoteCategory,
  NoteGroup,
  PersonRecord,
  PlatformData,
  QualityIssue,
  RawRow,
  TaskRecord,
} from '../types';

const text = (value: unknown): string => value == null ? '' : String(value).replace(/\s+/g, ' ').trim();
const numberValue = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};
const round = (value: number | null, digits = 1): number | null => value == null ? null : Number(value.toFixed(digits));
const rowValue = (row: RawRow, names: string[]): unknown => {
  for (const name of names) {
    if (Object.prototype.hasOwnProperty.call(row, name) && row[name] !== null && row[name] !== '') return row[name];
  }
  return null;
};
const rowText = (row: RawRow, names: string[]) => text(rowValue(row, names));
const rowNumber = (row: RawRow, names: string[]) => numberValue(rowValue(row, names));

const excelDateToIso = (value: unknown): string | undefined => {
  if (!value) return undefined;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) return `${parsed.y}-${String(parsed.m).padStart(2, '0')}-${String(parsed.d).padStart(2, '0')}`;
  }
  const raw = text(value);
  if (!raw) return undefined;
  const parsedDate = new Date(raw);
  return Number.isNaN(parsedDate.getTime()) ? raw : parsedDate.toISOString().slice(0, 10);
};

const rowsFor = (workbook: XLSX.WorkBook, aliases: string[]): RawRow[] => {
  const matchedName = aliases.find((name) => workbook.Sheets[name]);
  if (!matchedName) return [];
  return (XLSX.utils.sheet_to_json(workbook.Sheets[matchedName], { defval: null, raw: true }) as RawRow[])
    .filter((row) => Object.values(row).some((value) => value !== null && value !== ''));
};

const uniqueText = (items: string[]): string[] => {
  const seen = new Set<string>();
  return items
    .map((item) => item.replace(/\s+/g, ' ').trim())
    .filter((item) => item && item !== '-' && item !== 'لا يوجد' && item !== 'لايوجد')
    .filter((item) => {
      const key = item.toLocaleLowerCase('ar');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
};

const emptyNotes = (): NoteGroup => ({ strengths: [], improvements: [], challenges: [], development: [], recommendations: [], general: [] });
const average = (values: Array<number | null>): number | null => {
  const valid = values.filter((value): value is number => value != null && Number.isFinite(value));
  return valid.length ? valid.reduce((sum, value) => sum + value, 0) / valid.length : null;
};
const classification = (score: number | null): string => {
  if (score == null) return 'غير متاح';
  if (score >= 90) return 'ممتاز';
  if (score >= 75) return 'جيد';
  if (score >= 60) return 'مقبول';
  if (score >= 50) return 'ضعيف';
  return 'ضعيف جدًا';
};
const includesAny = (value: string, tokens: string[]) => tokens.some((token) => value.includes(token));
const sourceScore = (evaluations: EvaluationRecord[], tokens: string[]): number | null => average(
  evaluations.filter((evaluation) => includesAny(evaluation.type, tokens)).map((evaluation) => evaluation.calculatedScore),
);
const isDirector = (role: string, title: string, types: string[]) =>
  role.includes('رئيس دائرة') || title.includes('رئيس دائرة') || types.some((type) => type.includes('رئيس الدائرة'));
const isSelfEvaluation = (type: string, evaluatorCode: string, personCode: string, evaluatorName: string, personName: string) =>
  type.includes('ذاتي') || (!!evaluatorCode && !!personCode && evaluatorCode === personCode) || (!!evaluatorName && !!personName && evaluatorName === personName);

function calculateEvaluationScore(row: RawRow, evaluationId: string, tasks: TaskRecord[], criteria: CriterionRecord[]) {
  const modelFinal = rowNumber(row, ['المجموع النهائي في النموذج', 'النتيجة', 'النتيجة النهائية']);
  const relatedTasks = tasks.filter((item) => item.evaluationId === evaluationId);
  const relatedCriteria = criteria.filter((item) => item.evaluationId === evaluationId);
  const taskMax = relatedTasks.reduce((sum, item) => sum + item.weight, 0);
  const taskPoints = relatedTasks.reduce((sum, item) => sum + item.score, 0);
  const criterionMax = relatedCriteria.reduce((sum, item) => sum + item.maximum, 0);
  const criterionPoints = relatedCriteria.reduce((sum, item) => sum + item.score, 0);
  const taskScore = taskMax > 0 ? (taskPoints / taskMax) * 100 : null;
  const criterionScore = criterionMax > 0 ? (criterionPoints / criterionMax) * 100 : null;
  const calculatedScore = modelFinal ?? (
    taskScore != null && criterionScore != null ? taskScore * 0.7 + criterionScore * 0.3 : taskScore ?? criterionScore
  );
  return { taskScore: round(taskScore), criterionScore: round(criterionScore), calculatedScore: round(calculatedScore) };
}

const noteColumns: Array<{ category: NoteCategory; label: string; columns: string[] }> = [
  { category: 'strengths', label: 'نقاط القوة والإيجابيات', columns: ['نقاط التميز', 'الإيجابيات', 'نقاط القوة'] },
  { category: 'strengths', label: 'نقاط القوة والإيجابيات', columns: ['الإنجازات'] },
  { category: 'improvements', label: 'الجوانب التي تحتاج إلى تحسين', columns: ['نقاط تحتاج إلى التحسين', 'نقاط بحاجة إلى التحسين', 'جوانب التحسين'] },
  { category: 'challenges', label: 'التحديات والجوانب السلبية', columns: ['التحديات', 'السلبيات', 'الجوانب السلبية'] },
  { category: 'development', label: 'مجالات التطوير', columns: ['مجالات التطوير', 'الاحتياجات التدريبية'] },
  { category: 'recommendations', label: 'التوصيات ومقترحات التطوير', columns: ['التوصيات', 'مقترحات التطوير'] },
  { category: 'general', label: 'ملاحظات عامة', columns: ['الملاحظات', 'ملاحظات عامة'] },
];

export async function parseCleanWorkbook(file: File): Promise<PlatformData> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });

  const personRows = rowsFor(workbook, ['الأشخاص', 'قائمة الأشخاص']);
  const evaluationRows = rowsFor(workbook, ['التقييمات', 'سجل التقييمات']);
  const taskRows = rowsFor(workbook, ['تقييم المهام', 'المهام']);
  const criterionRows = rowsFor(workbook, ['تقييم المعايير', 'المعايير']);
  const noteRows = rowsFor(workbook, ['الملاحظات والتوصيات', 'الملاحظات']);
  const qualityRows = rowsFor(workbook, ['مشكلات جودة البيانات', 'جودة البيانات']);

  const evaluationsBasic = evaluationRows.map((row) => ({
    id: rowText(row, ['معرف التقييم', '_uuid']),
    type: rowText(row, ['نوع التقييم']),
    personCode: rowText(row, ['كود الشخص محل التقييم', 'كود الموظف']),
    personName: normalizePersonName(rowText(row, ['اسم الشخص محل التقييم', 'اسم الموظف'])),
    evaluatorCode: rowText(row, ['كود المُقيّم', 'كود المقيم']),
    evaluatorName: normalizePersonName(rowText(row, ['اسم المُقيّم', 'اسم المقيم'])),
    personDepartmentRaw: rowText(row, ['دائرة الشخص محل التقييم', 'الدائرة']),
    personJobTitle: rowText(row, ['المسمى الوظيفي للشخص محل التقييم', 'المسمى الوظيفي']),
    evaluatorDepartmentRaw: rowText(row, ['دائرة المُقيّم', 'دائرة المقيم']),
    evaluatorJobTitle: rowText(row, ['المسمى الوظيفي للمُقيّم', 'المسمى الوظيفي للمقيم']),
    date: excelDateToIso(rowValue(row, ['تاريخ التقييم'])),
    submittedAt: excelDateToIso(rowValue(row, ['تاريخ إرسال التقييم', '_submission_time'])),
    status: rowText(row, ['حالة السجل', 'حالة اكتمال الهوية']) || 'غير محدد',
    source: rowText(row, ['مصدر البيانات']),
    pageUrl: rowText(row, ['رابط صفحة التقييم', 'رابط التقييم']),
    row,
  }));
  const evaluationMap = new Map(evaluationsBasic.map((item) => [item.id, item]));

  const tasks: TaskRecord[] = taskRows.map((row) => {
    const evaluationId = rowText(row, ['معرف التقييم', '_submission__uuid']);
    const linked = evaluationMap.get(evaluationId);
    const weight = rowNumber(row, ['وزن المهمة', 'الوزن']) ?? 0;
    const score = rowNumber(row, ['الدرجة', 'درجة المهمة']) ?? 0;
    const percentage = rowNumber(row, ['نسبة الإنجاز من وزن المهمة', 'النسبة']) ?? (weight > 0 ? (score / weight) * 100 : 0);
    const departmentRaw = linked?.personDepartmentRaw ?? rowText(row, ['دائرة الشخص محل التقييم', 'الدائرة']);
    return {
      evaluationId,
      evaluationType: rowText(row, ['نوع التقييم']) || linked?.type || '',
      personCode: rowText(row, ['كود الشخص محل التقييم']) || linked?.personCode || '',
      personName: normalizePersonName(rowText(row, ['اسم الشخص محل التقييم']) || linked?.personName || ''),
      evaluatorCode: rowText(row, ['كود المُقيّم', 'كود المقيم']) || linked?.evaluatorCode || '',
      evaluatorName: normalizePersonName(rowText(row, ['اسم المُقيّم', 'اسم المقيم']) || linked?.evaluatorName || ''),
      department: normalizeDepartmentName(departmentRaw),
      number: rowNumber(row, ['رقم المهمة']) ?? 0,
      code: rowText(row, ['رمز المهمة']),
      task: rowText(row, ['المهمة', 'اسم المهمة']),
      indicator: rowText(row, ['مؤشر الأداء']),
      weight,
      score,
      percentage: round(percentage) ?? 0,
      date: linked?.date,
    };
  });

  const criteria: CriterionRecord[] = criterionRows.map((row) => {
    const evaluationId = rowText(row, ['معرف التقييم', '_submission__uuid']);
    const linked = evaluationMap.get(evaluationId);
    const maximum = rowNumber(row, ['الدرجة القصوى', 'الوزن']) ?? 0;
    const score = rowNumber(row, ['الدرجة', 'درجة المعيار']) ?? 0;
    const percentage = rowNumber(row, ['النسبة من الدرجة القصوى', 'النسبة']) ?? (maximum > 0 ? (score / maximum) * 100 : 0);
    const departmentRaw = linked?.personDepartmentRaw ?? rowText(row, ['دائرة الشخص محل التقييم', 'الدائرة']);
    return {
      evaluationId,
      evaluationType: rowText(row, ['نوع التقييم']) || linked?.type || '',
      personCode: rowText(row, ['كود الشخص محل التقييم']) || linked?.personCode || '',
      personName: normalizePersonName(rowText(row, ['اسم الشخص محل التقييم']) || linked?.personName || ''),
      evaluatorCode: rowText(row, ['كود المُقيّم', 'كود المقيم']) || linked?.evaluatorCode || '',
      evaluatorName: normalizePersonName(rowText(row, ['اسم المُقيّم', 'اسم المقيم']) || linked?.evaluatorName || ''),
      department: normalizeDepartmentName(departmentRaw),
      number: rowNumber(row, ['رقم المعيار']) ?? 0,
      code: rowText(row, ['رمز المعيار']),
      criterion: rowText(row, ['المعيار', 'اسم المعيار']),
      maximum,
      score,
      percentage: round(percentage) ?? 0,
      date: linked?.date,
    };
  });

  const evaluations: EvaluationRecord[] = evaluationsBasic.map((basic) => {
    const scores = calculateEvaluationScore(basic.row, basic.id, tasks, criteria);
    return {
      id: basic.id,
      type: basic.type,
      personCode: basic.personCode,
      personName: basic.personName,
      evaluatorCode: basic.evaluatorCode,
      evaluatorName: basic.evaluatorName,
      personDepartmentRaw: basic.personDepartmentRaw,
      personDepartment: normalizeDepartmentName(basic.personDepartmentRaw),
      personJobTitle: basic.personJobTitle,
      evaluatorDepartmentRaw: basic.evaluatorDepartmentRaw,
      evaluatorDepartment: normalizeDepartmentName(basic.evaluatorDepartmentRaw),
      evaluatorJobTitle: basic.evaluatorJobTitle,
      date: basic.date,
      submittedAt: basic.submittedAt,
      taskCount: rowNumber(basic.row, ['عدد المهام']) ?? tasks.filter((task) => task.evaluationId === basic.id).length,
      criterionCount: rowNumber(basic.row, ['عدد المعايير']) ?? criteria.filter((criterion) => criterion.evaluationId === basic.id).length,
      taskScore: scores.taskScore,
      criterionScore: scores.criterionScore,
      calculatedScore: scores.calculatedScore,
      status: basic.status,
      source: basic.source,
      pageUrl: basic.pageUrl || `/evaluations/${basic.id}`,
    };
  });

  const narratives: NarrativeRecord[] = [];
  noteRows.forEach((row, rowIndex) => {
    const evaluationId = rowText(row, ['معرف التقييم']);
    const linked = evaluations.find((evaluation) => evaluation.id === evaluationId);
    const personCode = rowText(row, ['كود الشخص محل التقييم']) || linked?.personCode || '';
    const personName = normalizePersonName(rowText(row, ['اسم الشخص محل التقييم']) || linked?.personName || '');
    const evaluatorCode = rowText(row, ['كود المُقيّم', 'كود المقيم']) || linked?.evaluatorCode || '';
    const evaluatorName = normalizePersonName(rowText(row, ['اسم المُقيّم', 'اسم المقيم']) || linked?.evaluatorName || '');
    const evaluationType = rowText(row, ['نوع التقييم']) || linked?.type || '';
    const isSelf = isSelfEvaluation(evaluationType, evaluatorCode, personCode, evaluatorName, personName);
    noteColumns.forEach(({ category, label, columns }, noteColumnIndex) => {
      const value = rowText(row, columns);
      if (!value) return;
      narratives.push({
        id: `${evaluationId || 'note'}-${rowIndex}-${category}-${noteColumnIndex}`,
        evaluationId,
        evaluationType,
        personCode,
        personName,
        evaluatorCode,
        evaluatorName,
        category,
        categoryLabel: label,
        text: value,
        isSelf,
        date: linked?.date,
      });
    });
  });

  const peopleIndex = new Map<string, { row: RawRow; name: string; code: string }>();
  const addPerson = (code: string, name: string, row: RawRow = {}) => {
    const key = code || name;
    if (!key) return;
    const existing = peopleIndex.get(key);
    peopleIndex.set(key, { row: { ...(existing?.row ?? {}), ...row }, name: name || existing?.name || '', code: code || existing?.code || key });
  };
  personRows.forEach((row) => addPerson(rowText(row, ['كود الشخص']), normalizePersonName(rowText(row, ['اسم الشخص'])), row));
  evaluations.forEach((evaluation) => addPerson(evaluation.personCode, evaluation.personName, {
    الدائرة: evaluation.personDepartmentRaw,
    'المسمى الوظيفي': evaluation.personJobTitle,
  }));
  tasks.forEach((task) => addPerson(task.personCode, task.personName));
  criteria.forEach((criterion) => addPerson(criterion.personCode, criterion.personName));
  narratives.forEach((note) => addPerson(note.personCode, note.personName));

  const people: PersonRecord[] = Array.from(peopleIndex.values()).map(({ row, code, name }) => {
    const personEvaluations = evaluations.filter((evaluation) => evaluation.personCode === code || (!evaluation.personCode && evaluation.personName === name));
    const evaluationTypes = personEvaluations.map((evaluation) => evaluation.type);
    const jobTitle = rowText(row, ['المسمى الوظيفي']) || personEvaluations.find((evaluation) => evaluation.personJobTitle)?.personJobTitle || '';
    const roleText = rowText(row, ['الصفة الوظيفية']);
    const role: PersonRecord['role'] = isDirector(roleText, jobTitle, evaluationTypes) ? 'رئيس دائرة' : 'موظف';
    const managerTokens = role === 'رئيس دائرة' ? ['تقييم الإدارة لرئيس الدائرة'] : ['تقييم المدير المباشر للموظف', 'تقييم المدير للموظف'];
    const selfTokens = role === 'رئيس دائرة' ? ['تقييم ذاتي لرئيس الدائرة'] : ['تقييم ذاتي للموظف'];
    const peerTokens = role === 'رئيس دائرة' ? ['تقييم رئيس دائرة لزميله'] : ['تقييم زميل للموظف'];
    const subordinateTokens = ['تقييم الموظف لمديره المباشر', 'تقييم الموظف للمدير'];
    const managerScore = sourceScore(personEvaluations, managerTokens);
    const selfScore = sourceScore(personEvaluations, selfTokens);
    const peerScore = sourceScore(personEvaluations, peerTokens);
    const subordinateScore = sourceScore(personEvaluations, subordinateTokens);
    const finalScore = role === 'رئيس دائرة'
      ? managerScore != null && selfScore != null && peerScore != null && subordinateScore != null
        ? managerScore * 0.55 + selfScore * 0.1 + subordinateScore * 0.2 + peerScore * 0.15
        : null
      : managerScore != null && selfScore != null && peerScore != null
        ? managerScore * 0.7 + selfScore * 0.1 + peerScore * 0.2
        : null;
    const required = role === 'رئيس دائرة' ? [managerScore, selfScore, peerScore, subordinateScore] : [managerScore, selfScore, peerScore];
    const validCount = required.filter((value) => value != null).length;
    const completion: PersonRecord['completion'] = validCount === required.length ? 'مكتمل' : validCount === 0 ? 'غير مكتمل' : 'جزئي';
    const personNarratives = narratives.filter((item) => item.personCode === code || (!item.personCode && item.personName === name));
    const notes = emptyNotes();
    const selfNotes = emptyNotes();
    personNarratives.forEach((item) => (item.isSelf ? selfNotes[item.category] : notes[item.category]).push(item.text));
    (Object.keys(notes) as NoteCategory[]).forEach((key) => {
      notes[key] = uniqueText(notes[key]);
      selfNotes[key] = uniqueText(selfNotes[key]);
    });
    const managerEvaluation = personEvaluations.find((evaluation) => managerTokens.some((token) => evaluation.type.includes(token)));
    const departmentRaw = rowText(row, ['الدائرة']) || personEvaluations.find((evaluation) => evaluation.personDepartmentRaw)?.personDepartmentRaw || '';
    const gapSigned = managerScore != null && selfScore != null ? selfScore - managerScore : null;
    const gapDirection: PersonRecord['gapDirection'] = gapSigned == null ? 'غير متاح' : gapSigned > 0 ? 'الذاتي أعلى' : gapSigned < 0 ? 'المدير/الإدارة أعلى' : 'متساوي';
    return {
      code,
      name: name || code || 'اسم غير متاح',
      role,
      jobTitle,
      departmentRaw,
      department: normalizeDepartmentName(departmentRaw),
      managerName: managerEvaluation?.evaluatorName || '',
      evaluationCount: personEvaluations.length,
      managerScore: round(managerScore),
      selfScore: round(selfScore),
      peerScore: round(peerScore),
      subordinateScore: round(subordinateScore),
      finalScore: round(finalScore),
      classification: classification(finalScore ?? managerScore),
      completion,
      gap: gapSigned == null ? null : round(Math.abs(gapSigned)),
      gapDirection,
      noteCount: personNarratives.length,
      othersNoteCount: personNarratives.filter((item) => !item.isSelf).length,
      notes,
      selfNotes,
    };
  }).sort((a, b) => a.name.localeCompare(b.name, 'ar'));

  const qualityIssues: QualityIssue[] = qualityRows.map((row) => ({
    severity: (rowText(row, ['درجة الخطورة', 'الخطورة', 'المستوى']) || 'منخفضة') as QualityIssue['severity'],
    category: rowText(row, ['نوع المشكلة', 'الفئة']) || 'جودة البيانات',
    message: rowText(row, ['وصف المشكلة', 'المشكلة', 'الوصف', 'الملاحظة']) || 'مشكلة غير موصوفة',
    suggestedAction: rowText(row, ['الإجراء المقترح']),
    sheet: rowText(row, ['اسم الشيت', 'الشيت']),
    row: rowNumber(row, ['رقم السجل', 'رقم السطر']) ?? undefined,
    evaluationId: rowText(row, ['معرف التقييم']),
    personCode: rowText(row, ['كود الشخص']),
  }));

  if (!people.length) throw new Error('لم يتم العثور على بيانات أشخاص قابلة للقراءة. ارفع ملف بيانات_التقييم_النظيفة.xlsx الناتج عن منظف تقييم 360.');

  return {
    fileName: file.name,
    importedAt: new Date().toISOString(),
    people,
    evaluations,
    tasks,
    criteria,
    narratives,
    qualityIssues,
  };
}

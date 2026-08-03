import type { CriterionRecord, EvaluationRecord, NarrativeRecord, NoteCategory, NoteGroup, PersonRecord, PlatformData, TaskRecord } from './types';

const peopleSeeds = [
  ['سارة أحمد العلي', 'emp_001', 'دائرة الموارد البشرية', 'رئيسة شعبة التخطيط الوظيفي', 'موظف'],
  ['محمد ياسر الخطيب', 'emp_002', 'دائرة الموارد البشرية', 'محلل بيانات موارد بشرية', 'موظف'],
  ['ريم خالد منصور', 'emp_003', 'دائرة التدريب والتأهيل', 'منسقة برامج تدريبية', 'موظف'],
  ['عمر محمود الشامي', 'emp_004', 'دائرة التحول الرقمي', 'مطور نظم', 'موظف'],
  ['لينا سامر حسن', 'emp_005', 'دائرة البحوث والدراسات', 'باحثة إدارية', 'موظف'],
  ['نادر وائل سليمان', 'emp_006', 'دائرة الشؤون الإدارية', 'مسؤول متابعة', 'موظف'],
  ['هدى مصطفى درويش', 'mgr_001', 'دائرة الموارد البشرية', 'رئيسة دائرة الموارد البشرية', 'رئيس دائرة'],
  ['فراس عدنان عثمان', 'mgr_002', 'دائرة التحول الرقمي', 'رئيس دائرة التحول الرقمي', 'رئيس دائرة'],
] as const;

const emptyNotes = (): NoteGroup => ({ strengths: [], improvements: [], challenges: [], development: [], recommendations: [], general: [] });
const classify = (score: number | null) => score == null ? 'غير متاح' : score >= 90 ? 'ممتاز' : score >= 75 ? 'جيد' : score >= 60 ? 'مقبول' : score >= 50 ? 'ضعيف' : 'ضعيف جدًا';

const people: PersonRecord[] = peopleSeeds.map(([name, code, department, jobTitle, role], index) => {
  const managerScore = role === 'رئيس دائرة' ? 76 + index * 1.8 : 64 + index * 4.6;
  const selfScore = Math.min(100, managerScore + (index % 3 === 0 ? 18 : 7));
  const peerScore = Math.max(55, managerScore + (index % 2 === 0 ? 2 : -3));
  const subordinateScore = role === 'رئيس دائرة' ? managerScore - 2.5 : null;
  const finalScore = role === 'رئيس دائرة'
    ? managerScore * 0.55 + selfScore * 0.1 + peerScore * 0.15 + (subordinateScore ?? 0) * 0.2
    : managerScore * 0.7 + selfScore * 0.1 + peerScore * 0.2;
  const notes = emptyNotes();
  notes.strengths = index % 2 === 0
    ? ['يلتزم بالمواعيد ويتابع تنفيذ المهام بصورة مستمرة.', 'يتعاون مع أعضاء الفريق ويقدم الدعم عند الحاجة.']
    : ['يمتلك قدرة جيدة على تحليل المشكلات وتنظيم الأولويات.', 'يتواصل بوضوح مع الأطراف المعنية.'];
  notes.improvements = [index % 2 === 0 ? 'يحتاج إلى تطوير توثيق الإجراءات والنتائج.' : 'يحتاج إلى مشاركة المعلومات بصورة أسرع.'];
  notes.development = ['تعزيز مهارات إعداد التقارير التنفيذية.'];
  notes.recommendations = ['المشاركة في تدريب متخصص في إدارة الأولويات والتواصل المؤسسي.'];
  const selfNotes = emptyNotes();
  selfNotes.challenges = ['واجه ضغطًا في بعض الفترات نتيجة تزامن عدد من المهام.'];
  return {
    code,
    name,
    role,
    jobTitle,
    departmentRaw: department,
    department,
    managerName: role === 'رئيس دائرة' ? 'الإدارة' : department === 'دائرة الموارد البشرية' ? 'هدى مصطفى درويش' : 'المدير المباشر',
    evaluationCount: role === 'رئيس دائرة' ? 7 : 4 + (index % 3),
    managerScore: Number(managerScore.toFixed(1)),
    selfScore: Number(selfScore.toFixed(1)),
    peerScore: Number(peerScore.toFixed(1)),
    subordinateScore: subordinateScore == null ? null : Number(subordinateScore.toFixed(1)),
    finalScore: Number(finalScore.toFixed(1)),
    classification: classify(finalScore),
    completion: index === 5 ? 'جزئي' : 'مكتمل',
    gap: Number(Math.abs(selfScore - managerScore).toFixed(1)),
    gapDirection: selfScore > managerScore ? 'الذاتي أعلى' : selfScore < managerScore ? 'المدير/الإدارة أعلى' : 'متساوي',
    noteCount: Object.values(notes).flat().length + Object.values(selfNotes).flat().length,
    othersNoteCount: Object.values(notes).flat().length,
    notes,
    selfNotes,
  };
});

const taskNames = [
  ['إعداد خطة العمل الشهرية ومتابعة التنفيذ', 'نسبة تنفيذ الأنشطة ضمن المدة المحددة'],
  ['إعداد التقارير الدورية ورفعها للإدارة', 'جودة ودقة التقارير المرفوعة'],
  ['تنسيق الاجتماعات ومتابعة محاضرها', 'نسبة إغلاق البنود ضمن المهل'],
  ['تحديث قواعد البيانات والسجلات', 'اكتمال البيانات وخلوها من الأخطاء'],
];
const criterionNames = ['الحضور والانضباط', 'السرية عند التعامل مع البيانات', 'مهارات التواصل', 'روح الفريق', 'المبادرة والتطوير'];

const evaluations: EvaluationRecord[] = [];
const tasks: TaskRecord[] = [];
const criteria: CriterionRecord[] = [];
const narratives: NarrativeRecord[] = [];

people.forEach((person, personIndex) => {
  const types = person.role === 'رئيس دائرة'
    ? ['تقييم الإدارة لرئيس الدائرة', 'تقييم ذاتي لرئيس الدائرة', 'تقييم رئيس دائرة لزميله', 'تقييم الموظف لمديره المباشر']
    : ['تقييم المدير المباشر للموظف', 'تقييم ذاتي للموظف', 'تقييم زميل للموظف'];
  types.forEach((type, typeIndex) => {
    const evaluationId = `demo-${person.code}-${typeIndex + 1}`;
    const sourceScore = type.includes('ذاتي') ? person.selfScore : type.includes('زميل') ? person.peerScore : type.includes('الموظف لمديره') ? person.subordinateScore : person.managerScore;
    const evaluatorName = type.includes('ذاتي') ? person.name : type.includes('زميل') ? `زميل ${typeIndex + 1}` : type.includes('الموظف لمديره') ? `موظف ${typeIndex + 1}` : person.managerName;
    evaluations.push({
      id: evaluationId,
      type,
      personCode: person.code,
      personName: person.name,
      evaluatorCode: type.includes('ذاتي') ? person.code : `ev_${personIndex}_${typeIndex}`,
      evaluatorName,
      personDepartmentRaw: person.department,
      personDepartment: person.department,
      personJobTitle: person.jobTitle,
      evaluatorDepartmentRaw: person.department,
      evaluatorDepartment: person.department,
      evaluatorJobTitle: '',
      date: `2026-05-${String(10 + personIndex + typeIndex).padStart(2, '0')}`,
      submittedAt: '',
      taskCount: 4,
      criterionCount: 5,
      taskScore: sourceScore == null ? null : Math.max(40, sourceScore - 3),
      criterionScore: sourceScore == null ? null : Math.min(100, sourceScore + 4),
      calculatedScore: sourceScore,
      status: 'مكتمل',
      source: 'بيانات تجريبية',
      pageUrl: `/evaluations/${evaluationId}`,
    });
    taskNames.forEach(([task, indicator], taskIndex) => {
      const weight = 25;
      const score = sourceScore == null ? 0 : Number(((sourceScore / 100) * weight + ((taskIndex % 2) - 0.5) * 2).toFixed(1));
      tasks.push({ evaluationId, evaluationType: type, personCode: person.code, personName: person.name, evaluatorCode: `ev_${personIndex}_${typeIndex}`, evaluatorName, department: person.department, number: taskIndex + 1, code: `${person.code}-${taskIndex + 1}`, task, indicator, weight, score, percentage: Number(((score / weight) * 100).toFixed(1)), date: `2026-05-${String(10 + personIndex + typeIndex).padStart(2, '0')}` });
    });
    criterionNames.forEach((criterion, criterionIndex) => {
      const maximum = 20;
      const score = sourceScore == null ? 0 : Number(((sourceScore / 100) * maximum + ((criterionIndex % 3) - 1) * 1.2).toFixed(1));
      criteria.push({ evaluationId, evaluationType: type, personCode: person.code, personName: person.name, evaluatorCode: `ev_${personIndex}_${typeIndex}`, evaluatorName, department: person.department, number: criterionIndex + 1, code: `${person.code}-c${criterionIndex + 1}`, criterion, maximum, score, percentage: Number(((score / maximum) * 100).toFixed(1)), date: `2026-05-${String(10 + personIndex + typeIndex).padStart(2, '0')}` });
    });
  });

  const otherNotes: Array<[NoteCategory, string]> = [
    ['strengths', person.notes.strengths[0]],
    ['strengths', person.notes.strengths[1]],
    ['improvements', person.notes.improvements[0]],
    ['development', person.notes.development[0]],
    ['recommendations', person.notes.recommendations[0]],
  ];
  otherNotes.forEach(([category, noteText], index) => narratives.push({
    id: `note-${person.code}-${index}`,
    evaluationId: `demo-${person.code}-1`,
    evaluationType: person.role === 'رئيس دائرة' ? 'تقييم الإدارة لرئيس الدائرة' : 'تقييم المدير المباشر للموظف',
    personCode: person.code,
    personName: person.name,
    evaluatorCode: 'manager',
    evaluatorName: person.managerName,
    category,
    categoryLabel: category === 'strengths' ? 'نقاط القوة والإيجابيات' : category === 'improvements' ? 'الجوانب التي تحتاج إلى تحسين' : category === 'development' ? 'مجالات التطوير' : 'التوصيات ومقترحات التطوير',
    text: noteText,
    isSelf: false,
    date: '2026-05-20',
  }));
  narratives.push({ id: `self-${person.code}`, evaluationId: `demo-${person.code}-2`, evaluationType: person.role === 'رئيس دائرة' ? 'تقييم ذاتي لرئيس الدائرة' : 'تقييم ذاتي للموظف', personCode: person.code, personName: person.name, evaluatorCode: person.code, evaluatorName: person.name, category: 'challenges', categoryLabel: 'التحديات والجوانب السلبية', text: person.selfNotes.challenges[0], isSelf: true, date: '2026-05-18' });
});

export const demoData: PlatformData = {
  fileName: 'بيانات تجريبية مدمجة داخل المنصة',
  importedAt: new Date().toISOString(),
  people,
  evaluations,
  tasks,
  criteria,
  narratives,
  qualityIssues: [
    { severity: 'متوسطة', category: 'اكتمال التقييم', message: 'يوجد شخص واحد بملف تقييم جزئي ضمن البيانات التجريبية.', personCode: 'emp_006' },
    { severity: 'منخفضة', category: 'توحيد الدوائر', message: 'تم توحيد أسماء الدوائر بصريًا مع الاحتفاظ بالاسم الخام للتدقيق.' },
  ],
};

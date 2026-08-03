export type RawRow = Record<string, unknown>;

export type NoteCategory =
  | 'strengths'
  | 'improvements'
  | 'challenges'
  | 'development'
  | 'recommendations'
  | 'general';

export type NoteGroup = Record<NoteCategory, string[]>;

export type NarrativeRecord = {
  id: string;
  evaluationId: string;
  evaluationType: string;
  personCode: string;
  personName: string;
  evaluatorCode: string;
  evaluatorName: string;
  category: NoteCategory;
  categoryLabel: string;
  text: string;
  isSelf: boolean;
  date?: string;
};

export type TaskRecord = {
  evaluationId: string;
  evaluationType: string;
  personCode: string;
  personName: string;
  evaluatorCode: string;
  evaluatorName: string;
  department: string;
  number: number;
  code: string;
  task: string;
  indicator: string;
  weight: number;
  score: number;
  percentage: number;
  date?: string;
};

export type CriterionRecord = {
  evaluationId: string;
  evaluationType: string;
  personCode: string;
  personName: string;
  evaluatorCode: string;
  evaluatorName: string;
  department: string;
  number: number;
  code: string;
  criterion: string;
  maximum: number;
  score: number;
  percentage: number;
  date?: string;
};

export type EvaluationRecord = {
  id: string;
  type: string;
  personCode: string;
  personName: string;
  evaluatorCode: string;
  evaluatorName: string;
  personDepartmentRaw: string;
  personDepartment: string;
  personJobTitle: string;
  evaluatorDepartmentRaw: string;
  evaluatorDepartment: string;
  evaluatorJobTitle: string;
  date?: string;
  submittedAt?: string;
  taskCount: number;
  criterionCount: number;
  taskScore: number | null;
  criterionScore: number | null;
  calculatedScore: number | null;
  status: string;
  source: string;
  pageUrl: string;
};

export type PersonRecord = {
  code: string;
  name: string;
  role: 'موظف' | 'رئيس دائرة';
  jobTitle: string;
  departmentRaw: string;
  department: string;
  managerName: string;
  evaluationCount: number;
  managerScore: number | null;
  selfScore: number | null;
  peerScore: number | null;
  subordinateScore: number | null;
  finalScore: number | null;
  classification: string;
  completion: 'مكتمل' | 'غير مكتمل' | 'جزئي';
  gap: number | null;
  gapDirection: 'الذاتي أعلى' | 'المدير/الإدارة أعلى' | 'متساوي' | 'غير متاح';
  noteCount: number;
  othersNoteCount: number;
  notes: NoteGroup;
  selfNotes: NoteGroup;
};

export type QualityIssue = {
  severity: 'عالية' | 'عالي' | 'متوسطة' | 'متوسط' | 'منخفضة' | 'منخفض';
  category: string;
  message: string;
  suggestedAction?: string;
  sheet?: string;
  row?: number;
  evaluationId?: string;
  personCode?: string;
};

export type PlatformData = {
  fileName: string;
  importedAt: string;
  people: PersonRecord[];
  evaluations: EvaluationRecord[];
  tasks: TaskRecord[];
  criteria: CriterionRecord[];
  narratives: NarrativeRecord[];
  qualityIssues: QualityIssue[];
};

export type PageKey =
  | 'dashboard'
  | 'people'
  | 'evaluations'
  | 'tasks'
  | 'criteria'
  | 'notes'
  | 'gaps'
  | 'quality'
  | 'profile';

export type NavigationQuery = {
  search?: string;
  department?: string;
  classification?: string;
  completion?: string;
  role?: string;
  minGap?: number;
  maxGap?: number;
  reviewOnly?: boolean;
  sort?: 'final-desc' | 'final-asc' | 'gap-desc' | 'manager-desc';
};

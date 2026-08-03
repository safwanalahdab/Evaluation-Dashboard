import * as XLSX from 'xlsx';
import type { CriterionRecord, EvaluationRecord, NarrativeRecord, PersonRecord, TaskRecord } from '../types';

export function exportRowsToExcel(filename: string, sheetName: string, rows: Array<Record<string, unknown>>): void {
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31));
  XLSX.writeFile(workbook, filename, { compression: true });
}

export function exportPersonWorkbook(
  person: PersonRecord,
  evaluations: EvaluationRecord[],
  tasks: TaskRecord[],
  criteria: CriterionRecord[],
  narratives: NarrativeRecord[],
): void {
  const workbook = XLSX.utils.book_new();
  const summary = [{
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
  }];
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(summary), 'الملخص');
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(evaluations.map((item) => ({
    'نوع التقييم': item.type, 'اسم المُقيّم': item.evaluatorName, 'التاريخ': item.date, 'نتيجة المهام': item.taskScore,
    'نتيجة المعايير': item.criterionScore, 'النتيجة': item.calculatedScore, 'الحالة': item.status, 'معرف التقييم': item.id,
  }))), 'التقييمات');
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(tasks.map((item) => ({
    'نوع التقييم': item.evaluationType, 'اسم المُقيّم': item.evaluatorName, 'رقم المهمة': item.number, 'المهمة': item.task,
    'مؤشر الأداء': item.indicator, 'الوزن': item.weight, 'الدرجة': item.score, 'النسبة': item.percentage,
  }))), 'المهام');
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(criteria.map((item) => ({
    'نوع التقييم': item.evaluationType, 'اسم المُقيّم': item.evaluatorName, 'المعيار': item.criterion,
    'الدرجة القصوى': item.maximum, 'الدرجة': item.score, 'النسبة': item.percentage,
  }))), 'المعايير');
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(narratives.map((item) => ({
    'التصنيف': item.categoryLabel, 'النص': item.text, 'اسم المُقيّم': item.evaluatorName, 'نوع التقييم': item.evaluationType,
    'تقييم ذاتي': item.isSelf ? 'نعم' : 'لا', 'التاريخ': item.date,
  }))), 'الملاحظات');
  XLSX.writeFile(workbook, `تفاصيل التقييم - ${person.name}.xlsx`, { compression: true });
}

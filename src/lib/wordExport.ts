import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  ImageRun,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';
import type { NoteGroup, PersonRecord } from '../types';

const NAVY = '0B2B45';
const CYAN = '16BED2';
const LIGHT = 'EDF5F8';
const BORDER = 'CBD9E1';

const loadAsset = async (path: string): Promise<ArrayBuffer> => {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`تعذر تحميل أصل التقرير: ${path}`);
  return response.arrayBuffer();
};

const paragraph = (value: string, options: { bold?: boolean; size?: number; color?: string; center?: boolean; after?: number } = {}) => new Paragraph({
  alignment: options.center ? AlignmentType.CENTER : AlignmentType.RIGHT,
  bidirectional: true,
  spacing: { after: options.after ?? 100, line: 300 },
  children: [new TextRun({ text: value, bold: options.bold, size: options.size ?? 24, color: options.color ?? NAVY, font: 'Dubai', rightToLeft: true })],
});

const tableCell = (value: string, header = false) => new TableCell({
  width: { size: header ? 33 : 67, type: WidthType.PERCENTAGE },
  shading: header ? { fill: LIGHT, type: ShadingType.CLEAR } : undefined,
  margins: { top: 110, bottom: 110, left: 130, right: 130 },
  children: [paragraph(value, { bold: header, size: 22, color: header ? NAVY : '263746', after: 0 })],
});

const sectionTitle = (value: string) => new Paragraph({
  alignment: AlignmentType.RIGHT,
  bidirectional: true,
  spacing: { before: 220, after: 130 },
  border: { bottom: { color: CYAN, style: BorderStyle.SINGLE, size: 11, space: 4 } },
  children: [new TextRun({ text: value, bold: true, size: 28, color: NAVY, font: 'Dubai', rightToLeft: true })],
});

const numberedItems = (items: string[]) => items.map((item) => new Paragraph({
  alignment: AlignmentType.RIGHT,
  bidirectional: true,
  spacing: { after: 85, line: 310 },
  numbering: { reference: 'arabic-numbering', level: 0 },
  children: [new TextRun({ text: item, size: 23, color: '263746', font: 'Cairo', rightToLeft: true })],
}));

const safeName = (value: string) => value.replace(/[\\/:*?"<>|]/g, '-').trim() || 'موظف';
const unique = (items: string[]) => Array.from(new Set(items.map((item) => item.replace(/\s+/g, ' ').trim()).filter(Boolean)));

const reportSections: Array<[keyof NoteGroup, string]> = [
  ['strengths', 'نقاط القوة والإيجابيات'],
  ['improvements', 'الجوانب التي تحتاج إلى تحسين'],
  ['challenges', 'التحديات والجوانب السلبية'],
  ['development', 'مجالات التطوير'],
  ['recommendations', 'التوصيات ومقترحات التطوير'],
  ['general', 'ملاحظات عامة'],
];

export async function exportPersonWord(person: PersonRecord): Promise<void> {
  const [headerImage, footerImage] = await Promise.all([
    loadAsset('/report_header.jpg'),
    loadAsset('/report_footer.jpg'),
  ]);

  const scoreLabel = person.role === 'رئيس دائرة' ? 'نتيجة تقييم الإدارة' : 'نتيجة تقييم المدير المباشر';
  const score = person.managerScore == null ? 'غير متاح' : `${person.managerScore.toFixed(1)} من 100`;
  const infoRows: Array<[string, string]> = [
    ['اسم الشخص محل التقييم', person.name],
    ['الدائرة', person.department || 'غير متاح'],
    ['المسمى الوظيفي', person.jobTitle || 'غير متاح'],
    [scoreLabel, score],
    ['التصنيف', person.classification],
  ];

  const noteChildren: Array<Paragraph> = [];
  reportSections.forEach(([key, title]) => {
    const values = unique(person.notes[key]);
    if (!values.length) return;
    noteChildren.push(sectionTitle(title), ...numberedItems(values));
  });
  if (!noteChildren.length) {
    noteChildren.push(sectionTitle('الملاحظات السردية'), paragraph('لم تُسجل ملاحظات سردية كتبها الآخرون عن الشخص ضمن البيانات الحالية.', { color: '71808D' }));
  }

  const reportDoc = new Document({
    creator: 'مديرية التنمية الإدارية بحمص - دائرة الموارد البشرية',
    title: `التقرير الفردي لنتائج تقييم الأداء - ${person.name}`,
    description: 'تقرير فردي سري يضم تقييم المدير والملاحظات التي كتبها الآخرون عن الشخص فقط.',
    numbering: {
      config: [{
        reference: 'arabic-numbering',
        levels: [{ level: 0, format: 'decimal', text: '%1.', alignment: AlignmentType.RIGHT, style: { paragraph: { indent: { left: 360, hanging: 280 } } } }],
      }],
    },
    sections: [{
      properties: { page: { margin: { top: 1550, right: 850, bottom: 1250, left: 850 } } },
      headers: {
        default: new Header({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 0 },
            children: [new ImageRun({ data: headerImage, type: 'jpg', transformation: { width: 665, height: 184 } })],
          })],
        }),
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 0, after: 0 },
            children: [new ImageRun({ data: footerImage, type: 'jpg', transformation: { width: 665, height: 167 } })],
          })],
        }),
      },
      children: [
        paragraph('التقرير الفردي لنتائج تقييم الأداء 360', { bold: true, size: 36, center: true, color: NAVY }),
        paragraph('دائرة الموارد البشرية', { size: 23, center: true, color: '62717E', after: 180 }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: {
            top: { style: BorderStyle.SINGLE, size: 6, color: BORDER },
            bottom: { style: BorderStyle.SINGLE, size: 6, color: BORDER },
            left: { style: BorderStyle.SINGLE, size: 6, color: BORDER },
            right: { style: BorderStyle.SINGLE, size: 6, color: BORDER },
            insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: BORDER },
            insideVertical: { style: BorderStyle.SINGLE, size: 4, color: BORDER },
          },
          rows: infoRows.map(([label, value]) => new TableRow({ children: [tableCell(value), tableCell(label, true)] })),
        }),
        ...noteChildren,
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 280 },
          children: [new TextRun({
            text: 'يتضمن هذا التقرير الملاحظات التي كتبها الآخرون عن الشخص فقط، مع إخفاء هوية وصفة مصدر كل ملاحظة حفاظًا على السرية.',
            italics: true,
            size: 18,
            color: '71808D',
            font: 'Cairo',
            rightToLeft: true,
          })],
        }),
      ],
    }],
  });

  const blob = await Packer.toBlob(reportDoc);
  const url = URL.createObjectURL(blob);
  const anchor = window.document.createElement('a');
  anchor.href = url;
  anchor.download = `التقرير الفردي - ${safeName(person.name)}.docx`;
  window.document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

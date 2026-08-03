import type { ReactNode } from 'react';
import { ChevronLeft, ChevronRight, Download, FileSpreadsheet, Filter, RefreshCw, Search } from 'lucide-react';

export const valueOrDash = (value: number | null | undefined, digits = 1) => value == null ? '—' : value.toFixed(digits);
export const classificationTone = (value: string) => value === 'ممتاز' ? 'excellent' : value === 'جيد' ? 'good' : value === 'مقبول' ? 'acceptable' : value === 'ضعيف' ? 'weak' : value === 'ضعيف جدًا' ? 'very-weak' : 'neutral';
export const averageNumbers = (values: Array<number | null | undefined>) => {
  const valid = values.filter((value): value is number => value != null && Number.isFinite(value));
  return valid.length ? valid.reduce((sum, value) => sum + value, 0) / valid.length : null;
};
export const unique = (values: string[]) => ['الكل', ...Array.from(new Set(values.filter(Boolean)))];

export function PanelHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return <header className="panel-header"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>{actions && <div className="panel-actions">{actions}</div>}</header>;
}

export function DashboardCard({ title, subtitle, actions, className, children }: { title: string; subtitle?: string; actions?: ReactNode; className?: string; children: ReactNode }) {
  return <section className={`dashboard-card ${className ?? ''}`}><header><div><h3>{title}</h3>{subtitle && <p>{subtitle}</p>}</div>{actions}</header>{children}</section>;
}

export function SearchInput({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  return <div className="search-input"><Search size={16} /><input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} /></div>;
}

export function Select({ value, onChange, options, labels }: { value: string; onChange: (value: string) => void; options: string[]; labels?: Record<string, string> }) {
  return <select value={value} onChange={(event) => onChange(event.target.value)}>{options.map((option) => <option key={option} value={option}>{labels?.[option] ?? option}</option>)}</select>;
}

export function FilterField({ label, children }: { label: string; children: ReactNode }) {
  return <label className="filter-field"><span>{label}</span>{children}</label>;
}

export function ExplorerLayout({ title, count, filters, onExport, children }: { title: string; count: number; filters: ReactNode; onExport?: () => void; children: ReactNode }) {
  return <div className="single-panel explorer-panel"><PanelHeader title={title} subtitle={`${count} سجل مطابق`} actions={onExport && <button className="secondary-button" onClick={onExport}><Download size={16} /> تصدير النتائج المفلترة</button>} /><div className="explorer-filters"><Filter size={17} />{filters}</div>{children}</div>;
}

export function ScoreBar({ value, compact = false }: { value: number; compact?: boolean }) {
  const safe = Math.max(0, Math.min(100, value || 0));
  return <div className={`score-bar ${compact ? 'compact' : ''}`}><span><i style={{ width: `${safe}%` }} /></span><strong>{safe.toFixed(1)}%</strong></div>;
}

export function Pagination({ pageIndex, pageCount, onChange }: { pageIndex: number; pageCount: number; onChange: (value: number) => void }) {
  return <div className="pagination"><button onClick={() => onChange(pageIndex - 1)} disabled={pageIndex === 0}><ChevronRight size={16} /> السابق</button><span>صفحة {pageIndex + 1} من {Math.max(pageCount, 1)}</span><button onClick={() => onChange(pageIndex + 1)} disabled={pageIndex + 1 >= pageCount}>التالي <ChevronLeft size={16} /></button></div>;
}

export function EmptyState({ text }: { text: string }) {
  return <div className="empty-state"><FileSpreadsheet size={28} /><span>{text}</span></div>;
}

export function ResetButton({ onClick }: { onClick: () => void }) {
  return <button className="reset-button" onClick={onClick}><RefreshCw size={16} /> إعادة ضبط الفلاتر</button>;
}

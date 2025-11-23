'use client';

interface MetricsCardProps {
  title: string;
  value: string;
  change: string;
  changeType: 'positive' | 'negative';
  icon: React.ReactNode;
}

export default function MetricsCard({ title, value, change, changeType, icon }: MetricsCardProps) {
  return (
    <div className="bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-primary)] p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[var(--text-muted)] text-sm font-medium">{title}</p>
          <p className="text-[var(--text-primary)] text-2xl font-bold">{value}</p>
        </div>
        <div className="w-12 h-12 bg-[var(--bg-tertiary)] rounded-lg flex items-center justify-center">
          {icon}
        </div>
      </div>
      {change && (
        <div className="mt-4">
          <span className={`text-sm font-medium ${
            changeType === 'positive' ? 'text-[var(--success)]' : 'text-[var(--error)]'
          }`}>
            {change}
          </span>
          <span className="text-[var(--text-muted)] text-sm ml-1">desde el mes pasado</span>
        </div>
      )}
    </div>
  );
}

'use client';

interface AttendanceSummary {
  totalCheckIns: number;
  attendanceRate: number;
  noShowRate: number;
}

interface AttendanceMetricsWidgetProps {
  attendanceSummary: AttendanceSummary | null | undefined;
  isLoading: boolean;
}

export default function AttendanceMetricsWidget({ attendanceSummary, isLoading }: AttendanceMetricsWidgetProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div className="bg-white/3 rounded-xl p-4 space-y-1 border border-border-subtle">
        <p className="text-text-muted text-xs uppercase tracking-wider font-semibold">Total Check-Ins</p>
        <p className={`text-2xl font-black mt-1 ${isLoading ? 'text-text-muted animate-pulse' : 'text-emerald-400'}`}>
          {isLoading ? '...' : (attendanceSummary?.totalCheckIns ?? 0).toLocaleString()}
        </p>
      </div>
      <div className="bg-white/3 rounded-xl p-4 space-y-1 border border-border-subtle">
        <p className="text-text-muted text-xs uppercase tracking-wider font-semibold">Attendance Rate</p>
        <p className={`text-2xl font-black mt-1 ${isLoading ? 'text-text-muted animate-pulse' : 'text-emerald-400'}`}>
          {isLoading ? '...' : `${Math.round(attendanceSummary?.attendanceRate ?? 0)}%`}
        </p>
      </div>
      <div className="bg-white/3 rounded-xl p-4 space-y-1 border border-border-subtle">
        <p className="text-text-muted text-xs uppercase tracking-wider font-semibold">No-Show Rate</p>
        <p className={`text-2xl font-black mt-1 ${isLoading ? 'text-text-muted animate-pulse' : 'text-red-400'}`}>
          {isLoading ? '...' : `${Math.round(attendanceSummary?.noShowRate ?? 0)}%`}
        </p>
      </div>
    </div>
  );
}

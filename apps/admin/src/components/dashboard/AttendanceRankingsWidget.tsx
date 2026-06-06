'use client';

interface AttendanceRankingsWidgetProps {
  attendanceRankings: any;
  isLoading: boolean;
}

export default function AttendanceRankingsWidget({ attendanceRankings, isLoading }: AttendanceRankingsWidgetProps) {
  const topAttendedContent = (() => {
    if (isLoading) {
      return <div className="h-24 flex items-center justify-center text-text-muted text-sm animate-pulse">Loading...</div>;
    }
    if (!attendanceRankings?.topAttended.length) {
      return <div className="h-24 flex items-center justify-center text-text-muted text-sm">No attendance data available yet.</div>;
    }
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-subtle">
              <th className="text-left text-text-muted font-medium py-3 px-6">Event</th>
              <th className="text-right text-text-muted font-medium py-3 px-4">Checked In</th>
              <th className="text-right text-text-muted font-medium py-3 px-6">Attendance</th>
            </tr>
          </thead>
          <tbody>
            {attendanceRankings.topAttended.slice(0, 5).map((ev: any) => (
              <tr key={ev.eventId} className="border-b border-border-subtle/40 hover:bg-white/2">
                <td className="py-3.5 px-6 text-text-primary truncate max-w-[160px]">{ev.eventName}</td>
                <td className="py-3.5 px-4 text-right text-text-secondary">{ev.ticketsCheckedIn}</td>
                <td className="py-3.5 px-6 text-right text-emerald-400 font-semibold">{Math.round(ev.attendancePercentage)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  })();

  const noShowContent = (() => {
    if (isLoading) {
      return <div className="h-24 flex items-center justify-center text-text-muted text-sm animate-pulse">Loading...</div>;
    }
    if (!attendanceRankings?.lowestAttendance.length) {
      return <div className="h-24 flex items-center justify-center text-text-muted text-sm">No attendance data available yet.</div>;
    }
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-subtle">
              <th className="text-left text-text-muted font-medium py-3 px-6">Event</th>
              <th className="text-right text-text-muted font-medium py-3 px-4">No Shows</th>
              <th className="text-right text-text-muted font-medium py-3 px-6">No-Show %</th>
            </tr>
          </thead>
          <tbody>
            {attendanceRankings.lowestAttendance.slice(0, 5).map((ev: any) => (
              <tr key={ev.eventId} className="border-b border-border-subtle/40 hover:bg-white/2">
                <td className="py-3.5 px-6 text-text-primary truncate max-w-[160px]">{ev.eventName}</td>
                <td className="py-3.5 px-4 text-right text-text-secondary">{ev.noShowCount}</td>
                <td className="py-3.5 px-6 text-right text-red-400 font-semibold">{Math.round(ev.noShowPercentage)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  })();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <div className="glass rounded-2xl border border-border-subtle overflow-hidden">
        <div className="px-6 py-4 border-b border-border-subtle">
          <h2 className="text-white font-semibold">Top Attended Events</h2>
        </div>
        {topAttendedContent}
      </div>
      <div className="glass rounded-2xl border border-border-subtle overflow-hidden">
        <div className="px-6 py-4 border-b border-border-subtle">
          <h2 className="text-white font-semibold">Highest No-Shows</h2>
        </div>
        {noShowContent}
      </div>
    </div>
  );
}

'use client';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@mad/ui';

interface AttendanceRankingEvent {
  eventId: string;
  eventName: string;
  ticketsCheckedIn?: number;
  attendancePercentage?: number;
  noShowCount?: number;
  noShowPercentage?: number;
}

interface AttendanceRankings {
  topAttended: AttendanceRankingEvent[];
  lowestAttendance: AttendanceRankingEvent[];
}

interface AttendanceRankingsWidgetProps {
  attendanceRankings: AttendanceRankings | null | undefined;
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
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="py-3 px-6">Event</TableHead>
            <TableHead className="py-3 px-4 text-right">Checked In</TableHead>
            <TableHead className="py-3 px-6 text-right">Attendance</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {attendanceRankings.topAttended.slice(0, 5).map((ev: AttendanceRankingEvent) => (
            <TableRow key={ev.eventId} className="border-b border-border-subtle/40 hover:bg-white/2">
              <TableCell className="py-3.5 px-6 text-text-primary truncate max-w-[160px]">{ev.eventName}</TableCell>
              <TableCell className="py-3.5 px-4 text-right text-text-secondary">{ev.ticketsCheckedIn}</TableCell>
              <TableCell className="py-3.5 px-6 text-right text-emerald-400 font-semibold">{Math.round(ev.attendancePercentage ?? 0)}%</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
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
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="py-3 px-6">Event</TableHead>
            <TableHead className="py-3 px-4 text-right">No Shows</TableHead>
            <TableHead className="py-3 px-6 text-right">No-Show %</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {attendanceRankings.lowestAttendance.slice(0, 5).map((ev: AttendanceRankingEvent) => (
            <TableRow key={ev.eventId} className="border-b border-border-subtle/40 hover:bg-white/2">
              <TableCell className="py-3.5 px-6 text-text-primary truncate max-w-[160px]">{ev.eventName}</TableCell>
              <TableCell className="py-3.5 px-4 text-right text-text-secondary">{ev.noShowCount}</TableCell>
              <TableCell className="py-3.5 px-6 text-right text-red-400 font-semibold">{Math.round(ev.noShowPercentage ?? 0)}%</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
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

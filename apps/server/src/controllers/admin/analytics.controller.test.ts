import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Booking } from '../../models/booking.schema';
import { Event } from '../../models/event.schema';
import { Ticket } from '../../models/ticket.schema';
import {
  getSummary,
  getRevenue,
  getAttendanceSummary,
  getAttendanceRankings
} from './analytics.controller';

vi.mock('../../models/booking.schema', () => ({
  Booking: {
    countDocuments: vi.fn(),
    aggregate: vi.fn(),
  },
}));

vi.mock('../../models/event.schema', () => ({
  Event: {
    findById: vi.fn(),
    countDocuments: vi.fn(),
    aggregate: vi.fn(),
  },
}));

vi.mock('../../models/ticket.schema', () => ({
  Ticket: {
    aggregate: vi.fn(),
  },
}));

const mockRequest = (query = {}, params = {}) => {
  return {
    query,
    params,
  } as any;
};

const mockResponse = () => {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

describe('Analytics Controller Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getSummary', () => {
    it('should calculate bookings, revenue, and manual top event populating correctly', async () => {
      vi.mocked(Booking.countDocuments).mockResolvedValueOnce(50).mockResolvedValueOnce(15);
      vi.mocked(Booking.aggregate).mockResolvedValueOnce([{ _id: null, total: 15000 }]);
      vi.mocked(Booking.aggregate).mockResolvedValueOnce([
        { _id: 'event-1', count: 10, revenue: 3000 }
      ]);
      vi.mocked(Event.findById).mockReturnValueOnce({
        select: vi.fn().mockResolvedValue({
          title: 'Sunburn Event',
          startDate: new Date('2026-06-01T20:00:00.000Z'),
        }),
      } as any);

      const req = mockRequest();
      const res = mockResponse();
      const next = vi.fn();

      await getSummary(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          totalBookings: 50,
          recentBookings: 15,
          totalRevenue: 15000,
          topEvents: [
            {
              _id: 'event-1',
              count: 10,
              revenue: 3000,
              event: { title: 'Sunburn Event', startDate: '2026-06-01T20:00:00.000Z' }
            }
          ]
        }
      });
    });
  });

  describe('getRevenue', () => {
    it('should aggregate booking revenue by date correctly', async () => {
      const mockRevenueData = [
        { _id: '2026-05-20', revenue: 5000, count: 2 },
        { _id: '2026-05-21', revenue: 3000, count: 1 }
      ];
      vi.mocked(Booking.aggregate).mockResolvedValueOnce(mockRevenueData);

      const req = mockRequest({ days: '7' });
      const res = mockResponse();
      const next = vi.fn();

      await getRevenue(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockRevenueData
      });
    });
  });

  describe('getAttendanceSummary', () => {
    it('should handle "no sales" safely and return 0% rates', async () => {
      vi.mocked(Event.countDocuments).mockResolvedValueOnce(3);
      vi.mocked(Event.aggregate).mockResolvedValueOnce([{ _id: null, total: 0 }]);
      vi.mocked(Ticket.aggregate).mockResolvedValueOnce([{ _id: null, total: 0 }]);

      const req = mockRequest();
      const res = mockResponse();
      const next = vi.fn();

      await getAttendanceSummary(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          totalEvents: 3,
          totalTicketsSold: 0,
          totalCheckIns: 0,
          attendanceRate: 0,
          noShowRate: 0
        }
      });
    });

    it('should calculate correct metrics when there are sales but "no scans" (100% no-shows)', async () => {
      vi.mocked(Event.countDocuments).mockResolvedValueOnce(5);
      vi.mocked(Event.aggregate).mockResolvedValueOnce([{ _id: null, total: 200 }]);
      vi.mocked(Ticket.aggregate).mockResolvedValueOnce([]);

      const req = mockRequest();
      const res = mockResponse();
      const next = vi.fn();

      await getAttendanceSummary(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          totalEvents: 5,
          totalTicketsSold: 200,
          totalCheckIns: 0,
          attendanceRate: 0,
          noShowRate: 100
        }
      });
    });

    it('should compute partial attendance metrics perfectly', async () => {
      vi.mocked(Event.countDocuments).mockResolvedValueOnce(5);
      vi.mocked(Event.aggregate).mockResolvedValueOnce([{ _id: null, total: 200 }]);
      vi.mocked(Ticket.aggregate).mockResolvedValueOnce([{ _id: null, total: 80 }]);

      const req = mockRequest();
      const res = mockResponse();
      const next = vi.fn();

      await getAttendanceSummary(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          totalEvents: 5,
          totalTicketsSold: 200,
          totalCheckIns: 80,
          attendanceRate: 40,
          noShowRate: 60
        }
      });
    });

    it('should compute full attendance metrics perfectly', async () => {
      vi.mocked(Event.countDocuments).mockResolvedValueOnce(5);
      vi.mocked(Event.aggregate).mockResolvedValueOnce([{ _id: null, total: 250 }]);
      vi.mocked(Ticket.aggregate).mockResolvedValueOnce([{ _id: null, total: 250 }]);

      const req = mockRequest();
      const res = mockResponse();
      const next = vi.fn();

      await getAttendanceSummary(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          totalEvents: 5,
          totalTicketsSold: 250,
          totalCheckIns: 250,
          attendanceRate: 100,
          noShowRate: 0
        }
      });
    });
  });

  describe('getAttendanceRankings', () => {
    it('should rank events correctly by attendance and no-show percentages', async () => {
      const mockAggregatedEvents = [
        {
          eventId: '1',
          eventName: 'Low Attendance Event',
          startDate: new Date('2026-06-10'),
          ticketsSold: 100,
          ticketsCheckedIn: 20,
          ticketsRemaining: 80,
          attendancePercentage: 20,
          noShowCount: 80,
          noShowPercentage: 80
        },
        {
          eventId: '2',
          eventName: 'High Attendance Event',
          startDate: new Date('2026-06-12'),
          ticketsSold: 100,
          ticketsCheckedIn: 95,
          ticketsRemaining: 5,
          attendancePercentage: 95,
          noShowCount: 5,
          noShowPercentage: 5
        }
      ];

      vi.mocked(Event.aggregate).mockResolvedValueOnce(mockAggregatedEvents);

      const req = mockRequest();
      const res = mockResponse();
      const next = vi.fn();

      await getAttendanceRankings(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      const payload = res.json.mock.calls[0][0];
      expect(payload.success).toBe(true);
      expect(payload.data.topAttended[0].eventName).toBe('High Attendance Event');
      expect(payload.data.lowestAttendance[0].eventName).toBe('Low Attendance Event');
    });
  });
});

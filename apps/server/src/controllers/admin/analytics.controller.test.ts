import { describe, it, expect, vi, beforeEach } from 'vitest';

import { Booking } from '../../models/booking.schema';
import { Event } from '../../models/event.schema';
import { Payment } from '../../models/payment.schema';
import { Refund } from '../../models/refund.schema';
import { Ticket } from '../../models/ticket.schema';
import { getSummary, getRevenue, getAttendanceSummary, getAttendanceRankings } from './analytics.controller';

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

vi.mock('../../models/refund.schema', () => ({
  Refund: {
    countDocuments: vi.fn(),
    aggregate: vi.fn(),
  },
}));

vi.mock('../../models/payment.schema', () => ({
  Payment: {
    aggregate: vi.fn(),
  },
}));

vi.mock('../../services/cache.service', () => ({
  CacheService: {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
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
    it('should calculate bookings, revenue, and top events by lookup correctly', async () => {
      vi.mocked(Booking.countDocuments).mockResolvedValueOnce(50).mockResolvedValueOnce(15);
      vi.mocked(Payment.aggregate)
        .mockResolvedValueOnce([{ _id: null, total: 15000 }]) // global gross revenue
        .mockResolvedValueOnce([ // top events list
          {
            _id: 'event-1',
            count: 10,
            grossRevenue: 3000,
            refundAmount: 500,
            netRevenue: 2500,
            revenue: 2500,
            event: {
              title: 'Sunburn Event',
              startDate: new Date('2026-06-01T20:00:00.000Z'),
            }
          }
        ]);
      vi.mocked(Refund.aggregate).mockResolvedValueOnce([{ _id: null, total: 2000 }]);
      vi.mocked(Refund.countDocuments).mockResolvedValueOnce(3);

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
          grossRevenue: 15000,
          refundAmount: 2000,
          netRevenue: 13000,
          totalRevenue: 13000,
          topEvents: [
            {
              _id: 'event-1',
              count: 10,
              grossRevenue: 3000,
              refundAmount: 500,
              netRevenue: 2500,
              revenue: 2500,
              event: { title: 'Sunburn Event', startDate: '2026-06-01T20:00:00.000Z' }
            }
          ],
          pendingRefundsCount: 3
        }
      });
    });
  });

  describe('getRevenue', () => {
    it('should aggregate payment revenue and refunds by date correctly', async () => {
      vi.mocked(Payment.aggregate).mockResolvedValueOnce([
        { _id: '2026-05-20', dailyGrossRevenue: 5000, count: 2 },
        { _id: '2026-05-21', dailyGrossRevenue: 3000, count: 1 }
      ]);
      vi.mocked(Refund.aggregate).mockResolvedValueOnce([
        { _id: '2026-05-20', refundAmount: 500 }
      ]);

      const req = mockRequest({ days: '7' });
      const res = mockResponse();
      const next = vi.fn();

      await getRevenue(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: [
          {
            _id: '2026-05-20',
            dailyGrossRevenue: 5000,
            dailyRefundAmount: 500,
            dailyNetRevenue: 4500,
            revenue: 4500,
            count: 2
          },
          {
            _id: '2026-05-21',
            dailyGrossRevenue: 3000,
            dailyRefundAmount: 0,
            dailyNetRevenue: 3000,
            revenue: 3000,
            count: 1
          }
        ]
      });
    });
  });

  describe('getAttendanceSummary', () => {
    it('should handle "no sales" safely and return 0% rates', async () => {
      vi.mocked(Event.countDocuments).mockResolvedValueOnce(3);
      vi.mocked(Booking.aggregate).mockResolvedValueOnce([]);

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
      vi.mocked(Booking.aggregate).mockResolvedValueOnce([{ _id: null, totalSold: 200, totalCheckedIn: 0 }]);

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
      vi.mocked(Booking.aggregate).mockResolvedValueOnce([{ _id: null, totalSold: 200, totalCheckedIn: 80 }]);

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
      vi.mocked(Booking.aggregate).mockResolvedValueOnce([{ _id: null, totalSold: 250, totalCheckedIn: 250 }]);

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

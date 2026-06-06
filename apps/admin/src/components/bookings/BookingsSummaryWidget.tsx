'use client';

import { motion } from 'framer-motion';

interface BookingsSummaryProps {
  totalBookings: number;
  totalTickets: number;
  revenue: number;
  confirmed: number;
  pending: number;
  cancelled: number;
  checkedIn: number;
  isLoading?: boolean;
}

export default function BookingsSummaryWidget({
  totalBookings = 0,
  totalTickets = 0,
  revenue = 0,
  confirmed = 0,
  pending = 0,
  cancelled = 0,
  checkedIn = 0,
  isLoading = false,
}: BookingsSummaryProps) {
  // Local presentation-only derivations
  const averageTickets = totalBookings > 0 ? (totalTickets / totalBookings).toFixed(2) : '0.00';
  const scanPercentage = totalTickets > 0 ? Math.round((checkedIn / totalTickets) * 100) : 0;

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
        {Array.from({ length: 4 }).map((_, idx) => (
          <div
            key={idx}
            className="h-32 bg-white/5 border border-border-subtle/30 rounded-2xl p-6 flex flex-col justify-between"
          >
            <div className="h-4 bg-white/10 rounded w-1/3" />
            <div className="h-8 bg-white/10 rounded w-2/3 mt-2" />
            <div className="h-3 bg-white/5 rounded w-1/2 mt-4" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
    >
      {/* CARD 1: REVENUE (HERO CARD WITH GOLD/PURPLE GLOW ACCENT) */}
      <motion.div
        variants={itemVariants}
        className="relative overflow-hidden glass rounded-2xl border border-border-subtle p-6 hover:border-accent-purple/40 hover:shadow-glow-sm transition-all group"
      >
        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-accent-purple/10 to-yellow-500/5 rounded-bl-full pointer-events-none" />
        <p className="text-text-muted text-xs uppercase tracking-wider font-semibold">Total Revenue</p>
        <p className="text-2xl font-black mt-2 text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-yellow-300 transition-all duration-300">
          ₹{revenue.toLocaleString('en-IN')}
        </p>
        <p className="text-[10px] text-text-muted mt-3">From confirmed bookings</p>
      </motion.div>

      {/* CARD 2: BOOKINGS OVERVIEW (WITH STATUS BREAKDOWNS) */}
      <motion.div
        variants={itemVariants}
        className="glass rounded-2xl border border-border-subtle p-6 hover:border-accent-purple/30 transition-all"
      >
        <p className="text-text-muted text-xs uppercase tracking-wider font-semibold">Total Bookings</p>
        <p className="text-2xl font-black mt-2 text-white">{totalBookings.toLocaleString('en-IN')}</p>
        <div className="flex flex-wrap items-center gap-2.5 mt-3 text-[10px]">
          <span className="flex items-center gap-1 text-green-400">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
            {confirmed} Confirmed
          </span>
          <span className="flex items-center gap-1 text-yellow-400">
            <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
            {pending} In Progress
          </span>
          <span className="flex items-center gap-1 text-red-400">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
            {cancelled} Closed Outcomes
          </span>
        </div>
      </motion.div>

      {/* CARD 3: TICKETS SOLD (WITH AVERAGE TICKETS CALCULATION) */}
      <motion.div
        variants={itemVariants}
        className="glass rounded-2xl border border-border-subtle p-6 hover:border-accent-purple/30 transition-all"
      >
        <p className="text-text-muted text-xs uppercase tracking-wider font-semibold">Total Tickets</p>
        <p className="text-2xl font-black mt-2 text-white">{totalTickets.toLocaleString('en-IN')}</p>
        <p className="text-[10px] text-text-muted mt-3">
          Avg. <span className="text-white font-medium">{averageTickets}</span> tickets per booking
        </p>
      </motion.div>

      {/* CARD 4: CHECKED IN (WITH PROGRESS BAR & PERCENTAGE) */}
      <motion.div
        variants={itemVariants}
        className="glass rounded-2xl border border-border-subtle p-6 hover:border-accent-purple/30 transition-all"
      >
        <div className="flex justify-between items-start">
          <p className="text-text-muted text-xs uppercase tracking-wider font-semibold">Checked In</p>
          <span className="text-emerald-400 font-bold text-xs">{scanPercentage}%</span>
        </div>
        <p className="text-2xl font-black mt-2 text-emerald-400">
          {checkedIn.toLocaleString('en-IN')}{' '}
          <span className="text-text-muted text-xs font-normal">/ {totalTickets.toLocaleString('en-IN')}</span>
        </p>
        <div className="w-full bg-white/5 rounded-full h-1.5 mt-3.5 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(scanPercentage, 100)}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="bg-emerald-500 h-full rounded-full"
          />
        </div>
      </motion.div>
    </motion.div>
  );
}

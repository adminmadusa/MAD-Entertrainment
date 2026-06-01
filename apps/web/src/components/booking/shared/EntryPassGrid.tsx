import { Ticket } from '@mad/types';
import { motion } from 'framer-motion';

interface EntryPassGridProps {
  tickets: Ticket[];
}

export function EntryPassGrid({ tickets }: EntryPassGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {tickets.map((ticket, tIndex) => (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: tIndex * 0.05 }}
          key={ticket._id || ticket.ticketId}
          className="glass-strong rounded-2xl border border-border-subtle/60 overflow-hidden flex flex-col items-center p-6 text-center space-y-4 shadow-sm"
        >
          <div className="w-full pb-2 border-b border-border-subtle/40">
            <div className="text-accent-purple-light text-xs font-bold uppercase tracking-wider">
              {ticket.tierName} Entry
            </div>
            {ticket.seatId && (
              <div className="text-white font-bold text-sm mt-1">
                Seat: <span className="font-mono">{ticket.seatId}</span> (Row {ticket.row}, Seat {ticket.seatNumber})
              </div>
            )}
            <div className="text-text-muted text-[9px] mt-1 font-mono">
              ID: {ticket.ticketId}
            </div>
          </div>

          {ticket.ticketId ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={
                ticket.qrCodeImage && !ticket.qrCodeImage.includes('api.qrserver.com')
                  ? ticket.qrCodeImage
                  : `/api/public/tickets/${ticket.ticketId}/qr`
              }
              alt="QR Ticket Code"
              className="w-44 h-44 bg-white p-2 rounded-xl"
            />
          ) : (
            <div className="w-44 h-44 bg-white/5 rounded-xl flex items-center justify-center text-text-muted text-xs">
              No QR Available
            </div>
          )}

          <div className="text-[9px] text-text-muted max-w-[200px] leading-relaxed">
            Present this QR code at the venue entry scanner for digital validation. Do not share this code.
          </div>
        </motion.div>
      ))}
    </div>
  );
}

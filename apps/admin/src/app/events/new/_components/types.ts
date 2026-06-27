export interface CloudinaryImage {
  url: string;
  publicId: string;
  alt?: string;
}

export interface TicketTierInput {
  name: string;
  price: number | '';
  capacity: number | '';
  groupSize: number | '';
  minPerBooking: number | '';
  discount: number | '';
  taxPercent: number | '';
  startDate: string;
  endDate: string;
  description: string;
  isAvailable: boolean;
}

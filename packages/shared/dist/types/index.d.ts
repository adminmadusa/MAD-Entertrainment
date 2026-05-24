import { EventCategory, BookingMode, EventStatus, BookingStatus, PaymentStatus, PaymentGateway, PaymentMethod, TicketTier, SeatStatus, AdminRole, RefundStatus, PopupTrigger, NotificationType, SupportedCurrency } from '../constants';
export interface BaseDocument {
    _id: string;
    createdAt: Date | string;
    updatedAt: Date | string;
}
export interface PaginationMeta {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
}
export interface PaginatedResponse<T> {
    data: T[];
    pagination: PaginationMeta;
}
export interface ApiResponse<T = unknown> {
    success: boolean;
    message: string;
    data?: T;
    error?: string;
    errors?: Record<string, string[]>;
}
export interface CloudinaryImage {
    url: string;
    publicId: string;
    width?: number;
    height?: number;
    format?: string;
    blurDataUrl?: string;
}
export interface Address {
    street?: string;
    city: string;
    state: string;
    country: string;
    pincode?: string;
    coordinates?: {
        lat: number;
        lng: number;
    };
}
export interface Venue extends BaseDocument {
    name: string;
    slug: string;
    description?: string;
    address: Address;
    capacity: number;
    amenities?: string[];
    images: CloudinaryImage[];
    contactEmail?: string;
    contactPhone?: string;
    isActive: boolean;
}
export interface Artist extends BaseDocument {
    name: string;
    slug: string;
    bio?: string;
    genre?: string[];
    profileImage?: CloudinaryImage;
    galleryImages?: CloudinaryImage[];
    socialLinks?: {
        instagram?: string;
        youtube?: string;
        spotify?: string;
        twitter?: string;
        facebook?: string;
    };
    isActive: boolean;
}
export interface DJOperator extends BaseDocument {
    name: string;
    slug: string;
    bio?: string;
    specialties?: string[];
    profileImage?: CloudinaryImage;
    galleryImages?: CloudinaryImage[];
    socialLinks?: {
        instagram?: string;
        soundcloud?: string;
        youtube?: string;
    };
    isActive: boolean;
}
export interface TicketTierConfig {
    tier: TicketTier;
    name: string;
    price: number;
    totalCapacity: number;
    soldCount: number;
    description?: string;
    perks?: string[];
    isActive: boolean;
    maxPerBooking?: number;
}
export interface Seat {
    seatId: string;
    row: string;
    number: number;
    section?: string;
    status: SeatStatus;
    tier: TicketTier;
    price: number;
    lockedBy?: string;
    lockedAt?: Date | string;
    bookedByBookingId?: string;
}
export interface SeatLayout extends BaseDocument {
    eventId: string;
    rows: number;
    columns: number;
    sections: {
        name: string;
        rows: string[];
        tier: TicketTier;
        color?: string;
    }[];
    seats: Seat[];
}
export interface Event extends BaseDocument {
    title: string;
    slug: string;
    description: string;
    category: EventCategory;
    status: EventStatus;
    bookingMode: BookingMode;
    bannerImage: CloudinaryImage;
    posterImage?: CloudinaryImage;
    galleryImages?: CloudinaryImage[];
    startDate: Date | string;
    endDate?: Date | string;
    doorsOpenTime?: string;
    showTime: string;
    venueId: string;
    venue?: Venue;
    onlineStreamUrl?: string;
    isOnline?: boolean;
    artistIds?: string[];
    artists?: Artist[];
    djOperatorIds?: string[];
    djOperators?: DJOperator[];
    ticketTiers: TicketTierConfig[];
    totalCapacity: number;
    soldCount: number;
    isFeatured: boolean;
    isSoldOut: boolean;
    seatLayoutId?: string;
    tags?: string[];
    ageRestriction?: number;
    dresscode?: string;
    additionalInfo?: string;
    showCountdown?: boolean;
    isEarlyBird?: boolean;
    earlyBirdDeadline?: Date | string;
}
export interface User extends BaseDocument {
    name?: string;
    email?: string;
    phone?: string;
    isPhoneVerified: boolean;
    isEmailVerified: boolean;
    isGuest: boolean;
    googleId?: string;
    profileImage?: CloudinaryImage;
    preferredCurrency: SupportedCurrency;
}
export interface Booking extends BaseDocument {
    bookingId: string;
    eventId: string;
    event?: Event;
    userId?: string;
    user?: User;
    guestName?: string;
    guestEmail?: string;
    guestPhone?: string;
    tickets: BookedTicket[];
    totalTickets: number;
    subtotal: number;
    convenienceFee: number;
    gst: number;
    discount: number;
    totalAmount: number;
    currency: SupportedCurrency;
    couponCode?: string;
    couponId?: string;
    status: BookingStatus;
    cancellationReason?: string;
    cancelledAt?: Date | string;
    paymentId?: string;
    payment?: Payment;
}
export interface BookedTicket {
    tier: TicketTier;
    tierName: string;
    quantity: number;
    pricePerTicket: number;
    subtotal: number;
    seats?: {
        seatId: string;
        row: string;
        number: number;
        section?: string;
    }[];
}
export interface Ticket extends BaseDocument {
    ticketId: string;
    bookingId: string;
    eventId: string;
    userId?: string;
    tierName: string;
    tier: TicketTier;
    seatId?: string;
    row?: string;
    seatNumber?: number;
    section?: string;
    qrCode: string;
    qrCodeImage?: string;
    isScanned: boolean;
    scannedAt?: Date | string;
    isExpired: boolean;
}
export interface Payment extends BaseDocument {
    bookingId: string;
    gateway: PaymentGateway;
    method?: PaymentMethod;
    status: PaymentStatus;
    amount: number;
    currency: SupportedCurrency;
    gatewayOrderId?: string;
    gatewayPaymentId?: string;
    gatewaySignature?: string;
    paidAt?: Date | string;
    failedAt?: Date | string;
    refundedAt?: Date | string;
    failureReason?: string;
    receiptUrl?: string;
    invoiceUrl?: string;
}
export interface Transaction extends BaseDocument {
    bookingId: string;
    paymentId: string;
    type: 'charge' | 'refund';
    amount: number;
    currency: SupportedCurrency;
    gateway: PaymentGateway;
    gatewayTransactionId: string;
    status: PaymentStatus;
    metadata?: Record<string, unknown>;
}
export interface Refund extends BaseDocument {
    bookingId: string;
    paymentId: string;
    amount: number;
    currency: SupportedCurrency;
    reason?: string;
    status: RefundStatus;
    processedAt?: Date | string;
    gatewayRefundId?: string;
    adminNotes?: string;
    requestedById?: string;
}
export interface Coupon extends BaseDocument {
    code: string;
    description?: string;
    discountType: 'percentage' | 'fixed';
    discountValue: number;
    maxDiscount?: number;
    minOrderAmount?: number;
    usageLimit: number;
    usedCount: number;
    isActive: boolean;
    validFrom: Date | string;
    validUntil: Date | string;
    applicableEventIds?: string[];
    applicableCategories?: EventCategory[];
}
export interface PopupCampaign extends BaseDocument {
    name: string;
    title: string;
    description?: string;
    image?: CloudinaryImage;
    ctaText?: string;
    ctaUrl?: string;
    trigger: PopupTrigger;
    triggerDelay?: number;
    cooldownHours: number;
    isActive: boolean;
    showOnPages?: string[];
    linkedEventId?: string;
    linkedEvent?: Event;
    startDate?: Date | string;
    endDate?: Date | string;
    priority: number;
}
export interface Notification extends BaseDocument {
    type: NotificationType;
    userId?: string;
    bookingId?: string;
    eventId?: string;
    channel: 'email' | 'sms' | 'push';
    recipient: string;
    subject?: string;
    body: string;
    isSent: boolean;
    sentAt?: Date | string;
    failureReason?: string;
    retryCount: number;
}
export interface Admin extends BaseDocument {
    name: string;
    email: string;
    role: AdminRole;
    isActive: boolean;
    lastLogin?: Date | string;
    permissions?: string[];
}
export interface EventAnalytics extends BaseDocument {
    eventId: string;
    date: Date | string;
    bookingsCount: number;
    ticketsSold: number;
    revenue: number;
    refundsCount: number;
    refundAmount: number;
    pageViews?: number;
}
export interface PaymentConfig extends BaseDocument {
    gateway: PaymentGateway;
    isEnabled: boolean;
    keyId?: string;
    webhookUrl?: string;
    supportedMethods: PaymentMethod[];
    currency: SupportedCurrency;
    platformCommissionPercent: number;
    convenienceFeeFixed: number;
    gstPercent: number;
}
export interface SocketEvents {
    'seat:lock': {
        eventId: string;
        seatIds: string[];
        sessionId: string;
    };
    'seat:unlock': {
        eventId: string;
        seatIds: string[];
        sessionId: string;
    };
    'booking:join': {
        bookingId: string;
    };
    'admin:join': {
        room: string;
    };
    'seat:locked': {
        seatIds: string[];
        sessionId: string;
    };
    'seat:unlocked': {
        seatIds: string[];
    };
    'seat:available': {
        seatIds: string[];
    };
    'booking:confirmed': {
        bookingId: string;
    };
    'inventory:updated': {
        eventId: string;
        availableCount: number;
    };
    'admin:analytics': Record<string, unknown>;
}
//# sourceMappingURL=index.d.ts.map
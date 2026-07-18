import { BookingStatus, TicketTier, EventCategory, BookingMode, EventStatus, PaymentStatus, EventMemoryPublicationState } from '@mad/shared';
export type ApiError = {
    message: string;
    statusCode?: number;
    code?: string;
    details?: unknown;
    errors?: Record<string, string[]>;
};
export type ImageAsset = {
    url?: string;
    publicId?: string;
    hash?: string;
    alt?: string;
};
export type TicketOfferRules = {
    discountType: 'percentage' | 'flat' | 'none';
    discountValue: number;
    minQtyRequired: number;
    buyQty?: number;
    freeTicketQty?: number;
};
export type TicketTierConfig = {
    tier: TicketTier;
    tierName?: string;
    name?: string;
    description?: string;
    price: number;
    discount?: number;
    quantity?: number;
    soldCount?: number;
    groupSize?: number;
    availabilityWindow?: {
        startDate?: string | Date;
        endDate?: string | Date;
    };
    groupId?: string;
    groupName?: string;
    isFree?: boolean;
    offerRules?: TicketOfferRules;
    isActive?: boolean;
};
export type TicketConfig = {
    tier: TicketTier;
    name: string;
    description?: string;
    price: number;
    isFree?: boolean;
    totalCapacity: number;
    minPerBooking?: number;
    maxPerBooking?: number;
    groupSize?: number;
    availabilityWindow?: {
        startDate?: string | Date;
        endDate?: string | Date;
    };
    offerRules?: TicketOfferRules;
    isActive?: boolean;
};
export type TicketGroup = {
    name: string;
    slug: string;
    description?: string;
    tickets: TicketConfig[];
};
export type TicketProfile = {
    _id: string;
    name: string;
    description?: string;
    groups: TicketGroup[];
    isActive: boolean;
    isDeleted: boolean;
    createdAt: string | Date;
    updatedAt: string | Date;
};
export type TicketOverride = {
    tier: TicketTier;
    price?: number;
    totalCapacity?: number;
    isActive?: boolean;
    maxPerBooking?: number;
    minPerBooking?: number;
};
export type EventMemoryConfig = {
    publicationState: EventMemoryPublicationState;
    heading?: string;
    thankYouMessage?: string;
    highlights?: string[];
    gallery: (ImageAsset & {
        order: number;
    })[];
    publishedAt?: string | Date;
};
export type Event = {
    _id: string;
    title: string;
    slug: string;
    description?: string;
    category: EventCategory;
    bookingMode?: BookingMode;
    status: EventStatus;
    doorsOpenTime?: string;
    showTime?: string;
    venue: string;
    startDate: string | Date;
    endDate?: string | Date;
    bannerImage?: ImageAsset;
    posterImage?: ImageAsset;
    galleryImages?: ImageAsset[];
    djOperatorIds?: string[];
    ticketTiers: TicketTierConfig[];
    isSoldOut?: boolean;
    highlights?: string[];
    refundPolicy?: string;
    organizerName?: string;
    ageRestriction?: number;
    requireTerms?: boolean;
    requireAgeConfirmation?: boolean;
    dresscode?: string;
    additionalInfo?: string;
    ticketProfileId?: string;
    ticketOverrides?: TicketOverride[];
    totalCapacity?: number;
    soldCount?: number;
    reservedCount?: number;
    ticketsSold?: number;
    ticketsCheckedIn?: number;
    ticketsRemaining?: number;
    attendancePercentage?: number;
    noShowCount?: number;
    noShowPercentage?: number;
    tags?: string[];
    showCountdown?: boolean;
    isEarlyBird?: boolean;
    earlyBirdDeadline?: string | Date;
    memories?: EventMemoryConfig | null;
    
    // Decoupled Status States
    lifecycle?: string;
    visibility?: {
        public: boolean;
        discoverable: boolean;
    };
    booking?: {
        status: string;
        reason: string;
    };
    gallery?: {
        status: 'NONE' | 'DRAFT' | 'PUBLISHED';
        itemCount: number;
    };
    capabilities?: {
        canBook: boolean;
        canViewGallery: boolean;
        canUploadGallery: boolean;
        canPublishGallery: boolean;
    };
};
export type Seat = {
    seatId: string;
    row: string;
    number: number;
    section?: string;
    status: string;
    tier: TicketTier;
    price: number;
    lockedBy?: string;
};
export type SeatLayout = {
    _id?: string;
    eventId?: string;
    seats: Seat[];
};
export type DJOperator = {
    _id: string;
    name: string;
    slug?: string;
    bio?: string;
    profileImage?: ImageAsset;
    specialties?: string[];
    galleryImages?: ImageAsset[];
    experienceYears?: number;
    socialLinks?: {
        platform: string;
        url: string;
    }[];
    isActive?: boolean;
    isDeleted?: boolean;
    createdAt?: string | Date;
    updatedAt?: string | Date;
    [key: string]: unknown;
};
export type Coupon = {
    _id: string;
    code: string;
    description?: string;
    discountType: 'percentage' | 'fixed';
    discountValue: number;
    minOrderAmount?: number;
    maxDiscount?: number;
    validFrom: string | Date;
    validUntil: string | Date;
    isActive: boolean;
    applicableEventIds?: string[];
    applicableCategories?: string[];
    usedCount?: number;
    usageLimit?: number;
    createdAt?: string | Date;
    updatedAt?: string | Date;
    [key: string]: unknown;
};
export type PopupCampaign = {
    _id: string;
    name?: string;
    title: string;
    description?: string;
    image?: ImageAsset;
    ctaUrl?: string;
    ctaText?: string;
    trigger: string;
    triggerDelay?: number;
    cooldownHours?: number;
    showOnPages?: string[];
    endDate?: string | Date;
    linkedEvent?: {
        showCountdown?: boolean;
        startDate?: string | Date;
        earlyBirdDeadline?: string | Date;
        title?: string;
        soldCount?: number;
        totalCapacity?: number;
    };
    priority?: number;
    isActive?: boolean;
    linkedEventId?: string;
    startDate?: string | Date;
    createdAt?: string | Date;
    updatedAt?: string | Date;
    [key: string]: unknown;
};
export type Admin = {
    _id: string;
    email: string;
    name?: string;
    firstName?: string;
    lastName?: string;
    role: string;
    isActive: boolean;
    lastLogin?: string | Date;
    createdAt?: string | Date;
    updatedAt?: string | Date;
    [key: string]: unknown;
};
export type Booking = {
    _id?: string;
    bookingId: string;
    eventId: string;
    userId?: string;
    guestName?: string;
    firstName?: string;
    lastName?: string;
    guestEmail?: string;
    guestPhone?: string;
    birthdate?: string | Date;
    keepUpdated?: boolean;
    sendBestEvents?: boolean;
    sessionId?: string;
    tickets: {
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
    }[];
    totalTickets: number;
    subtotal: number;
    convenienceFee: number;
    gst: number;
    discount: number;
    totalAmount: number;
    currency: string;
    couponCode?: string;
    couponId?: string;
    status: BookingStatus;
    paymentId?: string;
    reservationIds?: string[];
    bookingVersion: number;
    expiresAt?: string | Date;
    logicalExpiresAt?: string | Date;
    cancellationReason?: string;
    cancelledAt?: string | Date;
    createdAt?: string | Date;
    updatedAt?: string | Date;
};
export type Ticket = {
    _id?: string;
    ticketId: string;
    bookingId: string;
    eventId: string;
    userId?: string;
    tier: TicketTier;
    tierName: string;
    price: number;
    seatId?: string;
    row?: string;
    seatNumber?: number;
    section?: string;
    guestName?: string;
    guestEmail?: string;
    status: string;
    qrCodeImage: string;
    checkedInAt?: string | Date;
    checkedInBy?: string;
    createdAt?: string | Date;
    updatedAt?: string | Date;
};
export type Payment = {
    _id?: string;
    bookingId: string;
    gateway: 'stripe' | 'razorpay';
    status: PaymentStatus;
    amount: number;
    currency: string;
    couponId?: string;
    gatewayOrderId?: string;
    gatewayPaymentId?: string;
    gatewaySignature?: string;
    paidAt?: string | Date;
    failedAt?: string | Date;
    failureReason?: string;
    createdAt?: string | Date;
    updatedAt?: string | Date;
};
export type Notification = {
    _id?: string;
    userId?: string;
    guestEmail?: string;
    type: string;
    title?: string;
    body?: string;
    data?: Record<string, unknown>;
    status?: 'queued' | 'processing' | 'sent' | 'failed';
    jobId?: string;
    errorMessage?: string;
    queuedAt?: string | Date;
    processedAt?: string | Date;
    sentAt?: string | Date;
    channel: string;
    recipient?: string;
    subject?: string;
    isSent: boolean;
    retryCount: number;
    failureReason?: string;
    createdAt?: string | Date;
    updatedAt?: string | Date;
};
export type QueueJob = {
    id?: string;
    name: string;
    data: Record<string, unknown>;
    opts?: Record<string, unknown>;
};
export type DiagnosticsReport = {
    timestamp: string;
    database: {
        state: string;
        readyState: number;
        connectionsCount: number;
    };
    redis: {
        connected: boolean;
    };
    queues: {
        name: string;
        active: number;
        waiting: number;
        delayed: number;
        failed: number;
        completed: number;
        oldestWaitingJobAgeMs: number;
    }[];
    dlq: {
        totalFailedCount: number;
    };
};
export interface User {
    _id: string;
    email: string;
    name?: string;
    firstName?: string;
    lastName?: string;
    mobileNumber?: string;
    picture?: string;
    isActive: boolean;
    lastLogin?: string | Date;
    createdAt?: string | Date;
    updatedAt?: string | Date;
}
export interface AuthUser {
    userId: string;
    email?: string;
    phone?: string;
    name?: string;
    isGuest: boolean;
    picture?: string;
    firstName?: string;
    lastName?: string;
    mobileNumber?: string;
}
export interface PaginationMeta {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}
export interface PaginatedDataResponse<T> {
    data: T[];
    pagination: PaginationMeta;
}
export interface PaginatedItemsResponse<T> {
    items: T[];
    pagination: PaginationMeta;
}
export interface JwtPayload {
    exp?: number;
    iat?: number;
    sub?: string;
    iss?: string;
    aud?: string;
    [key: string]: unknown;
}
export interface BulkOperationResult {
    successCount: number;
    failedCount: number;
    results: {
        id: string;
        status: 'success' | 'failed';
        reason?: string;
    }[];
}
export interface BulkActionConfig<TId = string> {
    id: string;
    _unusedType?: TId;
    label: string;
    icon?: unknown;
    variant?: 'default' | 'destructive';
    disabled?: boolean;
    requireConfirmation?: boolean;
    confirmationMessage?: string;
    loadingLabel?: string;
    successLabel?: string;
    permission?: string;
    danger?: boolean;
}
export interface BulkActionResult {
    actionId: string;
    successCount: number;
    failedCount: number;
    results: {
        id: string;
        status: 'success' | 'failed';
        reason?: string;
    }[];
}
export interface BulkProgress {
    actionId: string;
    total: number;
    completed: number;
    failed: number;
}
export declare enum MediaType {
    IMAGE = "IMAGE",
    VIDEO = "VIDEO"
}
export declare enum MediaVisibility {
    PUBLIC = "PUBLIC",
    PRIVATE = "PRIVATE"
}
export interface EventGalleryItem {
    id: string;
    eventId: string;
    mediaType: MediaType;
    url: string;
    publicId: string;
    thumbnail?: string;
    caption?: string;
    sortOrder: number;
    isCover: boolean;
    visibility: MediaVisibility;
    uploadedBy?: string;
    assetProvider: string;
    assetVersion?: string;
    createdAt: string;
    updatedAt: string;
}
export interface EventGallerySettings {
    id: string;
    eventId: string;
    heading?: string;
    thankYouMessage?: string;
    highlights?: string[];
    published: boolean;
    publishedAt?: string;
    publishedBy?: string;
    createdAt: string;
    updatedAt: string;
}
//# sourceMappingURL=index.d.ts.map
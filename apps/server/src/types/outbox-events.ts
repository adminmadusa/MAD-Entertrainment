export type TicketIssueMode = "async_checkout" | "inline_issued";

export type SocketChannel = "event" | "booking" | "admin";

export interface BookingConfirmedPayload {
  readonly bookingId: string;
  readonly bookingReference: string;
  readonly eventId: string;
}

export interface PaymentCapturedPayload {
  readonly paymentId: string;
  readonly bookingId: string;
  readonly gateway: string;
  readonly paymentReference: string;
}

export interface PaymentFailedPayload {
  readonly bookingId: string;
  readonly bookingReference: string;
  readonly paymentId: string;
  readonly reason: string;
}

export interface InventoryReleasedPayload {
  readonly bookingId: string;
  readonly eventId: string;
  readonly seatIds: readonly string[];
  readonly reason: string;
}

export interface TicketsIssuedPayload {
  readonly bookingId: string;
  readonly mode: TicketIssueMode;
}

export interface NotificationRequestedPayload {
  readonly bookingId: string;
  readonly bookingReference: string;
  readonly eventId: string;
  readonly recipient: string;
  readonly subject: string;
  readonly body?: string;
}

export interface EmailRequestedPayload {
  readonly bookingId: string;
  readonly bookingReference: string;
}

export interface SocketEventPayload {
  readonly channel: SocketChannel;
  readonly room?: string;
  readonly event: string;
  readonly correlationId?: string;
  readonly data?: Readonly<Record<string, unknown>>;
}

export interface OutboxPayloadByType {
  readonly BOOKING_CONFIRMED: BookingConfirmedPayload;
  readonly PAYMENT_CAPTURED: PaymentCapturedPayload;
  readonly PAYMENT_FAILED: PaymentFailedPayload;
  readonly TICKETS_ISSUED: TicketsIssuedPayload;
  readonly INVENTORY_RELEASED: InventoryReleasedPayload;
  readonly NOTIFICATION_REQUESTED: NotificationRequestedPayload;
  readonly EMAIL_REQUESTED: EmailRequestedPayload;
  readonly SOCKET_EVENT: SocketEventPayload;
}

export type OutboxTypedEventType = keyof OutboxPayloadByType;

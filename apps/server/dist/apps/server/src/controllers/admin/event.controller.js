"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listEvents = listEvents;
exports.getEvent = getEvent;
exports.createEvent = createEvent;
exports.updateEvent = updateEvent;
exports.deleteEvent = deleteEvent;
exports.toggleFeatured = toggleFeatured;
exports.updateEventStatus = updateEventStatus;
const cloudinary_1 = require("cloudinary");
const slugify_1 = __importDefault(require("slugify"));
const error_middleware_1 = require("../../middleware/error.middleware");
const event_schema_1 = require("../../models/event.schema");
const venue_schema_1 = require("../../models/venue.schema");
const logger_1 = require("../../utils/logger");
const response_1 = require("../../utils/response");
// ─── List Events ──────────────────────────────────────────────
// GET /api/admin/events?page=1&limit=12&status=draft&category=concert&search=
async function listEvents(req, res) {
    const { page, limit, skip } = (0, response_1.parsePaginationParams)(req.query);
    const { status, category, search, featured } = req.query;
    const filter = {};
    if (status)
        filter['status'] = status;
    if (category)
        filter['category'] = category;
    if (featured === 'true')
        filter['isFeatured'] = true;
    if (search) {
        filter['$or'] = [
            { title: { $regex: search, $options: 'i' } },
            { tags: { $regex: search, $options: 'i' } },
        ];
    }
    const [events, total] = await Promise.all([
        event_schema_1.Event.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate('venueId', 'name city')
            .select('-__v'),
        event_schema_1.Event.countDocuments(filter),
    ]);
    (0, response_1.sendPaginated)(res, events, (0, response_1.buildPaginationMeta)(total, page, limit));
}
// ─── Get Single Event ─────────────────────────────────────────
// GET /api/admin/events/:id
async function getEvent(req, res) {
    const event = await event_schema_1.Event.findById(req.params.id)
        .populate('venueId', 'name city address')
        .populate('artistIds', 'name genre profileImage')
        .populate('djOperatorIds', 'stageName genres profileImage');
    if (!event)
        throw error_middleware_1.AppError.notFound('Event');
    (0, response_1.sendSuccess)(res, event);
}
function mapToMongoosePayload(body, createdBy) {
    const payload = {
        ...body,
    };
    if (body.ticketTiers) {
        payload.ticketTiers = body.ticketTiers.map((t) => ({
            tier: t.name,
            name: t.name, // Keep both for maximum safety
            price: Number(t.price),
            totalCapacity: Number(t.capacity),
            soldCount: t.soldCount ?? 0,
            description: t.description,
            isActive: t.isAvailable ?? true,
        }));
        const totalCapacity = body.ticketTiers.reduce((sum, t) => sum + Number(t.capacity), 0);
        payload.totalCapacity = totalCapacity;
        payload.availableCapacity = totalCapacity;
    }
    // Map coverImage to bannerImage
    if (body.coverImage) {
        payload.bannerImage = {
            url: body.coverImage.url,
            publicId: body.coverImage.publicId,
        };
        delete payload.coverImage;
    }
    else if (body.coverImage === null) {
        payload.bannerImage = null;
        delete payload.coverImage;
    }
    // Map mode to bookingMode
    if (body.mode) {
        payload.bookingMode = 'general_admission';
        delete payload.mode;
    }
    // Map age restrictions
    if (body.isAgeRestricted && body.minimumAge !== undefined) {
        payload.ageRestriction = body.minimumAge;
    }
    delete payload.isAgeRestricted;
    delete payload.minimumAge;
    if (createdBy) {
        payload.createdBy = createdBy;
    }
    return payload;
}
// ─── Create Event ─────────────────────────────────────────────
// POST /api/admin/events
async function createEvent(req, res) {
    const body = req.body;
    // Auto-generate slug if not provided
    const slug = body.slug ?? (0, slugify_1.default)(body.title, { lower: true, strict: true });
    // Check slug uniqueness
    const existing = await event_schema_1.Event.findOne({ slug });
    if (existing) {
        throw error_middleware_1.AppError.conflict(`Slug "${slug}" is already in use. Provide a unique slug.`);
    }
    // Look up default venue if missing
    let finalVenueId = body.venueId;
    if (!finalVenueId) {
        const defaultVenue = await venue_schema_1.Venue.findOne({});
        if (defaultVenue) {
            finalVenueId = defaultVenue._id.toString();
        }
        else {
            finalVenueId = '60d5f15b1c8f8b2d4c8e4e8a'; // Dummy fallback
        }
    }
    const mappedPayload = mapToMongoosePayload(body, req.admin?.adminId);
    mappedPayload.slug = slug;
    mappedPayload.venueId = finalVenueId;
    // Default missing Mongoose requirements
    if (!mappedPayload.showTime)
        mappedPayload.showTime = '20:00';
    if (!mappedPayload.bookingMode)
        mappedPayload.bookingMode = 'general_admission';
    if (!mappedPayload.bannerImage) {
        mappedPayload.bannerImage = {
            url: 'https://res.cloudinary.com/placeholder.jpg',
            publicId: 'placeholder',
        };
    }
    const event = await event_schema_1.Event.create(mappedPayload);
    logger_1.logger.info({ eventId: event._id, slug }, 'Admin created event');
    (0, response_1.sendCreated)(res, event, 'Event created successfully');
}
// ─── Update Event ─────────────────────────────────────────────
// PUT /api/admin/events/:id
async function updateEvent(req, res) {
    const body = req.body;
    const event = await event_schema_1.Event.findById(req.params.id);
    if (!event)
        throw error_middleware_1.AppError.notFound('Event');
    // If replacing coverImage (mapped to bannerImage), delete old one from Cloudinary
    const eventObj = event.toObject();
    const existingCover = eventObj['bannerImage'];
    if (body.coverImage && existingCover?.publicId &&
        body.coverImage.publicId !== existingCover.publicId) {
        await cloudinary_1.v2.uploader.destroy(existingCover.publicId).catch(() => {
            logger_1.logger.warn({ publicId: existingCover?.publicId }, 'Failed to delete old banner image');
        });
    }
    // If slug changes, check uniqueness
    if (body.slug && body.slug !== event.slug) {
        const existing = await event_schema_1.Event.findOne({ slug: body.slug, _id: { $ne: event._id } });
        if (existing)
            throw error_middleware_1.AppError.conflict(`Slug "${body.slug}" is already in use.`);
    }
    const payload = mapToMongoosePayload(body);
    // Clean payload by removing undefined properties so we don't overwrite with undefined
    Object.keys(payload).forEach((key) => {
        if (payload[key] === undefined) {
            delete payload[key];
        }
    });
    Object.assign(event, payload);
    await event.save();
    logger_1.logger.info({ eventId: event._id }, 'Admin updated event');
    (0, response_1.sendSuccess)(res, event, 'Event updated successfully');
}
// ─── Delete Event ─────────────────────────────────────────────
// DELETE /api/admin/events/:id
async function deleteEvent(req, res) {
    const event = await event_schema_1.Event.findById(req.params.id);
    if (!event)
        throw error_middleware_1.AppError.notFound('Event');
    // Cleanup Cloudinary images
    const publicIds = [];
    const eventData = event.toObject();
    const cover = eventData['bannerImage'];
    const gallery = eventData['galleryImages'];
    if (cover?.publicId)
        publicIds.push(cover.publicId);
    if (gallery?.length) {
        gallery.forEach((g) => { if (g.publicId)
            publicIds.push(g.publicId); });
    }
    if (publicIds.length > 0) {
        await cloudinary_1.v2.api.delete_resources(publicIds).catch(() => {
            logger_1.logger.warn({ publicIds }, 'Failed to delete some Cloudinary images on event delete');
        });
    }
    await event_schema_1.Event.deleteOne({ _id: event._id });
    logger_1.logger.info({ eventId: req.params.id }, 'Admin deleted event');
    (0, response_1.sendSuccess)(res, null, 'Event deleted successfully');
}
// ─── Toggle Featured ──────────────────────────────────────────
// PATCH /api/admin/events/:id/featured
async function toggleFeatured(req, res) {
    const event = await event_schema_1.Event.findById(req.params.id);
    if (!event)
        throw error_middleware_1.AppError.notFound('Event');
    event.isFeatured = !event.isFeatured;
    await event.save();
    (0, response_1.sendSuccess)(res, { isFeatured: event.isFeatured }, `Event ${event.isFeatured ? 'featured' : 'unfeatured'}`);
}
// ─── Update Status ────────────────────────────────────────────
// PATCH /api/admin/events/:id/status
async function updateEventStatus(req, res) {
    const { status } = req.body;
    const validStatuses = ['draft', 'published', 'cancelled', 'sold_out', 'completed'];
    if (!status || !validStatuses.includes(status)) {
        throw error_middleware_1.AppError.badRequest(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }
    const event = await event_schema_1.Event.findByIdAndUpdate(req.params.id, { status }, { new: true, runValidators: true });
    if (!event)
        throw error_middleware_1.AppError.notFound('Event');
    (0, response_1.sendSuccess)(res, { status: event.status }, `Event status updated to "${status}"`);
}
//# sourceMappingURL=event.controller.js.map
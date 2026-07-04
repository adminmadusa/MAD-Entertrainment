# Booking Audit Workflow

1. **Locate Booking Updates**: Scans service files for save/update queries affecting seats/bookings models.
2. **Verify Mongoose Session**: Checks if query options include `{ session }` blocks.
3. **Trace Transaction Wrapper**: Checks if operations are wrapped inside a session helper.
4. **Log violations**: Emits findings for raw multi-collection writes.

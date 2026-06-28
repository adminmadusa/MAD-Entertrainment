# Booking Audit Examples

* **Violation missing session example**:
  - Code:
    ```ts
    await Booking.findByIdAndUpdate(bookingId, { status: 'confirmed' });
    await Seat.updateMany({ id: seatIds }, { status: 'locked' }); // session option omitted
    ```
  - Finding output: ruleId `VAL-DB-001`, severity `HIGH`, message: "Seat updates do not specify transactional session options."

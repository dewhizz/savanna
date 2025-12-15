$(document).ready(function () {
    loadBookings();

    function loadBookings() {
        $.ajax({
            url: 'http://localhost:3000/api/bookings',
            method: 'GET',
            success: function (response) {
                const bookings = response.bookings;
                const tableBody = $('#bookings-table-body');
                tableBody.empty();

                if (bookings.length === 0) {
                    tableBody.append('<tr><td colspan="7" class="text-center">No bookings found</td></tr>');
                    return;
                }

                bookings.forEach(booking => {
                    let actionButtons = '';
                    if (booking.status === 'pending') {
                        actionButtons = `
                            <button class="btn btn-success btn-sm btn-approve" data-id="${booking.id}">Approve</button>
                            <button class="btn btn-danger btn-sm btn-decline" data-id="${booking.id}">Decline</button>
                        `;
                    } else {
                        actionButtons = '<span class="text-muted">-</span>';
                    }

                    const row = `
                        <tr>
                            <td>#${booking.id}</td>
                            <td>
                                <strong>${booking.name}</strong><br>
                                <small class="text-muted">${booking.message || 'No special requests'}</small>
                            </td>
                            <td>${booking.date} at ${booking.time}</td>
                            <td>${booking.guests}</td>
                            <td>
                                ${booking.email}<br>
                                ${booking.phone}
                            </td>
                            <td><span class="status-${booking.status}">${booking.status.toUpperCase()}</span></td>
                            <td>${actionButtons}</td>
                        </tr>
                    `;
                    tableBody.append(row);
                });
            },
            error: function (err) {
                console.error('Error fetching bookings:', err);
                alert('Failed to load bookings');
            }
        });
    }

    // Handle Approve Click
    $(document).on('click', '.btn-approve', function () {
        const id = $(this).data('id');
        updateStatus(id, 'confirmed');
    });

    // Handle Decline Click
    $(document).on('click', '.btn-decline', function () {
        const id = $(this).data('id');
        updateStatus(id, 'cancelled');
    });

    function updateStatus(id, newStatus) {
        if (!confirm(`Are you sure you want to mark this booking as ${newStatus}?`)) return;

        $.ajax({
            url: `http://localhost:3000/api/bookings/${id}/status`,
            method: 'PUT',
            contentType: 'application/json',
            data: JSON.stringify({ status: newStatus }),
            success: function (response) {
                alert(`Booking ${newStatus}! Email notification sent.`);
                loadBookings(); // Refresh the table
            },
            error: function (xhr) {
                console.error(xhr);
                alert('Error updating status');
            }
        });
    }
});

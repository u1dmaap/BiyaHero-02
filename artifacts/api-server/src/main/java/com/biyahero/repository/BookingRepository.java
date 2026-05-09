package com.biyahero.repository;

import com.biyahero.model.Booking;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

import java.sql.PreparedStatement;
import java.sql.Statement;
import java.sql.Timestamp;
import java.util.List;
import java.util.Optional;

@Repository
public class BookingRepository {

    private final JdbcTemplate jdbc;

    public BookingRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    private final RowMapper<Booking> mapper = (rs, row) -> {
        Booking b = new Booking();
        b.setId(rs.getInt("id"));
        b.setUserId(rs.getInt("user_id"));
        b.setScheduleId(rs.getInt("schedule_id"));
        b.setSeatCount(rs.getInt("seat_count"));
        b.setPassengerName(rs.getString("passenger_name"));
        b.setPassengerPhone(rs.getString("passenger_phone"));
        b.setTotalFare(rs.getDouble("total_fare"));
        b.setStatus(rs.getString("status"));
        b.setPaymentMethod(rs.getString("payment_method"));
        b.setPaymentStatus(rs.getString("payment_status"));
        Timestamp ts = rs.getTimestamp("created_at");
        if (ts != null) b.setCreatedAt(ts.toInstant().atOffset(java.time.ZoneOffset.UTC));
        return b;
    };

    public Optional<Booking> findById(int id) {
        List<Booking> list = jdbc.query("SELECT * FROM bookings WHERE id = ?", mapper, id);
        return list.isEmpty() ? Optional.empty() : Optional.of(list.get(0));
    }

    public List<Booking> findByUserId(int userId) {
        return jdbc.query("SELECT * FROM bookings WHERE user_id = ? ORDER BY created_at DESC", mapper, userId);
    }

    public List<Booking> findByUserIdAndStatus(int userId, String status) {
        return jdbc.query("SELECT * FROM bookings WHERE user_id = ? AND status = ? ORDER BY created_at DESC", mapper, userId, status);
    }

    public Booking insert(int userId, int scheduleId, int seatCount, String passengerName, String passengerPhone, double totalFare) {
        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbc.update(con -> {
            PreparedStatement ps = con.prepareStatement(
                "INSERT INTO bookings (user_id, schedule_id, seat_count, passenger_name, passenger_phone, total_fare, status, payment_status) VALUES (?, ?, ?, ?, ?, ?, 'pending', 'unpaid') RETURNING id",
                Statement.RETURN_GENERATED_KEYS);
            ps.setInt(1, userId);
            ps.setInt(2, scheduleId);
            ps.setInt(3, seatCount);
            ps.setString(4, passengerName);
            if (passengerPhone != null) ps.setString(5, passengerPhone);
            else ps.setNull(5, java.sql.Types.VARCHAR);
            ps.setDouble(6, totalFare);
            return ps;
        }, keyHolder);
        int id = ((Number) keyHolder.getKeys().get("id")).intValue();
        return findById(id).orElseThrow();
    }

    public Optional<Booking> cancelIfOwned(int bookingId, int userId) {
        int updated = jdbc.update(
            "UPDATE bookings SET status = 'cancelled' WHERE id = ? AND user_id = ? AND status IN ('pending', 'confirmed')",
            bookingId, userId);
        return updated > 0 ? findById(bookingId) : Optional.empty();
    }

    public Optional<Booking> pay(int bookingId, int userId, String method) {
        int updated = jdbc.update(
            "UPDATE bookings SET payment_method = ?, payment_status = 'paid', status = 'confirmed' WHERE id = ? AND user_id = ? AND payment_status = 'unpaid'",
            method, bookingId, userId);
        return updated > 0 ? findById(bookingId) : Optional.empty();
    }

    public Optional<Booking> updateStatus(int bookingId, String status) {
        jdbc.update("UPDATE bookings SET status = ? WHERE id = ?", status, bookingId);
        return findById(bookingId);
    }

    public List<Booking> findByScheduleVehicleAndStatus(int vehicleId, List<String> statuses) {
        String placeholders = String.join(",", statuses.stream().map(s -> "?").toList());
        String sql = """
            SELECT b.* FROM bookings b
            INNER JOIN schedules s ON b.schedule_id = s.id
            WHERE s.vehicle_id = ? AND b.status IN (%s)
            ORDER BY b.created_at DESC LIMIT 10
            """.formatted(placeholders);
        Object[] params = new Object[1 + statuses.size()];
        params[0] = vehicleId;
        for (int i = 0; i < statuses.size(); i++) params[i + 1] = statuses.get(i);
        return jdbc.query(sql, mapper, params);
    }

    public List<Booking> findPendingByVehicle(int vehicleId) {
        return jdbc.query("""
            SELECT b.* FROM bookings b
            INNER JOIN schedules s ON b.schedule_id = s.id
            WHERE s.vehicle_id = ? AND b.status = 'pending'
            ORDER BY b.created_at DESC
            """, mapper, vehicleId);
    }
}

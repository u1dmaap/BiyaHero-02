package com.biyahero.repository;

import com.biyahero.model.CustomTrip;
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
public class CustomTripRepository {

    private final JdbcTemplate jdbc;

    public CustomTripRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    private final RowMapper<CustomTrip> mapper = (rs, row) -> {
        CustomTrip t = new CustomTrip();
        t.setId(rs.getInt("id"));
        t.setUserId(rs.getInt("user_id"));
        t.setVehicleId(rs.getInt("vehicle_id"));
        t.setPickupLat(rs.getDouble("pickup_lat"));
        t.setPickupLng(rs.getDouble("pickup_lng"));
        t.setPickupLabel(rs.getString("pickup_label"));
        t.setDropoffLat(rs.getDouble("dropoff_lat"));
        t.setDropoffLng(rs.getDouble("dropoff_lng"));
        t.setDropoffLabel(rs.getString("dropoff_label"));
        t.setRequestedTime(rs.getString("requested_time"));
        t.setPassengerName(rs.getString("passenger_name"));
        t.setPassengerPhone(rs.getString("passenger_phone"));
        t.setSeatCount(rs.getInt("seat_count"));
        t.setStatus(rs.getString("status"));
        t.setNotes(rs.getString("notes"));
        int rating = rs.getInt("rating");
        t.setRating(rs.wasNull() ? null : rating);
        t.setRatingComment(rs.getString("rating_comment"));
        t.setPaymentMethod(rs.getString("payment_method"));
        Timestamp ts = rs.getTimestamp("created_at");
        if (ts != null) t.setCreatedAt(ts.toInstant().atOffset(java.time.ZoneOffset.UTC));
        return t;
    };

    public Optional<CustomTrip> findById(int id) {
        List<CustomTrip> list = jdbc.query("SELECT * FROM custom_trips WHERE id = ?", mapper, id);
        return list.isEmpty() ? Optional.empty() : Optional.of(list.get(0));
    }

    public List<CustomTrip> findByUserId(int userId) {
        return jdbc.query("SELECT * FROM custom_trips WHERE user_id = ? ORDER BY created_at DESC", mapper, userId);
    }

    public List<CustomTrip> findByVehicleIdAndStatus(int vehicleId, String status) {
        return jdbc.query("SELECT * FROM custom_trips WHERE vehicle_id = ? AND status = ? ORDER BY created_at DESC", mapper, vehicleId, status);
    }

    public List<CustomTrip> findByVehicleId(int vehicleId) {
        return jdbc.query("SELECT * FROM custom_trips WHERE vehicle_id = ? ORDER BY created_at DESC", mapper, vehicleId);
    }

    public CustomTrip insert(int userId, int vehicleId, double pickupLat, double pickupLng, String pickupLabel,
                              double dropoffLat, double dropoffLng, String dropoffLabel,
                              String requestedTime, String passengerName, String passengerPhone,
                              int seatCount, String notes, String paymentMethod) {
        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbc.update(con -> {
            PreparedStatement ps = con.prepareStatement(
                """
                INSERT INTO custom_trips
                  (user_id, vehicle_id, pickup_lat, pickup_lng, pickup_label,
                   dropoff_lat, dropoff_lng, dropoff_label, requested_time,
                   passenger_name, passenger_phone, seat_count, status, notes, payment_method)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?) RETURNING id
                """,
                Statement.RETURN_GENERATED_KEYS);
            ps.setInt(1, userId);
            ps.setInt(2, vehicleId);
            ps.setDouble(3, pickupLat);
            ps.setDouble(4, pickupLng);
            ps.setString(5, pickupLabel);
            ps.setDouble(6, dropoffLat);
            ps.setDouble(7, dropoffLng);
            ps.setString(8, dropoffLabel);
            ps.setString(9, requestedTime);
            ps.setString(10, passengerName);
            if (passengerPhone != null) ps.setString(11, passengerPhone);
            else ps.setNull(11, java.sql.Types.VARCHAR);
            ps.setInt(12, seatCount);
            if (notes != null) ps.setString(13, notes);
            else ps.setNull(13, java.sql.Types.VARCHAR);
            ps.setString(14, paymentMethod != null ? paymentMethod : "cash");
            return ps;
        }, keyHolder);
        int id = ((Number) keyHolder.getKeys().get("id")).intValue();
        return findById(id).orElseThrow();
    }

    public Optional<CustomTrip> updateStatus(int id, String status) {
        jdbc.update("UPDATE custom_trips SET status = ? WHERE id = ?", status, id);
        return findById(id);
    }

    public Optional<CustomTrip> rate(int id, int userId, int rating, String comment) {
        jdbc.update("UPDATE custom_trips SET rating = ?, rating_comment = ? WHERE id = ? AND user_id = ?",
            rating, comment, id, userId);
        return findById(id);
    }
}

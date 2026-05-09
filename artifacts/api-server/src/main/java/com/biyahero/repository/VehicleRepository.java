package com.biyahero.repository;

import com.biyahero.model.Vehicle;
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
public class VehicleRepository {

    private final JdbcTemplate jdbc;

    public VehicleRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    private final RowMapper<Vehicle> mapper = (rs, row) -> {
        Vehicle v = new Vehicle();
        v.setId(rs.getInt("id"));
        v.setType(rs.getString("type"));
        v.setPlateNumber(rs.getString("plate_number"));
        v.setOperator(rs.getString("operator"));
        v.setCapacity(rs.getInt("capacity"));
        v.setStatus(rs.getString("status"));
        v.setCurrentLat(rs.getDouble("current_lat"));
        v.setCurrentLng(rs.getDouble("current_lng"));
        int rid = rs.getInt("route_id");
        v.setRouteId(rs.wasNull() ? null : rid);
        v.setCurrentPassengers(rs.getInt("current_passengers"));
        v.setDriverStatus(rs.getString("driver_status"));
        Timestamp ts = rs.getTimestamp("created_at");
        if (ts != null) v.setCreatedAt(ts.toInstant().atOffset(java.time.ZoneOffset.UTC));
        return v;
    };

    public Optional<Vehicle> findById(int id) {
        List<Vehicle> list = jdbc.query("SELECT * FROM vehicles WHERE id = ?", mapper, id);
        return list.isEmpty() ? Optional.empty() : Optional.of(list.get(0));
    }

    public Optional<Vehicle> findByPlateNumber(String plateNumber) {
        List<Vehicle> list = jdbc.query("SELECT * FROM vehicles WHERE plate_number = ?", mapper, plateNumber);
        return list.isEmpty() ? Optional.empty() : Optional.of(list.get(0));
    }

    public List<Vehicle> findAll() {
        return jdbc.query("SELECT * FROM vehicles", mapper);
    }

    public Vehicle insert(String type, String plateNumber, String operator, int capacity, String status, String driverStatus, int currentPassengers) {
        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbc.update(con -> {
            PreparedStatement ps = con.prepareStatement(
                "INSERT INTO vehicles (type, plate_number, operator, capacity, status, driver_status, current_passengers) VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id",
                Statement.RETURN_GENERATED_KEYS);
            ps.setString(1, type);
            ps.setString(2, plateNumber);
            ps.setString(3, operator);
            ps.setInt(4, capacity);
            ps.setString(5, status);
            ps.setString(6, driverStatus);
            ps.setInt(7, currentPassengers);
            return ps;
        }, keyHolder);
        int id = ((Number) keyHolder.getKeys().get("id")).intValue();
        return findById(id).orElseThrow();
    }

    public Optional<Vehicle> updateStatus(int id, String driverStatus, String status, Double lat, Double lng) {
        StringBuilder sql = new StringBuilder("UPDATE vehicles SET ");
        java.util.List<Object> params = new java.util.ArrayList<>();
        if (driverStatus != null) { sql.append("driver_status = ?, "); params.add(driverStatus); }
        if (status != null) { sql.append("status = ?, "); params.add(status); }
        if (lat != null) { sql.append("current_lat = ?, "); params.add(lat); }
        if (lng != null) { sql.append("current_lng = ?, "); params.add(lng); }
        if (params.isEmpty()) return findById(id);
        String q = sql.toString().replaceAll(", $", "") + " WHERE id = ?";
        params.add(id);
        jdbc.update(q, params.toArray());
        return findById(id);
    }

    public Optional<Vehicle> updatePassengers(int id, int currentPassengers) {
        jdbc.update("UPDATE vehicles SET current_passengers = ? WHERE id = ?", currentPassengers, id);
        return findById(id);
    }
}

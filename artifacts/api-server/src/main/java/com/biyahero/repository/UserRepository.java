package com.biyahero.repository;

import com.biyahero.model.User;
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
public class UserRepository {

    private final JdbcTemplate jdbc;

    public UserRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    private final RowMapper<User> mapper = (rs, row) -> {
        User u = new User();
        u.setId(rs.getInt("id"));
        u.setName(rs.getString("name"));
        u.setEmail(rs.getString("email"));
        u.setPasswordHash(rs.getString("password_hash"));
        u.setRole(rs.getString("role"));
        int vid = rs.getInt("driver_vehicle_id");
        u.setDriverVehicleId(rs.wasNull() ? null : vid);
        Timestamp ts = rs.getTimestamp("created_at");
        if (ts != null) u.setCreatedAt(ts.toInstant().atOffset(java.time.ZoneOffset.UTC));
        return u;
    };

    public Optional<User> findById(int id) {
        List<User> list = jdbc.query("SELECT * FROM users WHERE id = ?", mapper, id);
        return list.isEmpty() ? Optional.empty() : Optional.of(list.get(0));
    }

    public Optional<User> findByEmail(String email) {
        List<User> list = jdbc.query("SELECT * FROM users WHERE email = ?", mapper, email);
        return list.isEmpty() ? Optional.empty() : Optional.of(list.get(0));
    }

    public User insert(String name, String email, String passwordHash, String role, Integer driverVehicleId) {
        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbc.update(con -> {
            PreparedStatement ps = con.prepareStatement(
                "INSERT INTO users (name, email, password_hash, role, driver_vehicle_id) VALUES (?, ?, ?, ?, ?) RETURNING id",
                Statement.RETURN_GENERATED_KEYS);
            ps.setString(1, name);
            ps.setString(2, email);
            ps.setString(3, passwordHash);
            ps.setString(4, role);
            if (driverVehicleId != null) ps.setInt(5, driverVehicleId);
            else ps.setNull(5, java.sql.Types.INTEGER);
            return ps;
        }, keyHolder);
        int id = ((Number) keyHolder.getKeys().get("id")).intValue();
        return findById(id).orElseThrow();
    }
}

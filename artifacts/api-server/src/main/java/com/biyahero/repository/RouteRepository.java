package com.biyahero.repository;

import com.biyahero.model.Route;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.sql.Array;
import java.sql.Timestamp;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

@Repository
public class RouteRepository {

    private final JdbcTemplate jdbc;

    public RouteRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    private final RowMapper<Route> mapper = (rs, row) -> {
        Route r = new Route();
        r.setId(rs.getInt("id"));
        r.setName(rs.getString("name"));
        r.setOrigin(rs.getString("origin"));
        r.setDestination(rs.getString("destination"));
        r.setDistanceKm(rs.getDouble("distance_km"));
        r.setEstimatedMinutes(rs.getInt("estimated_minutes"));
        Array arr = rs.getArray("vehicle_types");
        if (arr != null) {
            r.setVehicleTypes(Arrays.asList((String[]) arr.getArray()));
        } else {
            r.setVehicleTypes(List.of());
        }
        Timestamp ts = rs.getTimestamp("created_at");
        if (ts != null) r.setCreatedAt(ts.toInstant().atOffset(java.time.ZoneOffset.UTC));
        return r;
    };

    public List<Route> findAll() {
        return jdbc.query("SELECT * FROM routes ORDER BY id", mapper);
    }

    public Optional<Route> findById(int id) {
        List<Route> list = jdbc.query("SELECT * FROM routes WHERE id = ?", mapper, id);
        return list.isEmpty() ? Optional.empty() : Optional.of(list.get(0));
    }
}

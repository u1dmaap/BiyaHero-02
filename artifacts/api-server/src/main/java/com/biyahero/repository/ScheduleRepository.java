package com.biyahero.repository;

import com.biyahero.model.Schedule;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Timestamp;
import java.util.List;
import java.util.Optional;

@Repository
public class ScheduleRepository {

    private final JdbcTemplate jdbc;

    public ScheduleRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    private final RowMapper<Schedule> mapper = (rs, row) -> {
        Schedule s = new Schedule();
        s.setId(rs.getInt("id"));
        s.setRouteId(rs.getInt("route_id"));
        s.setVehicleId(rs.getInt("vehicle_id"));
        Timestamp dep = rs.getTimestamp("departure_time");
        if (dep != null) s.setDepartureTime(dep.toInstant().atOffset(java.time.ZoneOffset.UTC));
        Timestamp arr = rs.getTimestamp("estimated_arrival_time");
        if (arr != null) s.setEstimatedArrivalTime(arr.toInstant().atOffset(java.time.ZoneOffset.UTC));
        s.setAvailableSeats(rs.getInt("available_seats"));
        s.setFare(rs.getDouble("fare"));
        s.setDate(rs.getString("date"));
        Timestamp ts = rs.getTimestamp("created_at");
        if (ts != null) s.setCreatedAt(ts.toInstant().atOffset(java.time.ZoneOffset.UTC));
        return s;
    };

    public List<Schedule> findAll() {
        return jdbc.query("SELECT * FROM schedules ORDER BY departure_time", mapper);
    }

    public Optional<Schedule> findById(int id) {
        List<Schedule> list = jdbc.query("SELECT * FROM schedules WHERE id = ?", mapper, id);
        return list.isEmpty() ? Optional.empty() : Optional.of(list.get(0));
    }

    @Transactional
    public boolean decrementSeats(int scheduleId, int seatCount) {
        int updated = jdbc.update(
            "UPDATE schedules SET available_seats = available_seats - ? WHERE id = ? AND available_seats >= ?",
            seatCount, scheduleId, seatCount);
        return updated > 0;
    }

    @Transactional
    public void restoreSeats(int scheduleId, int seatCount) {
        jdbc.update("UPDATE schedules SET available_seats = available_seats + ? WHERE id = ?", seatCount, scheduleId);
    }
}

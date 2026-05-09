package com.biyahero.repository;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class PaymentRepository {

    private final JdbcTemplate jdbc;

    public PaymentRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public void insert(int bookingId, int userId, double amount, String method, String transactionId) {
        jdbc.update(
            "INSERT INTO payments (booking_id, user_id, amount, method, status, transaction_id) VALUES (?, ?, ?, ?, 'completed', ?)",
            bookingId, userId, amount, method, transactionId);
    }
}

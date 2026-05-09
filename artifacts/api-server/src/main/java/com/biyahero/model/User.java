package com.biyahero.model;

import java.time.OffsetDateTime;

public class User {
    private int id;
    private String name;
    private String email;
    private String passwordHash;
    private String role;
    private Integer driverVehicleId;
    private OffsetDateTime createdAt;

    public int getId() { return id; }
    public void setId(int id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getPasswordHash() { return passwordHash; }
    public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }
    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }
    public Integer getDriverVehicleId() { return driverVehicleId; }
    public void setDriverVehicleId(Integer driverVehicleId) { this.driverVehicleId = driverVehicleId; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
}

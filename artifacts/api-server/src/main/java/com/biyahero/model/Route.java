package com.biyahero.model;

import java.time.OffsetDateTime;
import java.util.List;

public class Route {
    private int id;
    private String name;
    private String origin;
    private String destination;
    private double distanceKm;
    private int estimatedMinutes;
    private List<String> vehicleTypes;
    private OffsetDateTime createdAt;

    public int getId() { return id; }
    public void setId(int id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getOrigin() { return origin; }
    public void setOrigin(String origin) { this.origin = origin; }
    public String getDestination() { return destination; }
    public void setDestination(String destination) { this.destination = destination; }
    public double getDistanceKm() { return distanceKm; }
    public void setDistanceKm(double distanceKm) { this.distanceKm = distanceKm; }
    public int getEstimatedMinutes() { return estimatedMinutes; }
    public void setEstimatedMinutes(int estimatedMinutes) { this.estimatedMinutes = estimatedMinutes; }
    public List<String> getVehicleTypes() { return vehicleTypes; }
    public void setVehicleTypes(List<String> vehicleTypes) { this.vehicleTypes = vehicleTypes; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
}

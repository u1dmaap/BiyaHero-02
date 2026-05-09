package com.biyahero.model;

import java.time.OffsetDateTime;

public class Schedule {
    private int id;
    private int routeId;
    private int vehicleId;
    private OffsetDateTime departureTime;
    private OffsetDateTime estimatedArrivalTime;
    private int availableSeats;
    private double fare;
    private String date;
    private OffsetDateTime createdAt;

    public int getId() { return id; }
    public void setId(int id) { this.id = id; }
    public int getRouteId() { return routeId; }
    public void setRouteId(int routeId) { this.routeId = routeId; }
    public int getVehicleId() { return vehicleId; }
    public void setVehicleId(int vehicleId) { this.vehicleId = vehicleId; }
    public OffsetDateTime getDepartureTime() { return departureTime; }
    public void setDepartureTime(OffsetDateTime departureTime) { this.departureTime = departureTime; }
    public OffsetDateTime getEstimatedArrivalTime() { return estimatedArrivalTime; }
    public void setEstimatedArrivalTime(OffsetDateTime estimatedArrivalTime) { this.estimatedArrivalTime = estimatedArrivalTime; }
    public int getAvailableSeats() { return availableSeats; }
    public void setAvailableSeats(int availableSeats) { this.availableSeats = availableSeats; }
    public double getFare() { return fare; }
    public void setFare(double fare) { this.fare = fare; }
    public String getDate() { return date; }
    public void setDate(String date) { this.date = date; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
}

package com.biyahero.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api")
public class HealthController {

    @GetMapping("/healthz")
    public ResponseEntity<Object> health() {
        return ResponseEntity.ok(Map.of("status", "ok"));
    }
}

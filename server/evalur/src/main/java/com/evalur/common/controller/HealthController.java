package com.evalur.common.controller;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ResponseBody;

@Controller
@ResponseBody
public class HealthController {

    @GetMapping({"/health/ping", "/api/v1/health/ping", "/health", "/api/v1/health"})
    public ResponseEntity<Map<String, Object>> ping() {
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("status", "UP");
        response.put("message", "pong");
        response.put("timestamp", Instant.now().toString());
        response.put("service", "evalur-backend");
        return ResponseEntity.ok(response);
    }
}


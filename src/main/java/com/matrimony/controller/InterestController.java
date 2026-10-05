package com.matrimony.controller;

import com.matrimony.security.JwtUtil;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/interests")
@CrossOrigin(origins = "*")
public class InterestController {

    private final JwtUtil jwtUtil;
    
    // In-memory storage for interests (in production, use database)
    private static final Map<String, Set<String>> interestsSent = new HashMap<>();
    private static final Map<String, Set<String>> interestsReceived = new HashMap<>();
    private static final Map<String, Map<String, Object>> interestDetails = new HashMap<>(); // Store details with timestamps

    public InterestController(JwtUtil jwtUtil) {
        this.jwtUtil = jwtUtil;
    }

    @PostMapping
    public ResponseEntity<?> sendInterest(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody Map<String, String> request) {
        try {
            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Missing Authorization header");
            }
            
            String token = authHeader.substring(7);
            String fromUsername = jwtUtil.extractUsername(token);
            String toUsername = request.get("to");

            if (toUsername == null || toUsername.isEmpty()) {
                return ResponseEntity.badRequest().body("Target username is required");
            }

            if (fromUsername.equals(toUsername)) {
                return ResponseEntity.badRequest().body("Cannot send interest to yourself");
            }

            // Store interest with timestamp
            interestsSent.computeIfAbsent(fromUsername, k -> new HashSet<>()).add(toUsername);
            interestsReceived.computeIfAbsent(toUsername, k -> new HashSet<>()).add(fromUsername);
            
            // Store detailed interest info
            String interestKey = fromUsername + "->" + toUsername;
            Map<String, Object> detail = new HashMap<>();
            detail.put("from", fromUsername);
            detail.put("to", toUsername);
            detail.put("status", "pending"); // pending, accepted, declined
            detail.put("createdAt", System.currentTimeMillis());
            interestDetails.put(interestKey, detail);

            return ResponseEntity.ok(Map.of(
                "message", "Interest sent successfully",
                "from", fromUsername,
                "to", toUsername,
                "status", "pending"
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error sending interest: " + e.getMessage());
        }
    }

    @GetMapping("/outbox")
    public ResponseEntity<?> getOutbox(@RequestHeader("Authorization") String authHeader) {
        try {
            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Missing Authorization header");
            }
            
            String token = authHeader.substring(7);
            String username = jwtUtil.extractUsername(token);
            
            Set<String> sent = interestsSent.getOrDefault(username, new HashSet<>());
            List<Map<String, Object>> result = new ArrayList<>();
            for (String toUsername : sent) {
                String key = username + "->" + toUsername;
                Map<String, Object> detail = interestDetails.getOrDefault(key, new HashMap<>());
                Map<String, Object> item = new HashMap<>();
                item.put("toUsername", toUsername);
                item.put("status", detail.getOrDefault("status", "pending"));
                item.put("createdAt", detail.getOrDefault("createdAt", System.currentTimeMillis()));
                result.add(item);
            }
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error retrieving outbox: " + e.getMessage());
        }
    }

    @GetMapping("/inbox")
    public ResponseEntity<?> getInbox(@RequestHeader("Authorization") String authHeader) {
        try {
            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Missing Authorization header");
            }
            
            String token = authHeader.substring(7);
            String username = jwtUtil.extractUsername(token);
            
            Set<String> received = interestsReceived.getOrDefault(username, new HashSet<>());
            List<Map<String, Object>> result = new ArrayList<>();
            for (String fromUsername : received) {
                String key = fromUsername + "->" + username;
                Map<String, Object> detail = interestDetails.getOrDefault(key, new HashMap<>());
                Map<String, Object> item = new HashMap<>();
                item.put("fromUsername", fromUsername);
                item.put("status", detail.getOrDefault("status", "pending"));
                item.put("createdAt", detail.getOrDefault("createdAt", System.currentTimeMillis()));
                result.add(item);
            }
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error retrieving inbox: " + e.getMessage());
        }
    }

    @GetMapping("/matches")
    public ResponseEntity<?> getMutualInterests(@RequestHeader("Authorization") String authHeader) {
        try {
            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Missing Authorization header");
            }
            
            String token = authHeader.substring(7);
            String username = jwtUtil.extractUsername(token);
            
            Set<String> sent = interestsSent.getOrDefault(username, new HashSet<>());
            Set<String> received = interestsReceived.getOrDefault(username, new HashSet<>());
            
            // Find mutual interests
            Set<String> mutual = new HashSet<>(sent);
            mutual.retainAll(received);
            
            return ResponseEntity.ok(new ArrayList<>(mutual));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error retrieving mutual interests: " + e.getMessage());
        }
    }
}


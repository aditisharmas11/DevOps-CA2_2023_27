package com.hackathon.backend.controller;

import io.minio.MinioClient;
import io.minio.ListBucketsArgs;
import lombok.RequiredArgsConstructor;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class HealthController {

    private final MongoTemplate mongoTemplate;
    private final RedisTemplate<String, String> redisTemplate;
    private final MinioClient minioClient;



    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> health() {
        Map<String, Object> response = new LinkedHashMap<>();
        boolean allHealthy = true;

        // Check MongoDB
        try {
            mongoTemplate.getDb().runCommand(
                    new org.bson.Document("ping", 1)
            );
            response.put("mongodb", "up");
        } catch (Exception e) {
            response.put("mongodb", "down");
            allHealthy = false;
        }

        // Check Redis
        try {
            redisTemplate.getConnectionFactory()
                    .getConnection()
                    .ping();
            response.put("redis", "up");
        } catch (Exception e) {
            response.put("redis", "down");
            allHealthy = false;
        }

        // Check MinIO
        try {
            minioClient.listBuckets(ListBucketsArgs.builder().build());
            response.put("minio", "up");
        } catch (Exception e) {
            response.put("minio", "down");
            allHealthy = false;
        }

        response.put("status", allHealthy ? "ok" : "degraded");

        return allHealthy
                ? ResponseEntity.ok(response)
                : ResponseEntity.status(503).body(response);
    }
}
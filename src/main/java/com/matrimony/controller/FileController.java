package com.matrimony.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

@RestController
@RequestMapping("/files")
@CrossOrigin(origins = "*")
public class FileController {

    @Value("${file.upload-dir}")
    private String uploadDir;

    @GetMapping("/{username}/{type}/{filename}")
    public ResponseEntity<?> getFile(
            @PathVariable String username,
            @PathVariable String type,
            @PathVariable String filename
    ) {
        try {
            Path path = Paths.get(uploadDir, username, type, filename).normalize();
            File file = path.toFile();
            if (!file.exists() || !file.isFile()) {
                return ResponseEntity.notFound().build();
            }
            String probe = Files.probeContentType(path);
            MediaType mediaType = probe != null ? MediaType.parseMediaType(probe) : MediaType.APPLICATION_OCTET_STREAM;
            Resource resource = new FileSystemResource(file);
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=" + filename)
                    .contentType(mediaType)
                    .body(resource);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Failed to read file");
        }
    }
}



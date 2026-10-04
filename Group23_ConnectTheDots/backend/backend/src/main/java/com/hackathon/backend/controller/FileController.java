package com.hackathon.backend.controller;
import com.hackathon.backend.model.Metadata;
import com.hackathon.backend.repository.MetadataRepository;
import com.hackathon.backend.service.FileService;
import io.minio.GetObjectArgs;
import io.minio.MinioClient;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.core.io.InputStreamResource;

import java.io.InputStream;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "${allowed.origins}")
public class FileController {

    private final FileService fileService;
    private final MetadataRepository metadataRepository;
    private final MinioClient minioClient;


    public FileController(FileService fileService, MetadataRepository metadataRepository, MinioClient minioClient) {
        this.fileService = fileService;
        this.metadataRepository = metadataRepository;
        this.minioClient = minioClient;
    }

    @Value("${minio.bucket}")
    private String bucket;

    @PostMapping("/upload-file")
    public ResponseEntity<Metadata> uploadFile(
            @RequestParam("file") MultipartFile file,
            @RequestParam("title") String title,
            @RequestParam("description") String description) {
        try {
            Metadata saved = fileService.uploadFile(file, title, description);
            return ResponseEntity.ok(saved);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/get-file")
    public ResponseEntity<InputStreamResource> getFile(@RequestParam("id") String id) {
        try {
            // getFileWithMetadata returns both stream and metadata together
            Metadata metadata = metadataRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Not found"));

            InputStream stream = minioClient.getObject(
                    GetObjectArgs.builder()
                            .bucket(bucket)
                            .object(metadata.getFilePath())
                            .build()
            );

            // Extract original filename from stored path (strips the UUID prefix)
            String[] parts = metadata.getFilePath().split("-", 2);
            String filename = parts.length > 1 ? parts[1] : metadata.getFilePath();

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION,
                            "attachment; filename=\"" + filename + "\"")
                    .contentType(MediaType.APPLICATION_OCTET_STREAM)
                    .body(new InputStreamResource(stream));

        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }
}

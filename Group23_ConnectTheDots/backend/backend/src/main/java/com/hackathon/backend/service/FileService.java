package com.hackathon.backend.service;
import com.hackathon.backend.model.Metadata;
import com.hackathon.backend.repository.MetadataRepository;
import io.minio.*;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.util.UUID;

@Service

public class FileService {

    private final MinioClient minioClient;
    private final MetadataRepository metadataRepository;

    public FileService(MetadataRepository metadataRepository, MinioClient minioClient) {
        this.metadataRepository = metadataRepository;
        this.minioClient = minioClient;
    }

    @Value("${minio.bucket}")
    private String bucket;



    public Metadata uploadFile(MultipartFile file, String title, String description)
            throws Exception {

        // Make sure bucket exists
        boolean bucketExists = minioClient.bucketExists(
                BucketExistsArgs.builder().bucket(bucket).build()
        );
        if (!bucketExists) {
            minioClient.makeBucket(MakeBucketArgs.builder().bucket(bucket).build());
        }

        // Generate unique filename
        String objectKey = UUID.randomUUID() + "-" + file.getOriginalFilename();

        // Upload binary to MinIO
        minioClient.putObject(
                PutObjectArgs.builder()
                        .bucket(bucket)
                        .object(objectKey)
                        .stream(file.getInputStream(), file.getSize(), -1)
                        .contentType(file.getContentType())
                        .build()
        );

        // Save metadata with the MinIO object key as filePath
        Metadata metadata = new Metadata();
        metadata.setTitle(title);
        metadata.setDescription(description);
        metadata.setFilePath(objectKey);

        return metadataRepository.save(metadata);
    }

    public InputStream getFile(String id) throws Exception {
        // Step 1: get filePath from MongoDB
        Metadata metadata = metadataRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Metadata not found: " + id));

        // Step 2: use filePath to fetch from MinIO
        return minioClient.getObject(
                GetObjectArgs.builder()
                        .bucket(bucket)
                        .object(metadata.getFilePath())
                        .build()
        );
    }
}

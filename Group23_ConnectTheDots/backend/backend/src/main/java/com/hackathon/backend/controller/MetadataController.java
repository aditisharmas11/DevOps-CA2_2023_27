package com.hackathon.backend.controller;
import com.hackathon.backend.model.Metadata;
import com.hackathon.backend.service.MetadataService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "${allowed.origins}")
@RequiredArgsConstructor
public class MetadataController {

    private final MetadataService metadataService;



    @GetMapping("/metadata")
    public ResponseEntity<List<Metadata>> getMetadata() {
        return ResponseEntity.ok(metadataService.getAllMetadata());
    }

    @PostMapping("/metadata")
    public ResponseEntity<Metadata> saveMetadata(@RequestBody Metadata metadata) {
        return ResponseEntity.ok(metadataService.saveMetadata(metadata));
    }
}

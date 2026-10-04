package com.hackathon.backend.service;
import com.hackathon.backend.model.Metadata;
import com.hackathon.backend.repository.MetadataRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class MetadataService {

    private final MetadataRepository metadataRepository;



    // Cache the result. On second call, Redis returns it directly.
    @Cacheable(value = "metadata", key = "'all'")
    public List<Metadata> getAllMetadata() {
        System.out.println("CACHE MISS — hitting MongoDB");
        return metadataRepository.findAll();
    }

    // After saving, clear the cache so next GET fetches fresh data
    @CacheEvict(value = "metadata", key = "'all'")
    public Metadata saveMetadata(Metadata metadata) {
        System.out.println("CACHE EVICTED — new metadata saved");
        return metadataRepository.save(metadata);
    }
}

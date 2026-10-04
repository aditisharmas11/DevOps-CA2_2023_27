package com.hackathon.backend.repository;
import com.hackathon.backend.model.Metadata;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface MetadataRepository extends MongoRepository<Metadata, String> {

}
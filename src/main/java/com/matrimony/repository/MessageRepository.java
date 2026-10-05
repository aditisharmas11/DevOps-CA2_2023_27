package com.matrimony.repository;

import com.matrimony.model.Message;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface MessageRepository extends MongoRepository<Message, String> {
    List<Message> findByFromUsernameAndToUsernameOrderBySentAtAsc(String from, String to);
    List<Message> findByToUsernameAndFromUsernameOrderBySentAtAsc(String to, String from);
}



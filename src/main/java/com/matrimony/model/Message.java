package com.matrimony.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Document(collection = "messages")
public class Message {

    @Id
    private String id;
    private String fromUsername;
    private String toUsername;
    private String content;
    private Instant sentAt = Instant.now();

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getFromUsername() { return fromUsername; }
    public void setFromUsername(String fromUsername) { this.fromUsername = fromUsername; }
    public String getToUsername() { return toUsername; }
    public void setToUsername(String toUsername) { this.toUsername = toUsername; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    public Instant getSentAt() { return sentAt; }
    public void setSentAt(Instant sentAt) { this.sentAt = sentAt; }
}



package com.matrimony.controller;

import com.matrimony.model.Message;
import com.matrimony.repository.MessageRepository;
import com.matrimony.security.JwtUtil;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/messages")
@CrossOrigin(origins = "*")
public class MessageController {

    private final MessageRepository messageRepo;
    private final JwtUtil jwtUtil;

    public MessageController(MessageRepository messageRepo, JwtUtil jwtUtil) {
        this.messageRepo = messageRepo;
        this.jwtUtil = jwtUtil;
    }

    @GetMapping
    public ResponseEntity<?> list(@RequestHeader("Authorization") String authHeader,
                                  @RequestParam("with") String other) {
        String me = extract(authHeader);
        var a = messageRepo.findByFromUsernameAndToUsernameOrderBySentAtAsc(me, other);
        var b = messageRepo.findByToUsernameAndFromUsernameOrderBySentAtAsc(me, other);
        List<Message> all = new ArrayList<>();
        all.addAll(a); all.addAll(b);
        all.sort(Comparator.comparing(Message::getSentAt));
        return ResponseEntity.ok(all);
    }

    @PostMapping
    public ResponseEntity<?> send(@RequestHeader("Authorization") String authHeader,
                                  @RequestBody Map<String, String> req) {
        String me = extract(authHeader);
        String to = req.get("to");
        String content = req.get("content");
        if (to == null || to.isBlank() || content == null || content.isBlank()) {
            return ResponseEntity.badRequest().body("'to' and 'content' are required");
        }
        Message m = new Message();
        m.setFromUsername(me);
        m.setToUsername(to);
        m.setContent(content);
        return ResponseEntity.ok(messageRepo.save(m));
    }

    private String extract(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer "))
            throw new IllegalArgumentException("Missing or invalid Authorization header");
        return jwtUtil.extractUsername(authHeader.substring(7));
    }
}



package com.matrimony.controller;

import com.matrimony.service.MatchmakingService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/match")
@CrossOrigin(origins = "*")
public class MatchmakingController {

    private final MatchmakingService matchmakingService;

    public MatchmakingController(MatchmakingService matchmakingService) {
        this.matchmakingService = matchmakingService;
    }

    @GetMapping
    public ResponseEntity<?> getMatches(@RequestParam String username) {
        var matches = matchmakingService.findMatches(username);
        return ResponseEntity.ok(matches);
    }
}

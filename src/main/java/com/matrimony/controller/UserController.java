package com.matrimony.controller;

import com.matrimony.dto.UpdateProfileRequest;
import com.matrimony.model.User;
import com.matrimony.service.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.Optional;

@RestController
@RequestMapping("/api/users")
@CrossOrigin(origins = "*")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    // Get user info by username
    @GetMapping("/me")
    public ResponseEntity<?> me(@RequestParam String username) {
        Optional<User> uOpt = userService.findByUsername(username);
        if (uOpt.isEmpty()) return ResponseEntity.status(404).body("User not found in MySQL");

        User u = uOpt.get();
        u.setPasswordHash(null); // hide passwordHash
        return ResponseEntity.ok(u);
    }

    // Update user info by username
    @PutMapping("/me")
    public ResponseEntity<?> updateProfile(
            @RequestParam String username,
            @RequestBody UpdateProfileRequest req) {

        Optional<User> uOpt = userService.findByUsername(username);
        if (uOpt.isEmpty()) return ResponseEntity.status(404).body("User not found in MySQL");

        User existing = uOpt.get();

        // Map fields from request
        existing.setFirstName(req.getFirstName());
        existing.setMiddleName(req.getMiddleName());
        existing.setSurname(req.getSurname());
        existing.setGender(req.getGender());
        existing.setForWhom(req.getForWhom());

        if (req.getDob() != null) {
            try {
                existing.setDob(LocalDate.parse(req.getDob()));
            } catch (Exception e) {
                return ResponseEntity.badRequest().body("Invalid dob format, expected yyyy-MM-dd");
            }
        }
        existing.setAge(req.getAge());

        User saved = userService.save(existing);
        saved.setPasswordHash(null); // hide passwordHash
        return ResponseEntity.ok(saved);
    }

    // Get public profile by user ID
    @GetMapping("/{id}")
    public ResponseEntity<?> getPublicProfile(@PathVariable String id) {
        Optional<User> opt = userService.findById(id);
        if (opt.isEmpty()) return ResponseEntity.status(404).body("User not found");

        User u = opt.get();
        u.setPasswordHash(null); // hide passwordHash
        return ResponseEntity.ok(u);
    }
}

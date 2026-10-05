package com.matrimony.controller;

import com.matrimony.dto.RegisterRequest;
import com.matrimony.dto.LoginRequest;
import com.matrimony.dto.AuthResponse;
import com.matrimony.model.User;
import com.matrimony.repository.UserRepository;
import com.matrimony.security.JwtUtil;
import com.matrimony.service.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.*;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class AuthController {

    private final UserService userService;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authManager;
    private final JwtUtil jwtUtil;

    public AuthController(UserService userService,
                          UserRepository userRepository,
                          PasswordEncoder passwordEncoder,
                          AuthenticationManager authManager,
                          JwtUtil jwtUtil) {
        this.userService = userService;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.authManager = authManager;
        this.jwtUtil = jwtUtil;
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegisterRequest req) {
        try {
            if (req.getUsername() == null || req.getPassword() == null || req.getEmail() == null) {
                return ResponseEntity.badRequest().body("Missing required fields");
            }

            if (userRepository.existsByUsername(req.getUsername())) {
                return ResponseEntity.badRequest().body("Username already exists");
            }
            if (userRepository.existsByEmail(req.getEmail())) {
                return ResponseEntity.badRequest().body("Email already exists");
            }

            User u = new User();
            u.setUsername(req.getUsername());
            u.setEmail(req.getEmail());
            u.setPhone(req.getPhone());
            u.setForWhom(req.getForWhom());
            u.setFirstName(req.getFirstName());
            u.setMiddleName(req.getMiddleName());
            u.setSurname(req.getSurname());
            u.setGender(req.getGender());

            if (req.getDob() != null) {
                try {
                    u.setDob(LocalDate.parse(req.getDob()));
                } catch (Exception ex) {
                    return ResponseEntity.badRequest().body("Invalid date format. Use yyyy-MM-dd");
                }
            }

            u.setAge(req.getAge());

            // ✅ Hash password before saving
            u.setPasswordHash(passwordEncoder.encode(req.getPassword()));

            User saved = userService.save(u);
            saved.setPasswordHash(null);

            return ResponseEntity.ok(saved); // Now it's safe to return

        } catch (Exception ex) {
            ex.printStackTrace();
            return ResponseEntity.status(500).body("Server error: " + ex.getMessage());
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest req) {
        System.out.println("Login request payload: " + req);
        try {
            Authentication auth = authManager.authenticate(
                    new UsernamePasswordAuthenticationToken(req.getUsername(), req.getPassword())
            );

            // Generate token
            String token = jwtUtil.generateToken(req.getUsername());

            return ResponseEntity.ok(new AuthResponse(token));
        } catch (AuthenticationException e) {
            return ResponseEntity.status(401).body("Invalid username or password");
        }
    }


}

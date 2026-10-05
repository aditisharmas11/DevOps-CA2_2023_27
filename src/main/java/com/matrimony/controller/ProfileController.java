package com.matrimony.controller;

import com.matrimony.dto.ProfileStep2Request;
import com.matrimony.dto.ProfileStep3Request;
import com.matrimony.dto.ProfileStep4Request;
import com.matrimony.dto.UpdateProfileRequest;
import com.matrimony.model.Profile;
import com.matrimony.model.User;
import com.matrimony.repository.ProfileRepository;
import com.matrimony.security.JwtUtil;
import com.matrimony.service.ProfileService;
import com.matrimony.service.UserService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.util.Optional;

@RestController
@RequestMapping("/api/profile")
@CrossOrigin(origins = "*")
public class ProfileController {

    private final ProfileService profileService;
    private final ProfileRepository profileRepository;
    private final UserService userService;
    private final JwtUtil jwtUtil;

    public ProfileController(ProfileService profileService,
                             ProfileRepository profileRepository,
                             UserService userService,
                             JwtUtil jwtUtil) {
        this.profileService = profileService;
        this.profileRepository = profileRepository;
        this.userService = userService;
        this.jwtUtil = jwtUtil;
    }

    // ===================== BASIC PROFILE GET =====================
    @GetMapping("/me")
    public ResponseEntity<?> getMyProfile(@RequestHeader("Authorization") String authHeader) {
        try {
            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Missing Authorization header");
            }
            String token = authHeader.substring(7);
            String username = jwtUtil.extractUsername(token);

            Optional<Profile> opt = profileService.getProfile(username);
            if (opt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Profile not found for username: " + username);
            }

            Profile profile = opt.get();
            if (profile.getIdProof() != null) {
                profile.getIdProof().setPath(null);
            }
            return ResponseEntity.ok(profile);

        } catch (Exception ex) {
            ex.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error retrieving profile: " + ex.getMessage());
        }
    }

    // ===================== COMBINED PROFILE (SQL + Mongo) =====================
    @GetMapping("/combined")
    public ResponseEntity<?> getCombinedProfile(@RequestHeader("Authorization") String authHeader) {
        try {
            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Missing Authorization header");
            }
            String token = authHeader.substring(7);
            String username = jwtUtil.extractUsername(token);

            var userOpt = userService.findByUsername(username);
            var profileOpt = profileService.getProfile(username);

            if (userOpt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body("User not found in MySQL");
            }

            var user = userOpt.get();
            user.setPasswordHash(null);

            Profile profile = profileOpt.orElse(null);
            if (profile != null && profile.getIdProof() != null) {
                profile.getIdProof().setPath(null);
            }

            java.util.Map<String, Object> resp = new java.util.HashMap<>();
            resp.put("user", user);
            resp.put("profile", profile);
            return ResponseEntity.ok(resp);
        } catch (Exception ex) {
            ex.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error retrieving combined profile: " + ex.getMessage());
        }
    }

    // ===================== STEP 2 SAVE =====================
    @PostMapping("/step2")
    public ResponseEntity<?> saveStep2(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody ProfileStep2Request req) {
        try {
            String username = getUsernameFromAuth(authHeader);
            Profile saved = profileService.saveStep2(username, req);
            return ResponseEntity.ok(saved);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error saving Step 2: " + e.getMessage());
        }
    }

    // ===================== STEP 3 SAVE =====================
    @PostMapping("/step3")
    public ResponseEntity<?> saveStep3(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody ProfileStep3Request req) {
        try {
            String username = getUsernameFromAuth(authHeader);
            Profile saved = profileService.saveStep3(username, req);
            return ResponseEntity.ok(saved);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error saving Step 3: " + e.getMessage());
        }
    }

    // ===================== STEP 4 UPLOAD (FILES) =====================
    @PostMapping(value = "/step4", consumes = {"multipart/form-data"})
    public ResponseEntity<?> uploadStep4(
            @RequestHeader("Authorization") String authHeader,
            @RequestPart(value = "profilePhoto", required = false) MultipartFile profilePhoto,
            @RequestPart(value = "additionalPhotos", required = false) MultipartFile[] additionalPhotos,
            @RequestPart(value = "horoscope", required = false) MultipartFile horoscope,
            @RequestPart(value = "governmentId", required = false) MultipartFile governmentId
    ) {
        try {
            String username = getUsernameFromAuth(authHeader);

            ProfileStep4Request req = new ProfileStep4Request();
            req.setProfilePhoto(profilePhoto);
            req.setAdditionalPhotos(additionalPhotos);
            req.setHoroscope(horoscope);
            req.setGovernmentId(governmentId);

            Profile saved = profileService.saveStep4(username, req);

            if (saved.getIdProof() != null) {
                saved.getIdProof().setPath(null);
            }

            return ResponseEntity.ok(saved);

        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error uploading Step 4 files: " + e.getMessage());
        }
    }

    // ===================== USER INFO (FROM MYSQL) =====================
    @GetMapping("/user-info")
    public ResponseEntity<?> getUserInfo(@RequestParam String username) {
        Optional<User> uOpt = userService.findByUsername(username);
        if (uOpt.isEmpty()) return ResponseEntity.status(404).body("User not found in MySQL");

        User u = uOpt.get();
        u.setPasswordHash(null);
        return ResponseEntity.ok(u);
    }

    @PutMapping("/user-info")
    public ResponseEntity<?> updateUserInfo(
            @RequestParam String username,
            @RequestBody UpdateProfileRequest req) {

        Optional<User> uOpt = userService.findByUsername(username);
        if (uOpt.isEmpty()) return ResponseEntity.status(404).body("User not found in MySQL");

        User existing = uOpt.get();
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
        saved.setPasswordHash(null);
        return ResponseEntity.ok(saved);
    }

    // ===================== PUBLIC PROFILE (BY ID) =====================
    @GetMapping("/public/{id}")
    public ResponseEntity<?> getPublicProfile(@PathVariable String id) {
        Optional<User> opt = userService.findById(id);
        if (opt.isEmpty()) return ResponseEntity.status(404).body("User not found");

        User u = opt.get();
        u.setPasswordHash(null);
        return ResponseEntity.ok(u);
    }

    // ===================== HELPER =====================
    private String getUsernameFromAuth(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            throw new IllegalArgumentException("Missing or invalid Authorization header");
        }
        String token = authHeader.substring(7);
        return jwtUtil.extractUsername(token);
    }
}

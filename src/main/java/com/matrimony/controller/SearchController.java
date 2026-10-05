package com.matrimony.controller;

import com.matrimony.model.Profile;
import com.matrimony.model.User;
import com.matrimony.repository.ProfileRepository;
import com.matrimony.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/search")
@CrossOrigin(origins = "*")
public class SearchController {

    private final ProfileRepository profileRepo;
    private final UserRepository userRepo;

    public SearchController(ProfileRepository profileRepo, UserRepository userRepo) {
        this.profileRepo = profileRepo;
        this.userRepo = userRepo;
    }

    @GetMapping
    public ResponseEntity<?> search(
            @RequestParam(required = false) String name,
            @RequestParam(required = false) String city,
            @RequestParam(required = false) String faith,
            @RequestParam(required = false) String caste
    ) {
        List<Profile> profiles = profileRepo.findAll();

        List<Map<String, Object>> results = new ArrayList<>();
        for (Profile p : profiles) {
            Optional<User> uOpt = userRepo.findByUsername(p.getUsername());
            if (uOpt.isEmpty()) continue;
            User u = uOpt.get();

            if (name != null && !name.isBlank()) {
                String lower = name.toLowerCase();
                String full = String.join(" ",
                        Optional.ofNullable(u.getFirstName()).orElse(""),
                        Optional.ofNullable(u.getMiddleName()).orElse(""),
                        Optional.ofNullable(u.getSurname()).orElse("")
                ).toLowerCase();
                if (!full.contains(lower)) continue;
            }
            if (city != null && !city.isBlank()) {
                if (!Objects.equals(city, p.getCity())) continue;
            }
            if (faith != null && !faith.isBlank()) {
                if (!Objects.equals(faith, p.getFaith())) continue;
            }
            if (caste != null && !caste.isBlank()) {
                if (!Objects.equals(caste, p.getCaste())) continue;
            }

            Map<String, Object> m = new HashMap<>();
            m.put("username", p.getUsername());
            m.put("firstName", u.getFirstName());
            m.put("age", u.getAge());
            m.put("gender", u.getGender());
            m.put("city", p.getCity());
            m.put("education", p.getEducation());
            m.put("occupation", p.getOccupation());
            if (p.getProfilePhoto() != null) m.put("photoUrl", p.getProfilePhoto().getUrl());
            results.add(m);
        }

        return ResponseEntity.ok(results);
    }
}



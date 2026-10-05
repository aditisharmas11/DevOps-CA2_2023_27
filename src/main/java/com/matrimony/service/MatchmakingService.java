package com.matrimony.service;

import com.matrimony.model.Profile;
import com.matrimony.model.User;
import com.matrimony.repository.ProfileRepository;
import com.matrimony.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class MatchmakingService {

    private final UserRepository userRepo;
    private final ProfileRepository profileRepo;

    public MatchmakingService(UserRepository userRepo, ProfileRepository profileRepo) {
        this.userRepo = userRepo;
        this.profileRepo = profileRepo;
    }

    public List<Map<String, Object>> findMatches(String username) {
        Optional<User> uOpt = userRepo.findByUsername(username);
        if (uOpt.isEmpty()) return Collections.emptyList();

        User currentUser = uOpt.get();
        Profile myProfile = profileRepo.findByUsername(username).orElse(new Profile());

        // Get all users except current user (ensures ALL existing users appear)
        List<User> otherUsers = userRepo.findAll().stream()
                .filter(u -> !Objects.equals(u.getUsername(), username))
                .collect(Collectors.toList());

        List<Map<String, Object>> matches = new ArrayList<>();

        for (User otherUser : otherUsers) {
            Profile otherProfile = profileRepo.findByUsername(otherUser.getUsername()).orElse(new Profile());

            double score = calculateCompatibility(currentUser, myProfile, otherUser, otherProfile);

            Map<String, Object> match = new HashMap<>();
            match.put("username", otherUser.getUsername());
            match.put("firstName", otherUser.getFirstName());
            match.put("age", otherUser.getAge());
            match.put("gender", otherUser.getGender());
            match.put("city", otherProfile.getCity());
            match.put("education", otherProfile.getEducation());
            match.put("occupation", otherProfile.getOccupation());
            // Add profile photo URL if available, otherwise null (frontend will show default image)
            if (otherProfile.getProfilePhoto() != null && otherProfile.getProfilePhoto().getUrl() != null) {
                match.put("photoUrl", otherProfile.getProfilePhoto().getUrl());
            } else {
                match.put("photoUrl", null);
            }
            match.put("compatibility", score);
            match.put("compatibilityScore", score); // Add for consistency

            matches.add(match);
        }

        // Sort by highest compatibility
        return matches.stream()
                .sorted((a, b) -> Double.compare((double)b.get("compatibility"), (double)a.get("compatibility")))
                .collect(Collectors.toList());
    }

    private double calculateCompatibility(User u1, Profile p1, User u2, Profile p2) {
        double score = 0;
        double totalWeight = 0;

        // Gender rule (prefer opposite)
        double genderScore = u1.getGender().equalsIgnoreCase(u2.getGender()) ? 0 : 1;
        score += genderScore * 10; totalWeight += 10;

        // Age difference
        if (u1.getAge() != null && u2.getAge() != null) {
            int diff = Math.abs(u1.getAge() - u2.getAge());
            double ageScore = diff <= 3 ? 1 : diff <= 6 ? 0.5 : 0;
            score += ageScore * 8; totalWeight += 8;
        }

        // Education match
        if (Objects.equals(p1.getEducation(), p2.getEducation())) score += 7;
        totalWeight += 7;

        // Religion or Faith
        if (Objects.equals(p1.getFaith(), p2.getFaith())) score += 10;
        totalWeight += 10;

        // City match
        if (Objects.equals(p1.getCity(), p2.getCity())) score += 5;
        totalWeight += 5;

        // Hobbies (Jaccard similarity)
        if (p1.getHobbies() != null && p2.getHobbies() != null) {
            Set<String> h1 = new HashSet<>(Arrays.asList(p1.getHobbies().toLowerCase().split(",")));
            Set<String> h2 = new HashSet<>(Arrays.asList(p2.getHobbies().toLowerCase().split(",")));
            Set<String> intersection = new HashSet<>(h1);
            intersection.retainAll(h2);
            double hobbyScore = (double) intersection.size() / Math.max(h1.size(), 1);
            score += hobbyScore * 10; totalWeight += 10;
        }

        return (score / totalWeight) * 100; // return percentage
    }
}

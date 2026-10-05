package com.matrimony.test;

import com.matrimony.model.User;
import com.matrimony.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;

@Component
public class UserFinderTestRunner implements CommandLineRunner {

    private final UserRepository userRepository;

    public UserFinderTestRunner(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    public void run(String... args) {
        String usernameToSearch = "testuser2"; // change this if needed
        System.out.println("🔎 Searching for username: " + usernameToSearch);

        // Exact match
        Optional<User> userOpt = userRepository.findByUsername(usernameToSearch);
        if (userOpt.isPresent()) {
            System.out.println("✅ User found (exact match): " + userOpt.get().getUsername());
        } else {
            System.out.println("❌ User NOT found (exact match). Trying case-insensitive search...");

            // Case-insensitive search fallback
            List<User> users = userRepository.findAll();
            users.stream()
                    .filter(u -> u.getUsername() != null && u.getUsername().equalsIgnoreCase(usernameToSearch))
                    .forEach(u -> System.out.println("⚠ Found with case-insensitive match: " + u.getUsername()));
        }
    }
}

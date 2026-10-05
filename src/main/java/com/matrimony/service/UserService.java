package com.matrimony.service;

import com.matrimony.model.User;
import com.matrimony.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class UserService {

    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public Optional<User> findByUsername(String username) {
        Optional<User> user = userRepository.findByUsername(username);
        System.out.println("Searching for username: " + username);
        System.out.println("Found: " + user.isPresent());
        return user;
    }

    public Optional<User> findById(String id) { // changed from Long -> String
        return userRepository.findById(id);
    }

    public User save(User u) {
        return userRepository.save(u);
    }
}

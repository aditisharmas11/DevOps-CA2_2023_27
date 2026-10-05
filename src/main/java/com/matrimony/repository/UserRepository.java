package com.matrimony.repository;

import com.matrimony.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, String> {

    // Explicit query to avoid any method name parsing issues
    @Query("SELECT u FROM User u WHERE u.username = :username")
    Optional<User> findByUsername(@Param("username") String username);

    boolean existsByUsername(String username);
    boolean existsByEmail(String email);
}

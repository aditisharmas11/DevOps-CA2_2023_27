package com.matrimony.service;

import com.matrimony.model.RefreshToken;
import com.matrimony.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, String> {
    Optional<RefreshToken> findByToken(String token);
    int deleteByUser(User user);
}

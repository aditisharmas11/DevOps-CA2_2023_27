package com.matrimony.controller;

import com.matrimony.model.Profile;
import com.matrimony.model.User;
import com.matrimony.repository.ProfileRepository;
import com.matrimony.repository.UserRepository;
import com.matrimony.security.JwtUtil;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public class MatchmakingControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ProfileRepository profileRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtUtil jwtUtil;

    private String testUserToken;
    private User testUser;

    @BeforeEach
    public void setup() {
        cleanup();

        // 1. Create the main test user
        testUser = new User();
        testUser.setUsername("testuser");
        testUser.setEmail("test@example.com");
        testUser.setPasswordHash(passwordEncoder.encode("pass123"));
        testUser.setGender("Male");
        testUser.setAge(30);
        userRepository.save(testUser);

        Profile testProfile = new Profile();
        testProfile.setUsername("testuser");
        testProfile.setFaith("Hindu");
        testProfile.setCity("City A");
        profileRepository.save(testProfile);

        testUserToken = jwtUtil.generateToken("testuser");

        // 2. Create a compatible match
        User matchUser = new User();
        matchUser.setUsername("matchuser");
        matchUser.setEmail("match@example.com");
        matchUser.setPasswordHash(passwordEncoder.encode("pass123"));
        matchUser.setGender("Female"); // Opposite gender
        matchUser.setAge(28); // Close age
        userRepository.save(matchUser);

        Profile matchProfile = new Profile();
        matchProfile.setUsername("matchuser");
        matchProfile.setFaith("Hindu"); // Same faith
        matchProfile.setCity("City A"); // Same city
        profileRepository.save(matchProfile);

        // 3. Create an incompatible match
        User otherUser = new User();
        otherUser.setUsername("otheruser");
        otherUser.setEmail("other@example.com");
        otherUser.setPasswordHash(passwordEncoder.encode("pass123"));
        otherUser.setGender("Male"); // Same gender
        otherUser.setAge(50); // Large age diff
        userRepository.save(otherUser);

        Profile otherProfile = new Profile();
        otherProfile.setUsername("otheruser");
        otherProfile.setFaith("Christian"); // Different faith
        otherProfile.setCity("City B"); // Different city
        profileRepository.save(otherProfile);
    }

    @AfterEach
    public void cleanup() {
        profileRepository.deleteAll();
        userRepository.deleteAll();
    }

    @Test
    public void getMatches_whenNoToken_thenReturns401() throws Exception {
        mockMvc.perform(get("/api/match?username=testuser"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    public void getMatches_whenValidTokenAndMatchesExist_thenReturns200AndMatchList() throws Exception {
        mockMvc.perform(get("/api/match?username=testuser")
                        .header("Authorization", "Bearer " + testUserToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2))) // Finds both users
                .andExpect(jsonPath("$[0].username", is("matchuser"))) // "matchuser" is first (higher score)
                .andExpect(jsonPath("$[1].username", is("otheruser")));
    }

    @Test
    public void getMatches_whenUserHasNoProfile_thenReturns404() throws Exception {
        // 1. Create user with no profile
        User noProfileUser = new User();
        noProfileUser.setUsername("noprofile");
        noProfileUser.setEmail("np@ex.com");
        noProfileUser.setPasswordHash(passwordEncoder.encode("pass"));
        userRepository.save(noProfileUser);

        String noProfileToken = jwtUtil.generateToken("noprofile");

        mockMvc.perform(get("/api/match?username=noprofile")
                        .header("Authorization", "Bearer " + noProfileToken))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$", is("No matches found")));
    }

    @Test
    public void getMatches_whenNoOtherUsers_thenReturns404() throws Exception {
        // 1. Clear all users except the test user
        profileRepository.deleteAll();
        userRepository.deleteAll();

        testUser = new User();
        testUser.setUsername("soloUser");
        testUser.setEmail("solo@example.com");
        testUser.setPasswordHash(passwordEncoder.encode("pass"));
        userRepository.save(testUser);

        Profile soloProfile = new Profile();
        soloProfile.setUsername("soloUser");
        profileRepository.save(soloProfile);

        String soloToken = jwtUtil.generateToken("soloUser");

        // 2. Perform match
        mockMvc.perform(get("/api/match?username=soloUser")
                        .header("Authorization", "Bearer " + soloToken))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$", is("No matches found")));
    }
}
package com.matrimony.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.matrimony.dto.UpdateProfileRequest;
import com.matrimony.model.User;
import com.matrimony.repository.UserRepository;
import com.matrimony.security.JwtUtil;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public class UserControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private ObjectMapper objectMapper;

    private String testUserToken;
    private User testUser;

    @BeforeEach
    public void setup() {
        userRepository.deleteAll();

        testUser = new User();
        testUser.setUsername("testuser");
        testUser.setEmail("test@example.com");
        testUser.setPasswordHash(passwordEncoder.encode("pass123"));
        testUser.setFirstName("Original");
        testUser = userRepository.save(testUser);

        testUserToken = jwtUtil.generateToken("testUser");
    }

    @AfterEach
    public void cleanup() {
        userRepository.deleteAll();
    }

    // --- GET /api/users/me ---

    @Test
    public void me_whenUserExists_thenReturns200AndUser() throws Exception {
        mockMvc.perform(get("/api/users/me?username=testuser")
                        .header("Authorization", "Bearer " + testUserToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username", is("testuser")))
                .andExpect(jsonPath("$.passwordHash", is(nullValue())));
    }

    @Test
    public void me_whenUserNotFound_thenReturns404() throws Exception {
        mockMvc.perform(get("/api/users/me?username=nonexistent")
                        .header("Authorization", "Bearer " + testUserToken))
                .andExpect(status().isNotFound());
    }

    // --- PUT /api/users/me ---

    @Test
    public void updateProfile_whenUserExists_thenUpdatesAndReturns200() throws Exception {
        UpdateProfileRequest req = new UpdateProfileRequest();
        req.setFirstName("Updated Name");
        req.setDob("1995-05-05");

        mockMvc.perform(put("/api/users/me?username=testuser")
                        .header("Authorization", "Bearer " + testUserToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.firstName", is("Updated Name")))
                .andExpect(jsonPath("$.dob", is("1995-05-05")));
    }

    @Test
    public void updateProfile_whenInvalidDateFormat_thenReturns400() throws Exception {
        UpdateProfileRequest req = new UpdateProfileRequest();
        req.setDob("05-05-1995"); // Bad format

        mockMvc.perform(put("/api/users/me?username=testuser")
                        .header("Authorization", "Bearer " + testUserToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest());
    }

    // --- GET /api/users/{id} ---

    @Test
    public void getPublicProfile_whenIdExists_thenReturns200AndUser() throws Exception {
        // This endpoint is public, no token needed
        mockMvc.perform(get("/api/users/" + testUser.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username", is("testuser")))
                .andExpect(jsonPath("$.passwordHash", is(nullValue())));
    }

    @Test
    public void getPublicProfile_whenIdNotFound_thenReturns4F4() throws Exception {
        mockMvc.perform(get("/api/users/nonexistent-id"))
                .andExpect(status().isNotFound());
    }
}
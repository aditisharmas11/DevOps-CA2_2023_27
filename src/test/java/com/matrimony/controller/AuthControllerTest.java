package com.matrimony.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.matrimony.dto.RegisterRequest;
import com.matrimony.model.User;
import com.matrimony.repository.UserRepository;
import com.matrimony.security.JwtUtil;
import com.matrimony.service.UserService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// 1. Load the full Spring application
@SpringBootTest
// 2. Give us a tool to "fake" HTTP requests
@AutoConfigureMockMvc
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc; // The tool for faking HTTP requests

    @Autowired
    private ObjectMapper objectMapper; // Converts our Java objects to JSON

    // 3. We must MOCK all dependencies of AuthController
    @MockBean
    private UserService userService;

    @MockBean
    private UserRepository userRepository;

    @MockBean
    private PasswordEncoder passwordEncoder;

    @MockBean
    private AuthenticationManager authManager;

    @MockBean
    private JwtUtil jwtUtil;

    /**
     * Test Case 1.1 (Happy Path)
     * A new user registers with all valid and unique data.
     */
    @Test
    void testRegister_Success() throws Exception {
        // --- Arrange ---
        // 1. Create our sample request
        RegisterRequest req = new RegisterRequest();
        req.setUsername("newUser");
        req.setEmail("new@example.com");
        req.setPassword("password123");
        req.setFirstName("New");
        req.setSurname("User");
        // ... set other required fields

        // 2. Define the behavior of our Mocks
        // When userRepository.exists... is called, return false (it's not taken)
        when(userRepository.existsByUsername("newUser")).thenReturn(false);
        when(userRepository.existsByEmail("new@example.com")).thenReturn(false);

        // When passwordEncoder.encode is called, just return a fake hash
        when(passwordEncoder.encode("password123")).thenReturn("fake-hashed-password");

        // When userService.save is called, return a user
        User savedUser = new User();
        savedUser.setUsername("newUser");
        savedUser.setEmail("new@example.com");
        when(userService.save(any(User.class))).thenReturn(savedUser);

        // --- Act & Assert ---
        mockMvc.perform(
                        post("/api/auth/register")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(req)) // Convert request to JSON string
                )
                .andExpect(status().isOk()) // Expect HTTP 200
                .andExpect(jsonPath("$.username").value("newUser")); // Expect JSON response
    }

    /**
     * Test Case 1.2 (Bug / Error)
     * A user tries to register with a username that *already exists*.
     */
    @Test
    void testRegister_FailsWhenUsernameExists() throws Exception {
        // --- Arrange ---
        RegisterRequest req = new RegisterRequest();
        req.setUsername("existingUser");
        req.setEmail("new@example.com");
        req.setPassword("password123");
        req.setFirstName("Test");

        // Define Mock behavior: WHEN existsByUsername is called, return TRUE
        when(userRepository.existsByUsername("existingUser")).thenReturn(true);

        // --- Act & Assert ---
        mockMvc.perform(
                        post("/api/auth/register")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(req))
                )
                .andExpect(status().isBadRequest()) // Expect HTTP 400
                .andExpect(content().string("Username already exists")); // Expect exact error message
    }

    /**
     * Test Case 1.3 (Bug / Error)
     * A user tries to register with an email that *already exists*.
     */
    @Test
    void testRegister_FailsWhenEmailExists() throws Exception {
        // --- Arrange ---
        RegisterRequest req = new RegisterRequest();
        req.setUsername("newUser");
        req.setEmail("existing@example.com");
        req.setPassword("password123");
        req.setFirstName("Test");

        // Define Mock behavior: Username is fine (false), but email is taken (true)
        when(userRepository.existsByUsername("newUser")).thenReturn(false);
        when(userRepository.existsByEmail("existing@example.com")).thenReturn(true);

        // --- Act & Assert ---
        mockMvc.perform(
                        post("/api/auth/register")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(req))
                )
                .andExpect(status().isBadRequest()) // Expect HTTP 400
                .andExpect(content().string("Email already exists")); // Expect exact error message
    }

    /**
     * Test Case 1.4 (Error Case)
     * A user tries to register with missing required fields (password).
     */
    @Test
    void testRegister_FailsOnMissingPassword() throws Exception {
        // --- Arrange ---
        RegisterRequest req = new RegisterRequest();
        req.setUsername("someUser");
        req.setEmail("some@email.com");
        // Notice we are NOT setting the password

        // --- Act & Assert ---
        mockMvc.perform(
                        post("/api/auth/register")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(req))
                )
                .andExpect(status().isBadRequest())
                .andExpect(content().string("Missing required fields"));
    }

    /**
     * Test Case 2.1 (Happy Path)
     * User logs in with valid username and password.
     */
    @Test
    void testLogin_Success() throws Exception {
        // --- Arrange ---
        com.matrimony.dto.LoginRequest req = new com.matrimony.dto.LoginRequest();
        req.setUsername("testuser");
        req.setPassword("password123");

        // Mock authentication to succeed
        org.springframework.security.core.Authentication auth = 
            org.springframework.security.authentication.UsernamePasswordAuthenticationToken.authenticated(
                "testuser", null, java.util.Collections.emptyList()
            );
        when(authManager.authenticate(any())).thenReturn(auth);
        when(jwtUtil.generateToken("testuser")).thenReturn("fake-jwt-token");

        // --- Act & Assert ---
        mockMvc.perform(
                        post("/api/auth/login")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(req))
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").exists());
    }

    /**
     * Test Case 2.2 (Error Case - INTENTIONAL FAIL)
     * User tries to login without password - should fail with 401.
     * This test intentionally expects wrong status to demonstrate test failure.
     */
    @Test
    void testLogin_FailsWithoutPassword_INTENTIONAL_FAIL() throws Exception {
        // --- Arrange ---
        com.matrimony.dto.LoginRequest req = new com.matrimony.dto.LoginRequest();
        req.setUsername("testuser");
        // Password is NOT set

        // Mock authentication to fail
        when(authManager.authenticate(any())).thenThrow(
            new org.springframework.security.authentication.BadCredentialsException("Bad credentials")
        );

        // --- Act & Assert ---
        mockMvc.perform(
                        post("/api/auth/login")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(req))
                )
                // This should be 401 (Unauthorized) but we intentionally expect 400 to fail
                .andExpect(status().isBadRequest()) // INTENTIONAL FAIL - should be isUnauthorized()
                .andExpect(content().string("Invalid username or password"));
    }

    /**
     * Test Case 2.3 (Error Case - Correct)
     * User tries to login with invalid credentials.
     */
    @Test
    void testLogin_FailsWithInvalidCredentials() throws Exception {
        // --- Arrange ---
        com.matrimony.dto.LoginRequest req = new com.matrimony.dto.LoginRequest();
        req.setUsername("testuser");
        req.setPassword("wrongpassword");

        // Mock authentication to fail
        when(authManager.authenticate(any())).thenThrow(
            new org.springframework.security.authentication.BadCredentialsException("Bad credentials")
        );

        // --- Act & Assert ---
        mockMvc.perform(
                        post("/api/auth/login")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(req))
                )
                .andExpect(status().isUnauthorized())
                .andExpect(content().string("Invalid username or password"));
    }
}
package com.matrimony.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.matrimony.dto.ProfileStep2Request;
import com.matrimony.dto.UpdateProfileRequest;
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
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public class ProfileControllerTest {

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

    @Autowired
    private ObjectMapper objectMapper;

    private String testUserToken;
    private User testUser;
    private Profile testProfile;

    // Setup a user and get a valid token before each test
    @BeforeEach
    public void setup() {
        cleanup(); // Clean first

        testUser = new User();
        testUser.setUsername("testuser");
        testUser.setEmail("test@example.com");
        testUser.setPasswordHash(passwordEncoder.encode("pass123"));
        testUser = userRepository.save(testUser); // Save and get the ID

        testProfile = new Profile();
        testProfile.setUsername("testuser");
        testProfile.setCity("Test City");
        testProfile = profileRepository.save(testProfile);

        testUserToken = jwtUtil.generateToken("testuser");
    }

    @AfterEach
    public void cleanup() {
        profileRepository.deleteAll();
        userRepository.deleteAll();
    }

    // --- Security Tests (No Token) ---

    @Test
    public void getMyProfile_whenNoToken_thenReturns401() throws Exception {
        mockMvc.perform(get("/api/profile/me"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    public void saveStep2_whenNoToken_thenReturns401() throws Exception {
        ProfileStep2Request req = new ProfileStep2Request();
        mockMvc.perform(post("/api/profile/step2")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isUnauthorized());
    }

    // --- GET /api/profile/me ---

    @Test
    public void getMyProfile_whenValidTokenAndProfileExists_thenReturns200AndProfile() throws Exception {
        mockMvc.perform(get("/api/profile/me")
                        .header("Authorization", "Bearer " + testUserToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username", is("testuser")))
                .andExpect(jsonPath("$.city", is("Test City")))
                .andExpect(jsonPath("$.idProof").doesNotExist()); // idProof is not saved yet
    }

    @Test
    public void getMyProfile_whenValidTokenButNoProfile_thenReturns404() throws Exception {
        // Create a new user with no profile
        User user2 = new User();
        user2.setUsername("user2");
        user2.setEmail("user2@ex.com");
        user2.setPasswordHash(passwordEncoder.encode("pass"));
        userRepository.save(user2);

        String user2Token = jwtUtil.generateToken("user2");

        // **FIXED:** The line below was removed as it was incorrect and unnecessary.
        // user2 has no profile, so this should fail

        mockMvc.perform(get("/api/profile/me")
                        .header("Authorization", "Bearer " + user2Token))
                .andExpect(status().isNotFound());
    }

    // --- POST /api/profile/step2 ---

    @Test
    public void saveStep2_whenValidTokenAndData_thenSavesProfileAndReturns200() throws Exception {
        ProfileStep2Request req = new ProfileStep2Request();
        req.setMaritalStatus("Single");
        req.setHeight("6ft");
        req.setCity("New City");

        mockMvc.perform(post("/api/profile/step2")
                        .header("Authorization", "Bearer " + testUserToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.maritalStatus", is("Single")))
                .andExpect(jsonPath("$.city", is("New City"))); // Check that data was updated
    }

    // --- POST /api/profile/step4 (File Upload) ---

    @Test
    public void uploadStep4_whenValidTokenAndFiles_thenSavesAndReturns200() throws Exception {
        MockMultipartFile profilePhoto = new MockMultipartFile(
                "profilePhoto", "photo.jpg", MediaType.IMAGE_JPEG_VALUE, "fake-image-bytes".getBytes()
        );
        MockMultipartFile governmentId = new MockMultipartFile(
                "governmentId", "id.pdf", MediaType.APPLICATION_PDF_VALUE, "fake-pdf-bytes".getBytes()
        );

        mockMvc.perform(multipart("/api/profile/step4")
                        .file(profilePhoto)
                        .file(governmentId)
                        .header("Authorization", "Bearer " + testUserToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.profilePhoto.originalName", is("photo.jpg")))
                .andExpect(jsonPath("$.idProof").exists())
                .andExpect(jsonPath("$.idProof.path", is(nullValue()))); // Path is correctly hidden
    }

    // --- GET /api/profile/user-info ---

    @Test
    public void getUserInfo_whenUserExists_thenReturns200AndUser() throws Exception {
        mockMvc.perform(get("/api/profile/user-info?username=testuser")
                        .header("Authorization", "Bearer " + testUserToken)) // This endpoint is secured
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username", is("testuser")))
                .andExpect(jsonPath("$.passwordHash", is(nullValue())));
    }

    @Test
    public void getUserInfo_whenUserNotFound_thenReturns44() throws Exception {
        mockMvc.perform(get("/api/profile/user-info?username=nonexistent")
                        .header("Authorization", "Bearer " + testUserToken))
                .andExpect(status().isNotFound());
    }

    // --- PUT /api/profile/user-info ---

    @Test
    public void updateUserInfo_whenUserExists_thenUpdatesAndReturns200() throws Exception {
        UpdateProfileRequest req = new UpdateProfileRequest();
        req.setFirstName("Updated First Name");
        req.setSurname("Updated Surname");
        req.setDob("1992-02-02");

        mockMvc.perform(put("/api/profile/user-info?username=testuser")
                        .header("Authorization", "Bearer " + testUserToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.firstName", is("Updated First Name")))
                .andExpect(jsonPath("$.dob", is("1992-02-02")));
    }

    // --- GET /api/profile/public/{id} ---

    @Test
    public void getPublicProfile_whenIdExists_thenReturns200AndUser() throws Exception {
        // This endpoint is public, no token needed
        mockMvc.perform(get("/api/profile/public/" + testUser.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username", is("testuser")))
                .andExpect(jsonPath("$.passwordHash", is(nullValue())));
    }

    @Test
    public void getPublicProfile_whenIdNotFound_thenReturns404() throws Exception {
        mockMvc.perform(get("/api/profile/public/nonexistent-id"))
                .andExpect(status().isNotFound());
    }

    // --- POST /api/profile/step3 ---

    @Test
    public void saveStep3_whenValidTokenAndData_thenSavesProfileAndReturns200() throws Exception {
        com.matrimony.dto.ProfileStep3Request req = new com.matrimony.dto.ProfileStep3Request();
        req.setAboutMe("I am a spiritual person");
        req.setHobbies(java.util.Arrays.asList("Reading", "Yoga", "Meditation"));
        req.setFaith("Hindu");
        req.setCaste("Brahmin");
        req.setFoodHabits("Vegetarian");
        req.setReligiousPractices(java.util.Arrays.asList("Daily Puja", "Temple Visits"));
        req.setPartnerPreferences(java.util.Arrays.asList("Spiritual", "Educated"));

        mockMvc.perform(post("/api/profile/step3")
                        .header("Authorization", "Bearer " + testUserToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.aboutMe", is("I am a spiritual person")))
                .andExpect(jsonPath("$.faith", is("Hindu")))
                .andExpect(jsonPath("$.caste", is("Brahmin")));
    }

    @Test
    public void saveStep3_whenNoToken_thenReturns401() throws Exception {
        com.matrimony.dto.ProfileStep3Request req = new com.matrimony.dto.ProfileStep3Request();
        mockMvc.perform(post("/api/profile/step3")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isUnauthorized());
    }

    // --- GET /api/profile/combined ---

    @Test
    public void getCombinedProfile_whenValidToken_thenReturns200WithUserAndProfile() throws Exception {
        mockMvc.perform(get("/api/profile/combined")
                        .header("Authorization", "Bearer " + testUserToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.username", is("testuser")))
                .andExpect(jsonPath("$.profile.city", is("Test City")));
    }

    @Test
    public void getCombinedProfile_whenNoToken_thenReturns401() throws Exception {
        mockMvc.perform(get("/api/profile/combined"))
                .andExpect(status().isUnauthorized());
    }
}
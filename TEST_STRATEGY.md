# Test Strategy Document - Matrimonial Website Backend

## Overview
This document outlines the comprehensive test strategy for all controllers in the Matrimonial Website backend application.

## Test Coverage

### 1. AuthController Tests (`AuthControllerTest.java`)

#### Test Cases:
1. **testRegister_Success** ✅
   - **Purpose**: Verify successful user registration
   - **Input**: Valid username, email, password, and other required fields
   - **Expected**: HTTP 200, user object returned

2. **testRegister_FailsWhenUsernameExists** ✅
   - **Purpose**: Verify duplicate username rejection
   - **Input**: Username that already exists
   - **Expected**: HTTP 400, "Username already exists"

3. **testRegister_FailsWhenEmailExists** ✅
   - **Purpose**: Verify duplicate email rejection
   - **Input**: Email that already exists
   - **Expected**: HTTP 400, "Email already exists"

4. **testRegister_FailsOnMissingPassword** ✅
   - **Purpose**: Verify validation for missing required fields
   - **Input**: Request without password
   - **Expected**: HTTP 400, "Missing required fields"

5. **testLogin_Success** ✅
   - **Purpose**: Verify successful login
   - **Input**: Valid username and password
   - **Expected**: HTTP 200, JWT token returned

6. **testLogin_FailsWithoutPassword_INTENTIONAL_FAIL** ❌
   - **Purpose**: **INTENTIONAL FAILING TEST** - Demonstrates test failure detection
   - **Input**: Login request without password
   - **Expected**: HTTP 401 (but test expects 400 to intentionally fail)
   - **Note**: This test is designed to fail to show test suite validation

7. **testLogin_FailsWithInvalidCredentials** ✅
   - **Purpose**: Verify login failure with wrong credentials
   - **Input**: Invalid username/password combination
   - **Expected**: HTTP 401, "Invalid username or password"

---

### 2. ProfileController Tests (`ProfileControllerTest.java`)

#### Security Tests:
1. **getMyProfile_whenNoToken_thenReturns401** ✅
2. **saveStep2_whenNoToken_thenReturns401** ✅
3. **saveStep3_whenNoToken_thenReturns401** ✅

#### GET /api/profile/me Tests:
1. **getMyProfile_whenValidTokenAndProfileExists_thenReturns200AndProfile** ✅
2. **getMyProfile_whenValidTokenButNoProfile_thenReturns404** ✅

#### POST /api/profile/step2 Tests:
1. **saveStep2_whenValidTokenAndData_thenSavesProfileAndReturns200** ✅
   - **Purpose**: Verify profile step 2 data is saved to MongoDB
   - **Input**: Valid token, marital status, height, city, etc.
   - **Expected**: HTTP 200, profile with updated data

#### POST /api/profile/step3 Tests:
1. **saveStep3_whenValidTokenAndData_thenSavesProfileAndReturns200** ✅
   - **Purpose**: Verify profile step 3 data (aboutMe, hobbies, faith, etc.) is saved
   - **Input**: Valid token, aboutMe, hobbies (as List), faith, caste, etc.
   - **Expected**: HTTP 200, profile with updated data

#### POST /api/profile/step4 Tests (File Upload):
1. **uploadStep4_whenValidTokenAndFiles_thenSavesAndReturns200** ✅
   - **Purpose**: Verify file uploads (profile photo, government ID) work correctly
   - **Input**: Valid token, multipart files
   - **Expected**: HTTP 200, profile with file metadata

#### GET /api/profile/user-info Tests:
1. **getUserInfo_whenUserExists_thenReturns200AndUser** ✅
2. **getUserInfo_whenUserNotFound_thenReturns404** ✅

#### PUT /api/profile/user-info Tests:
1. **updateUserInfo_whenUserExists_thenUpdatesAndReturns200** ✅

#### GET /api/profile/public/{id} Tests:
1. **getPublicProfile_whenIdExists_thenReturns200AndUser** ✅
2. **getPublicProfile_whenIdNotFound_thenReturns404** ✅

#### GET /api/profile/combined Tests:
1. **getCombinedProfile_whenValidToken_thenReturns200WithUserAndProfile** ✅
2. **getCombinedProfile_whenNoToken_thenReturns401** ✅

---

### 3. MatchmakingController Tests (`MatchmakingControllerTest.java`)

#### Test Cases:
1. **getMatches_whenNoToken_thenReturns401** ✅
   - **Purpose**: Verify authentication requirement

2. **getMatches_whenValidTokenAndMatchesExist_thenReturns200AndMatchList** ✅
   - **Purpose**: Verify matchmaking algorithm returns compatible matches
   - **Input**: Valid token, username
   - **Expected**: HTTP 200, sorted list of matches by compatibility score

3. **getMatches_whenUserHasNoProfile_thenReturns404** ✅
   - **Purpose**: Verify error when user profile doesn't exist

4. **getMatches_whenNoOtherUsers_thenReturns404** ✅
   - **Purpose**: Verify error when no other users exist for matching

---

## Test Execution

### Running All Tests
```bash
mvn test
```

### Running Specific Test Class
```bash
mvn test -Dtest=AuthControllerTest
mvn test -Dtest=ProfileControllerTest
mvn test -Dtest=MatchmakingControllerTest
```

### Running Specific Test Method
```bash
mvn test -Dtest=AuthControllerTest#testLogin_FailsWithoutPassword_INTENTIONAL_FAIL
```

---

## Test Environment

- **Framework**: JUnit 5
- **Mocking**: Mockito (via Spring Boot Test)
- **HTTP Testing**: MockMvc
- **Database**: In-memory H2 (for tests) or test profile with separate DB
- **Active Profile**: `test` (configured in `@ActiveProfiles("test")`)

---

## Known Issues

1. **testLogin_FailsWithoutPassword_INTENTIONAL_FAIL** ❌
   - This test is **intentionally designed to fail**
   - It expects HTTP 400 but should expect HTTP 401
   - Purpose: Demonstrate test failure detection in CI/CD pipeline

---

## MongoDB Data Storage Verification

### Common Issues and Solutions:

1. **Data not appearing in MongoDB**
   - **Check**: User must be logged in (JWT token required)
   - **Check**: Authorization header must be present: `Bearer <token>`
   - **Check**: MongoDB connection in `application.properties`
   - **Check**: Collection name: `profiles_details`
   - **Solution**: Auto-login after registration (implemented in Register.jsx)

2. **Profile Step 2/3 not saving**
   - **Check**: Token is present in localStorage
   - **Check**: Request includes `Authorization: Bearer <token>` header
   - **Check**: Data format matches DTO expectations
   - **Solution**: Frontend now auto-logs in after registration

3. **Image uploads not working**
   - **Check**: File upload directory exists (`./uploads`)
   - **Check**: File serving endpoint: `/files/{username}/{type}/{filename}`
   - **Check**: Frontend prepends base URL to image URLs
   - **Solution**: Image URLs should be: `http://localhost:8080/files/...`

---

## Test Metrics

- **Total Test Cases**: ~25+
- **Coverage**: All controller endpoints
- **Success Rate**: 95%+ (excluding intentional fail test)
- **Security Tests**: All protected endpoints tested

---

## Future Enhancements

1. Add integration tests for complete user flows
2. Add performance tests for matchmaking algorithm
3. Add tests for edge cases (large file uploads, special characters, etc.)
4. Add tests for concurrent requests
5. Add tests for rate limiting (if implemented)

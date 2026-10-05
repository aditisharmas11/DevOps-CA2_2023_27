package com.matrimony.service;

import com.matrimony.dto.ProfileStep2Request;
import com.matrimony.dto.ProfileStep3Request;
import com.matrimony.dto.ProfileStep4Request;
import com.matrimony.model.Profile;
import com.matrimony.model.Profile.MediaItem;
import com.matrimony.model.Profile.DocumentItem;
import com.matrimony.repository.ProfileRepository;
import org.springframework.beans.factory.annotation.Value;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.*;
import java.time.Instant;
import java.util.*;

@Service
public class ProfileService {

    private final ProfileRepository profileRepo;
    private static final Logger log = LoggerFactory.getLogger(ProfileService.class);

    @Value("${file.upload-dir}")
    private String uploadDir;

    public ProfileService(ProfileRepository profileRepo) {
        this.profileRepo = profileRepo;
    }

    public Profile saveStep2(String username, ProfileStep2Request req) {
        log.info("[ProfileService] saveStep2 username={}", username);
        Profile profile = profileRepo.findByUsername(username).orElse(new Profile());
        profile.setUsername(username);

        profile.setMaritalStatus(req.getMaritalStatus());
        profile.setHeight(req.getHeight());
        profile.setWeight(req.getWeight());
        profile.setTimeOfBirth(req.getTimeOfBirth());
        profile.setPlaceOfBirth(req.getPlaceOfBirth());
        profile.setMotherTongue(req.getMotherTongue());
        profile.setEducation(req.getEducation());
        profile.setOccupation(req.getOccupation());
        profile.setAnnualIncome(req.getAnnualIncome());
        profile.setCity(req.getCity());
        profile.setCountry(req.getCountry());
        profile.setFamily(req.getFamily());

        Profile saved = profileRepo.save(profile);
        log.info("[ProfileService] saveStep2 saved id={} username={}", saved.getId(), saved.getUsername());
        return saved;
    }

    public Profile saveStep3(String username, ProfileStep3Request req) {
        log.info("[ProfileService] saveStep3 username={}", username);
        Profile profile = profileRepo.findByUsername(username).orElse(new Profile());
        profile.setUsername(username);

        profile.setAboutMe(req.getAboutMe());
        if (req.getHobbies() != null && !req.getHobbies().isEmpty()) {
            profile.setHobbies(String.join(",", req.getHobbies()));
        } else {
            profile.setHobbies(null);
        }
        profile.setFoodHabits(req.getFoodHabits());
        profile.setFitness(req.getFitness());
        profile.setSmokingDrinking(req.getSmokingDrinking());
        profile.setFaith(req.getFaith());
        profile.setCaste(req.getCaste());
        if (req.getReligiousPractices() != null && !req.getReligiousPractices().isEmpty()) {
            profile.setReligiousPractices(String.join(",", req.getReligiousPractices()));
        } else {
            profile.setReligiousPractices(null);
        }
        if (req.getPartnerPreferences() != null && !req.getPartnerPreferences().isEmpty()) {
            profile.setPartnerPreferences(String.join(",", req.getPartnerPreferences()));
        } else {
            profile.setPartnerPreferences(null);
        }

        Profile saved = profileRepo.save(profile);
        log.info("[ProfileService] saveStep3 saved id={} username={}", saved.getId(), saved.getUsername());
        return saved;
    }

    // ------------------ Step 4 ------------------
    public Profile saveStep4(String username, ProfileStep4Request req) throws IOException {
        log.info("[ProfileService] saveStep4 username={}", username);
        Profile profile = profileRepo.findByUsername(username).orElse(new Profile());
        profile.setUsername(username);

        Path userBase = Paths.get(uploadDir, username);
        Files.createDirectories(userBase);

        // ✅ Profile Photo
        MultipartFile profilePhoto = req.getProfilePhoto();
        if (profilePhoto != null && !profilePhoto.isEmpty()) {
            Path dir = userBase.resolve("profile-photo");
            Files.createDirectories(dir);
            String stored = storeFile(profilePhoto, dir);

            MediaItem m = new MediaItem();
            m.setFilename(stored);
            m.setOriginalName(profilePhoto.getOriginalFilename());
            m.setContentType(profilePhoto.getContentType());
            m.setUrl("/files/" + username + "/profile-photo/" + stored);
            m.setUploadedAt(Instant.now());
            profile.setProfilePhoto(m);
        }

        // ✅ Additional Photos
        MultipartFile[] additionalPhotos = req.getAdditionalPhotos();
        if (additionalPhotos != null && additionalPhotos.length > 0) {
            List<MediaItem> photos = profile.getAdditionalPhotos() != null ? profile.getAdditionalPhotos() : new ArrayList<>();
            Path dir = userBase.resolve("photos");
            Files.createDirectories(dir);
            for (MultipartFile file : additionalPhotos) {
                if (file == null || file.isEmpty()) continue;
                String stored = storeFile(file, dir);

                MediaItem m = new MediaItem();
                m.setFilename(stored);
                m.setOriginalName(file.getOriginalFilename());
                m.setContentType(file.getContentType());
                m.setUrl("/files/" + username + "/photos/" + stored);
                m.setUploadedAt(Instant.now());
                photos.add(m);
            }
            profile.setAdditionalPhotos(photos);
        }

        // ✅ Horoscope
        MultipartFile horoscope = req.getHoroscope();
        if (horoscope != null && !horoscope.isEmpty()) {
            Path dir = userBase.resolve("horoscope");
            Files.createDirectories(dir);
            String stored = storeFile(horoscope, dir);

            MediaItem m = new MediaItem();
            m.setFilename(stored);
            m.setOriginalName(horoscope.getOriginalFilename());
            m.setContentType(horoscope.getContentType());
            m.setUrl("/files/" + username + "/horoscope/" + stored);
            m.setUploadedAt(Instant.now());
            profile.setHoroscope(m);
        }

        // ✅ Government ID
        MultipartFile governmentId = req.getGovernmentId();
        if (governmentId != null && !governmentId.isEmpty()) {
            Path dir = userBase.resolve("idproof");
            Files.createDirectories(dir);
            String stored = storeFile(governmentId, dir);

            DocumentItem d = new DocumentItem();
            d.setFilename(stored);
            d.setOriginalName(governmentId.getOriginalFilename());
            d.setContentType(governmentId.getContentType());
            d.setPath(userBase.resolve("idproof").resolve(stored).toString());
            d.setUploadedAt(Instant.now());
            d.setForAdminOnly(true);
            profile.setIdProof(d);
        }

        Profile saved = profileRepo.save(profile);
        log.info("[ProfileService] saveStep4 saved id={} username={}", saved.getId(), saved.getUsername());
        return saved;
    }

    // ------------------ File Storage Helper ------------------
    private String storeFile(MultipartFile file, Path destDir) throws IOException {
        String originalFilename = StringUtils.cleanPath(file.getOriginalFilename());
        if (originalFilename.contains("..")) {
            throw new IllegalArgumentException("Invalid file path: " + originalFilename);
        }

        String ext = "";
        int dotIndex = originalFilename.lastIndexOf('.');
        if (dotIndex >= 0) {
            ext = originalFilename.substring(dotIndex);
        }

        String filename = UUID.randomUUID() + ext;
        Files.createDirectories(destDir);

        Path targetPath = destDir.resolve(filename).normalize();
        Files.copy(file.getInputStream(), targetPath, StandardCopyOption.REPLACE_EXISTING);

        return filename;
    }

    // ------------------ Get Profile ------------------
    public Optional<Profile> getProfile(String username) {
        return profileRepo.findByUsername(username);
    }
}

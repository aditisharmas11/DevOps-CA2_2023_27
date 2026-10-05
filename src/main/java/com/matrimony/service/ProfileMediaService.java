package com.matrimony.service;

import com.matrimony.model.Profile;
import com.matrimony.model.Profile.DocumentItem;
import com.matrimony.model.Profile.MediaItem;
import com.matrimony.repository.ProfileRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.*;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class ProfileMediaService {

    @Value("${file.upload-dir}")
    private String uploadDir;

    private final ProfileRepository profileRepository;

    public ProfileMediaService(ProfileRepository profileRepository) {
        this.profileRepository = profileRepository;
    }

    private Path userDir(String username) {
        return Paths.get(uploadDir).resolve(username);
    }

    private String storeFile(MultipartFile file, Path destDir) throws IOException {
        String original = StringUtils.cleanPath(file.getOriginalFilename());
        String ext = "";
        int i = original.lastIndexOf('.');
        if (i >= 0) ext = original.substring(i);
        String filename = UUID.randomUUID().toString() + ext;
        Files.createDirectories(destDir);
        Path target = destDir.resolve(filename);
        Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);
        return filename;
    }

    // Allowed types helper
    private boolean isAllowedImage(String contentType) {
        return contentType != null && (contentType.equals("image/jpeg") ||
                contentType.equals("image/png") ||
                contentType.equals("image/jpg"));
    }

    private boolean isAllowedPdfOrImage(String contentType) {
        return isAllowedImage(contentType) || "application/pdf".equals(contentType);
    }

    public Profile saveStep4Files(String username,
                                  MultipartFile profilePhoto,
                                  MultipartFile[] additionalPhotos,
                                  MultipartFile horoscope,
                                  MultipartFile idProof) throws IOException {

        Profile profile = profileRepository.findByUsername(username).orElse(new Profile());
        profile.setUsername(username);

        Path userBase = userDir(username);
        // profile photo
        if (profilePhoto != null && !profilePhoto.isEmpty()) {
            if (!isAllowedImage(profilePhoto.getContentType()))
                throw new IllegalArgumentException("Profile photo must be JPG or PNG");

            Path dir = userBase.resolve("photos");
            String stored = storeFile(profilePhoto, dir);

            MediaItem m = new MediaItem();
            m.setFilename(stored);
            m.setOriginalName(profilePhoto.getOriginalFilename());
            m.setContentType(profilePhoto.getContentType());
            m.setUrl("/files/" + username + "/photos/" + stored); // optional url mapping
            m.setUploadedAt(Instant.now());
            profile.setProfilePhoto(m);
        }

        // additional photos
        if (additionalPhotos != null) {
            List<MediaItem> list = profile.getAdditionalPhotos() == null ? new ArrayList<>() : profile.getAdditionalPhotos();
            Path dir = userBase.resolve("photos");
            for (MultipartFile f : additionalPhotos) {
                if (f == null || f.isEmpty()) continue;
                if (!isAllowedImage(f.getContentType())) continue; // skip invalid
                String stored = storeFile(f, dir);
                MediaItem m = new MediaItem();
                m.setFilename(stored);
                m.setOriginalName(f.getOriginalFilename());
                m.setContentType(f.getContentType());
                m.setUrl("/files/" + username + "/photos/" + stored);
                m.setUploadedAt(Instant.now());
                list.add(m);
            }
            profile.setAdditionalPhotos(list);
        }

        // horoscope (pdf or image)
        if (horoscope != null && !horoscope.isEmpty()) {
            if (!isAllowedPdfOrImage(horoscope.getContentType()))
                throw new IllegalArgumentException("Horoscope must be PDF or image");

            Path dir = userBase.resolve("horoscope");
            String stored = storeFile(horoscope, dir);
            MediaItem m = new MediaItem();
            m.setFilename(stored);
            m.setOriginalName(horoscope.getOriginalFilename());
            m.setContentType(horoscope.getContentType());
            m.setUrl("/files/" + username + "/horoscope/" + stored);
            m.setUploadedAt(Instant.now());
            profile.setHoroscope(m);
        }

        // id proof — store but mark for admin only
        if (idProof != null && !idProof.isEmpty()) {
            // allow pdf/image
            if (!isAllowedPdfOrImage(idProof.getContentType()))
                throw new IllegalArgumentException("ID Proof must be PDF or image");

            Path dir = userBase.resolve("idproof");
            String stored = storeFile(idProof, dir);

            DocumentItem d = new DocumentItem();
            d.setFilename(stored);
            d.setOriginalName(idProof.getOriginalFilename());
            d.setContentType(idProof.getContentType());
            d.setPath(userBase.resolve("idproof").resolve(stored).toString()); // full path for admin use
            d.setUploadedAt(Instant.now());
            d.setForAdminOnly(true);
            profile.setIdProof(d);
        }

        return profileRepository.save(profile);
    }
}

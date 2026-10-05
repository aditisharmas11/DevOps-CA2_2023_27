package com.matrimony.dto;

import org.springframework.web.multipart.MultipartFile;

public class ProfileStep4Request {

    private MultipartFile profilePhoto;
    private MultipartFile[] additionalPhotos; // ✅ array instead of List
    private MultipartFile horoscope;
    private MultipartFile governmentId;

    public MultipartFile getProfilePhoto() {
        return profilePhoto;
    }
    public void setProfilePhoto(MultipartFile profilePhoto) {
        this.profilePhoto = profilePhoto;
    }

    public MultipartFile[] getAdditionalPhotos() {
        return additionalPhotos;
    }
    public void setAdditionalPhotos(MultipartFile[] additionalPhotos) {
        this.additionalPhotos = additionalPhotos;
    }

    public MultipartFile getHoroscope() {
        return horoscope;
    }
    public void setHoroscope(MultipartFile horoscope) {
        this.horoscope = horoscope;
    }

    public MultipartFile getGovernmentId() {
        return governmentId;
    }
    public void setGovernmentId(MultipartFile governmentId) {
        this.governmentId = governmentId;
    }
}

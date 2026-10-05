package com.matrimony.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.List;

@Document(collection = "profiles_details")
public class Profile {

    @Id
    private String id;

    private String username;

    // ---- Existing fields for step 2 & 3 ----
    private String maritalStatus;
    private String height;
    private String weight;
    private String timeOfBirth;
    private String placeOfBirth;
    private String motherTongue;
    private String education;
    private String occupation;
    private String annualIncome;
    private String city;
    private String country;
    private com.matrimony.model.FamilyDetails family;
    private String aboutMe;
    private String hobbies;
    private String foodHabits;
    private String fitness;
    private String smokingDrinking;
    private String faith;
    private String caste;
    private String religiousPractices;
    private String partnerPreferences;

    // ---- Step 4 fields ----
    private MediaItem profilePhoto;
    private List<MediaItem> additionalPhotos;
    private MediaItem horoscope;
    private DocumentItem idProof;

    // ---- Inner classes ----
    public static class MediaItem {
        private String filename;
        private String originalName;
        private String contentType;
        private String url;
        private Instant uploadedAt;

        // Getters & setters
        public String getFilename() {
            return filename;
        }
        public void setFilename(String filename) {
            this.filename = filename;
        }
        public String getOriginalName() {
            return originalName;
        }
        public void setOriginalName(String originalName) {
            this.originalName = originalName;
        }
        public String getContentType() {
            return contentType;
        }
        public void setContentType(String contentType) {
            this.contentType = contentType;
        }
        public String getUrl() {
            return url;
        }
        public void setUrl(String url) {
            this.url = url;
        }
        public Instant getUploadedAt() {
            return uploadedAt;
        }
        public void setUploadedAt(Instant uploadedAt) {
            this.uploadedAt = uploadedAt;
        }
    }

    public static class DocumentItem {
        private String filename;
        private String originalName;
        private String contentType;
        private String path;
        private Instant uploadedAt;
        private boolean forAdminOnly;

        // Getters & setters
        public String getFilename() {
            return filename;
        }
        public void setFilename(String filename) {
            this.filename = filename;
        }
        public String getOriginalName() {
            return originalName;
        }
        public void setOriginalName(String originalName) {
            this.originalName = originalName;
        }
        public String getContentType() {
            return contentType;
        }
        public void setContentType(String contentType) {
            this.contentType = contentType;
        }
        public String getPath() {
            return path;
        }
        public void setPath(String path) {
            this.path = path;
        }
        public Instant getUploadedAt() {
            return uploadedAt;
        }
        public void setUploadedAt(Instant uploadedAt) {
            this.uploadedAt = uploadedAt;
        }
        public boolean isForAdminOnly() {
            return forAdminOnly;
        }
        public void setForAdminOnly(boolean forAdminOnly) {
            this.forAdminOnly = forAdminOnly;
        }
    }

    // ---- Getters & setters for profile fields ----
    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getMaritalStatus() {
        return maritalStatus;
    }

    public void setMaritalStatus(String maritalStatus) {
        this.maritalStatus = maritalStatus;
    }

    public String getHeight() {
        return height;
    }

    public void setHeight(String height) {
        this.height = height;
    }

    public String getWeight() {
        return weight;
    }

    public void setWeight(String weight) {
        this.weight = weight;
    }

    public String getTimeOfBirth() {
        return timeOfBirth;
    }

    public void setTimeOfBirth(String timeOfBirth) {
        this.timeOfBirth = timeOfBirth;
    }

    public String getPlaceOfBirth() {
        return placeOfBirth;
    }

    public void setPlaceOfBirth(String placeOfBirth) {
        this.placeOfBirth = placeOfBirth;
    }

    public String getMotherTongue() {
        return motherTongue;
    }

    public void setMotherTongue(String motherTongue) {
        this.motherTongue = motherTongue;
    }

    public String getEducation() {
        return education;
    }

    public void setEducation(String education) {
        this.education = education;
    }

    public String getOccupation() {
        return occupation;
    }

    public void setOccupation(String occupation) {
        this.occupation = occupation;
    }

    public String getAnnualIncome() {
        return annualIncome;
    }

    public void setAnnualIncome(String annualIncome) {
        this.annualIncome = annualIncome;
    }

    public String getCity() {
        return city;
    }

    public void setCity(String city) {
        this.city = city;
    }

    public String getCountry() {
        return country;
    }

    public void setCountry(String country) {
        this.country = country;
    }

    public com.matrimony.model.FamilyDetails getFamily() {
        return family;
    }

    public void setFamily(com.matrimony.model.FamilyDetails family) {
        this.family = family;
    }

    public String getAboutMe() {
        return aboutMe;
    }

    public void setAboutMe(String aboutMe) {
        this.aboutMe = aboutMe;
    }

    public String getHobbies() {
        return hobbies;
    }

    public void setHobbies(String hobbies) {
        this.hobbies = hobbies;
    }

    public String getFoodHabits() {
        return foodHabits;
    }

    public void setFoodHabits(String foodHabits) {
        this.foodHabits = foodHabits;
    }

    public String getFitness() {
        return fitness;
    }

    public void setFitness(String fitness) {
        this.fitness = fitness;
    }

    public String getSmokingDrinking() {
        return smokingDrinking;
    }

    public void setSmokingDrinking(String smokingDrinking) {
        this.smokingDrinking = smokingDrinking;
    }

    public String getFaith() {
        return faith;
    }

    public void setFaith(String faith) {
        this.faith = faith;
    }

    public String getCaste() {
        return caste;
    }

    public void setCaste(String caste) {
        this.caste = caste;
    }

    public String getReligiousPractices() {
        return religiousPractices;
    }

    public void setReligiousPractices(String religiousPractices) {
        this.religiousPractices = religiousPractices;
    }

    public String getPartnerPreferences() {
        return partnerPreferences;
    }

    public void setPartnerPreferences(String partnerPreferences) {
        this.partnerPreferences = partnerPreferences;
    }

    public MediaItem getProfilePhoto() {
        return profilePhoto;
    }

    public void setProfilePhoto(MediaItem profilePhoto) {
        this.profilePhoto = profilePhoto;
    }

    public List<MediaItem> getAdditionalPhotos() {
        return additionalPhotos;
    }

    public void setAdditionalPhotos(List<MediaItem> additionalPhotos) {
        this.additionalPhotos = additionalPhotos;
    }

    public MediaItem getHoroscope() {
        return horoscope;
    }

    public void setHoroscope(MediaItem horoscope) {
        this.horoscope = horoscope;
    }

    public DocumentItem getIdProof() {
        return idProof;
    }

    public void setIdProof(DocumentItem idProof) {
        this.idProof = idProof;
    }
}

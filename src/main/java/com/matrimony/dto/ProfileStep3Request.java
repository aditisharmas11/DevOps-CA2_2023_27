package com.matrimony.dto;

import lombok.Data;
import java.util.List;

@Data
public class ProfileStep3Request {
    private String aboutMe;
    private List<String> hobbies;
    private String foodHabits;
    private String fitness;
    private String smokingDrinking;
    private String faith;
    private String caste;
    private List<String> religiousPractices;
    private List<String> partnerPreferences;

    public String getAboutMe() {
        return aboutMe;
    }

    public void setAboutMe(String aboutMe) {
        this.aboutMe = aboutMe;
    }

    public List<String> getHobbies() {
        return hobbies;
    }

    public void setHobbies(List<String> hobbies) {
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

    public List<String> getReligiousPractices() {
        return religiousPractices;
    }

    public void setReligiousPractices(List<String> religiousPractices) {
        this.religiousPractices = religiousPractices;
    }

    public List<String> getPartnerPreferences() {
        return partnerPreferences;
    }

    public void setPartnerPreferences(List<String> partnerPreferences) {
        this.partnerPreferences = partnerPreferences;
    }
}

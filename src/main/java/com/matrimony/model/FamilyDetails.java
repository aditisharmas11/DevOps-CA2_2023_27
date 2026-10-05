package com.matrimony.model;

import lombok.Data;

@Data
public class FamilyDetails {
    private String fatherName;
    private String fatherOccupation;
    private String motherName;
    private String motherOccupation;
    private int brothers;
    private int sisters;
}

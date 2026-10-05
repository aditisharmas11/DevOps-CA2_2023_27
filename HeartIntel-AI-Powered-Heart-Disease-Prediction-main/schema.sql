CREATE DATABASE IF NOT EXISTS heart_disease_db;
USE heart_disease_db;

CREATE TABLE IF NOT EXISTS users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS heart_disease_data (
    user_id INT PRIMARY KEY,
    name VARCHAR(255),
    age INT,
    gender VARCHAR(50),
    chest_pain INT,
    bp INT,
    cholesterol INT,
    sugar_level INT,
    ecg_issues INT,
    max_hr INT,
    exercise_angina VARCHAR(50),
    oldpeak DOUBLE,
    st_slope INT,
    prediction_result VARCHAR(255),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

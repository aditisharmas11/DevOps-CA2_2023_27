def get_questions():
    """
    Returns a list of questions for the mental health assessment.
    
    Each question has:
    - id: Unique identifier
    - text: The question text
    - options: List of possible answers
    - categories: List of categories this question belongs to (anxiety, depression, stress, self_esteem)
    - reverse_score: Boolean indicating if scoring should be reversed (for positively worded questions)
    """
    
    questions = [
        {
            "id": "q1",
            "text": "How often do you feel worried or nervous without a specific reason?",
            "options": ["Never", "Rarely", "Sometimes", "Often", "All the time"],
            "categories": ["anxiety"],
            "reverse_score": False
        },
        {
            "id": "q2",
            "text": "Do you find it difficult to stop worrying once you start?",
            "options": ["Not at all", "A little bit", "Somewhat", "Quite a bit", "Extremely"],
            "categories": ["anxiety"],
            "reverse_score": False
        },
        {
            "id": "q3",
            "text": "How often do you feel sad or down for most of the day?",
            "options": ["Never", "Rarely", "Sometimes", "Often", "All the time"],
            "categories": ["depression"],
            "reverse_score": False
        },
        {
            "id": "q4",
            "text": "How often do you find it difficult to enjoy activities that you used to like?",
            "options": ["Never", "Rarely", "Sometimes", "Often", "All the time"],
            "categories": ["depression"],
            "reverse_score": False
        },
        {
            "id": "q5",
            "text": "How would you rate your ability to cope with the demands in your life?",
            "options": ["Excellent", "Good", "Fair", "Poor", "Very poor"],
            "categories": ["stress"],
            "reverse_score": True
        },
        {
            "id": "q6",
            "text": "How often do you feel overwhelmed by schoolwork or other responsibilities?",
            "options": ["Never", "Rarely", "Sometimes", "Often", "All the time"],
            "categories": ["stress"],
            "reverse_score": False
        },
        {
            "id": "q7",
            "text": "I feel good about myself overall.",
            "options": ["Strongly agree", "Agree", "Neutral", "Disagree", "Strongly disagree"],
            "categories": ["self_esteem"],
            "reverse_score": True
        },
        {
            "id": "q8",
            "text": "I believe I am worthy of respect and good things in life.",
            "options": ["Strongly agree", "Agree", "Neutral", "Disagree", "Strongly disagree"],
            "categories": ["self_esteem"],
            "reverse_score": True
        },
        {
            "id": "q9",
            "text": "How often do you experience physical symptoms when stressed (like headaches, stomach aches, trouble sleeping)?",
            "options": ["Never", "Rarely", "Sometimes", "Often", "All the time"],
            "categories": ["anxiety", "stress"],
            "reverse_score": False
        },
        {
            "id": "q10",
            "text": "I find it hard to concentrate on tasks or activities.",
            "options": ["Not at all", "A little bit", "Somewhat", "Quite a bit", "Extremely"],
            "categories": ["depression", "stress"],
            "reverse_score": False
        },
        {
            "id": "q11",
            "text": "How often do you feel overwhelmed by negative thoughts?",
            "options": ["Never", "Rarely", "Sometimes", "Often", "All the time"],
            "categories": ["depression", "anxiety"],
            "reverse_score": False
        },
        {
            "id": "q12",
            "text": "How comfortable do you feel talking about your problems with others?",
            "options": ["Very comfortable", "Comfortable", "Neutral", "Uncomfortable", "Very uncomfortable"],
            "categories": ["self_esteem", "anxiety"],
            "reverse_score": True
        },
        {
            "id": "q13",
            "text": "I feel hopeful about my future.",
            "options": ["Strongly agree", "Agree", "Neutral", "Disagree", "Strongly disagree"],
            "categories": ["depression", "self_esteem"],
            "reverse_score": True
        },
        {
            "id": "q14",
            "text": "How often do you have trouble sleeping?",
            "options": ["Never", "Rarely", "Sometimes", "Often", "All the time"],
            "categories": ["anxiety", "depression", "stress"],
            "reverse_score": False
        },
        {
            "id": "q15",
            "text": "I feel supported by friends and/or family.",
            "options": ["Strongly agree", "Agree", "Neutral", "Disagree", "Strongly disagree"],
            "categories": ["self_esteem", "depression"],
            "reverse_score": True
        },
        {
            "id": "q16",
            "text": "How often do you feel overwhelmed by social situations?",
            "options": ["Never", "Rarely", "Sometimes", "Often", "All the time"],
            "categories": ["anxiety", "self_esteem"],
            "reverse_score": False
        },
        {
            "id": "q17",
            "text": "I am able to manage my emotions in a healthy way.",
            "options": ["Strongly agree", "Agree", "Neutral", "Disagree", "Strongly disagree"],
            "categories": ["stress", "self_esteem"],
            "reverse_score": True
        },
        {
            "id": "q18",
            "text": "How often do you experience sudden feelings of panic or fear?",
            "options": ["Never", "Rarely", "Sometimes", "Often", "All the time"],
            "categories": ["anxiety"],
            "reverse_score": False
        },
        {
            "id": "q19",
            "text": "I'm satisfied with my relationships with others.",
            "options": ["Strongly agree", "Agree", "Neutral", "Disagree", "Strongly disagree"],
            "categories": ["depression", "self_esteem"],
            "reverse_score": True
        },
        {
            "id": "q20",
            "text": "How often do you use healthy coping strategies when feeling stressed or upset?",
            "options": ["Always", "Often", "Sometimes", "Rarely", "Never"],
            "categories": ["stress", "anxiety", "depression"],
            "reverse_score": True
        }
    ]
    
    return questions

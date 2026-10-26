import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { assessmentQuestions } from "../shared/schema.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { setupAuth } from "./auth";

const MODEL_NAME = "gemini-3.8-flash";

// Initialize gemenai ai 


export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication
  setupAuth(app);

  // API routes

  // Assessment routes
  app.post("/api/assessment/analyze", async (req, res) => {

    try {
      const { answers } = req.body;
      if (!answers || Object.keys(answers).length === 0) {
        return res.status(400).json({ message: "No answers provided" });
      }

      // Calculate scores based on answers
      const moodQuestions = assessmentQuestions.filter(q => q.category === 'mood');
      const anxietyQuestions = assessmentQuestions.filter(q => q.category === 'anxiety');
      const socialQuestions = assessmentQuestions.filter(q => q.category === 'social');

      let moodScore = 0;
      let anxietyScore = 0;
      let socialScore = 0;

      // Calculate score for each category (0-100 scale, inverse for anxiety where lower is better)
      moodQuestions.forEach(q => {
        const value = answers[q.id] || 0;
        // Convert to scale where 0 (not at all) is 100% and 3 (nearly every day) is 0%
        moodScore += (3 - value) / 3 * 100 / moodQuestions.length;
      });

      anxietyQuestions.forEach(q => {
        const value = answers[q.id] || 0;
        // Convert to scale where 0 (not at all) is 100% and 3 (nearly every day) is 0%
        anxietyScore += (3 - value) / 3 * 100 / anxietyQuestions.length;
      });

      socialQuestions.forEach(q => {
        const value = answers[q.id] || 0;
        // Convert to scale where 0 (not at all) is 100% and 3 (nearly every day) is 0%
        socialScore += (3 - value) / 3 * 100 / socialQuestions.length;
      });

      // Overall score is average of all categories
      const overallScore = Math.round((moodScore + anxietyScore + socialScore) / 3);

      // Round scores
      moodScore = Math.round(moodScore);
      anxietyScore = Math.round(anxietyScore);
      socialScore = Math.round(socialScore);

      // Generate recommendations and summary using gemenai ai 
      let recommendations = [];
      let summary = "";

      try {
        // Format questions and answers for OpenAI
        const questionsWithAnswers = assessmentQuestions.map(q => {
          const answerValue = answers[q.id] || 0;
          const selectedOption = q.options.find(opt => opt.value === answerValue);
          return {
            question: q.text,
            answer: selectedOption?.text || "No answer",
            category: q.category
          };
        });

        const prompt = `
          You are a mental health support system for teenagers. Based on the following assessment responses, generate:
          
          1. A brief summary of the teen's mental health status (2-3 sentences)
          2. Three specific recommendations that could help them

          For recommendations, format them as a JSON array with these fields:
          - title: short action title
          - description: brief explanation
          - icon: choose one of "heart", "book", or "users"
          
          Here are their scores:
          - Overall wellness: ${overallScore}/100
          - Mood & emotions: ${moodScore}/100
          - Anxiety levels: ${anxietyScore}/100
          - Social connections: ${socialScore}/100
          
          These are their assessment responses:
          ${JSON.stringify(questionsWithAnswers, null, 2)}
          
          Respond in this JSON format:
          {
            "summary": "A 2-3 sentence summary of their mental health status and what the scores indicate",
            "recommendations": [
              {
                "title": "Recommendation 1",
                "description": "Brief explanation of recommendation 1",
                "icon": "heart"
              },
              {
                "title": "Recommendation 2",
                "description": "Brief explanation of recommendation 2",
                "icon": "book"
              },
              {
                "title": "Recommendation 3",
                "description": "Brief explanation of recommendation 3",
                "icon": "users"
              }
            ]
          }
        `;
        const apiKey = process.env.GEMINI_API_KEY;

        if (apiKey && apiKey.trim() !== "") {
          try {
            const genAI = new GoogleGenerativeAI(apiKey);

            const model = genAI.getGenerativeModel({
              model: MODEL_NAME
            });

            const withTimeout = <T>(p: Promise<T>, ms: number) =>
              Promise.race([
                p,
                new Promise<T>((_, reject) => setTimeout(() => reject(new Error("Gemini timeout")), ms)),
              ]);

            const aiResult = await withTimeout(model.generateContent(prompt), 10000);
            const text = aiResult.response.text();

            try {
              const cleanText = text.replace(/```json|```/g, "").trim();
              const parsed = JSON.parse(cleanText);

              summary = parsed.summary ?? "";
              recommendations = parsed.recommendations ?? [];

            } catch (e) {
              console.log("⚠️ JSON parse failed");
            }

          } catch (err) {
            console.error(
              "Assessment Gemini request failed:",
              err instanceof Error ? err.name : "Unknown error",
            );
          }
        }

        // Only fallback if Gemini did not generate summary or recommendations
        if (!summary || !recommendations || recommendations.length === 0) {
          summary = `Your overall wellness score is ${overallScore}/100. Based on your responses, you are navigating daily stresses with self-awareness. Consider incorporating mindful rest and balanced routines.`;
          recommendations = getFallbackRecommendations();
        }

        // Create assessment result
        const predictions = generateMentalHealthPredictions(
          moodScore,
          anxietyScore,
          socialScore
        );
        const result = {
          overallScore,
          moodScore,
          anxietyScore,
          socialScore,
          summary,
          predictions,
          recommendations
        };

        // Store assessment in database (associate with user if authenticated)
        const userId = req.isAuthenticated() && req.user ? req.user.id : null;
        await storage.createAssessment({
          userId,
          answers,
          results: result
        });

        res.json(result);
      } catch (error) {
        console.error("Error analyzing assessment:", error);
        res.status(500).json({ message: "Failed to analyze assessment" });
      }
    } catch (error) {   // ✅ ADD THIS BLOCK
      console.error("Outer error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // Assessment history endpoint for authenticated user
  app.get("/api/assessment/history", async (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    try {
      const history = await storage.getAssessmentsByUserId(req.user.id);
      res.json(history);
    } catch (error) {
      console.error("Error fetching assessment history:", error);
      res.status(500).json({ message: "Failed to fetch assessment history" });
    }
  });

  app.post("/api/chat", async (req, res) => {
    try {
      const { messages } = req.body;

      if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ message: "Messages required" });
      }

      // Extract last user message
      const lastMessage = messages[messages.length - 1]?.content || "";

      // Crisis escalation check
      const crisisPattern = /\b(suicide|kill myself|end my life|self[- ]?harm|cutting myself|die|want to die|take my own life)\b/i;
      const isCrisis = crisisPattern.test(lastMessage);

      if (isCrisis) {
        const crisisResponse = "I'm really concerned about what you're sharing. Please know that you are not alone, your life is valuable, and immediate help is here for you. Please connect right away with the Suicide & Crisis Lifeline by calling or texting 988 (free, confidential, 24/7). You can also text HOME to 741741 to speak with a trained crisis counselor, or call 911 if you are in immediate danger. Please reach out to a trusted family member, teacher, or counselor right now.";
        return res.json({
          message: {
            role: "assistant",
            content: crisisResponse,
          },
        });
      }

      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey || apiKey.trim() === "") {
        const fallbackText = generateRuleBasedResponse(lastMessage.toLowerCase(), "", "");
        return res.json({
          message: {
            role: "assistant",
            content: fallbackText,
          },
        });
      }

      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: MODEL_NAME });

        const prompt = `You are ZenGen Assistant, an empathetic, supportive mental health companion designed specifically for teenagers.
Guidelines:
- Provide clear, actionable, practical coping advice in 2-4 sentences.
- Use a calm, reassuring, and non-judgmental tone.
- Clearly state that you are an AI wellness companion, not a licensed therapist or physician, and do not provide clinical diagnoses.
- If the user expresses thoughts of self-harm, suicide, or severe crisis, prioritize safety: urge them to contact emergency services (911) or the 988 Suicide & Crisis Lifeline (call/text 988 or text HOME to 741741).

User message: ${lastMessage}`;

        const withTimeout = <T>(p: Promise<T>, ms: number) =>
          Promise.race([
            p,
            new Promise<T>((_, reject) => setTimeout(() => reject(new Error("Gemini timeout")), ms)),
          ]);

        const result = await withTimeout(model.generateContent(prompt), 10000);
        const response = await result.response;
        const text = response.text().trim();

        const assistantMessage = {
          role: "assistant",
          content: text,
        };

        if (req.isAuthenticated() && req.user) {
          try {
            await storage.createChatMessage({
              userId: req.user.id,
              role: "user",
              content: lastMessage,
            });
            await storage.createChatMessage({
              userId: req.user.id,
              role: "assistant",
              content: text,
            });
          } catch (dbErr) {
            console.error("Could not save chat message to db:", dbErr);
          }
        }

        res.json({ message: assistantMessage });
      } catch (geminiError) {
        console.error("Gemini chat error, using supportive fallback:", geminiError);
        const fallbackText = generateRuleBasedResponse(lastMessage.toLowerCase(), "", "");
        res.json({
          message: {
            role: "assistant",
            content: fallbackText,
          },
        });
      }
    } catch (error) {
      console.error("Chat error:", error);
      res.status(500).json({
        message: {
          role: "assistant",
          content: "I'm having trouble processing your message right now. If you're in distress, please call or text 988 for immediate help.",
        },
      });
    }
  });

  // Helper function for rule-based chat responses
  function generateRuleBasedResponse(userMessage: string, conversationHistory: string, allUserMessages: string): string {
    // Categories of responses to choose from - all solution-focused, not question-based
    const greetingResponses = [
      "Hi there! I'm here to provide practical mental health strategies and solutions. I'll offer specific techniques that can help immediately.",
      "Hello! I'm ready to share proven coping methods for whatever challenges you're facing. I focus on clear, actionable advice.",
      "Welcome! I'm designed to offer direct, solution-based strategies for mental health concerns rather than just asking questions.",
      "Hey there! I'm your mental health solution provider focused on giving you specific techniques to try right away."
    ];

    const wellBeingResponses = [
      "Here are some quick wellness boosters: 5 minutes of mindful breathing, a short walk outside, or writing down 3 things you're grateful for. These activate your parasympathetic nervous system.",
      "Try this quick grounding technique when feeling overwhelmed: identify 5 things you can see, 4 you can touch, 3 you can hear, 2 you can smell, and 1 you can taste.",
      "Some effective self-care practices include: maintaining a regular sleep schedule, getting 20 minutes of daily physical movement, limiting social media to specific times, and connecting with supportive people.",
      "Your mental well-being benefits from routine. I recommend implementing a daily practice of 10 minutes of meditation, journaling, or gentle stretching to build resilience."
    ];

    const anxietyResponses = [
      "To reduce anxiety quickly, try 4-7-8 breathing: inhale for 4 counts, hold for 7, exhale for 8. Also effective are progressive muscle relaxation and the 5-4-3-2-1 grounding technique.",
      "For anxiety management: Practice box breathing (4 counts in, 4 hold, 4 out, 4 hold), get regular physical exercise, and challenge catastrophic thoughts with evidence-based alternatives.",
      "For immediate anxiety relief: Place your hand on your chest, take 5 deep breaths, and focus on naming things around you. Long-term, limit caffeine and practice daily mindfulness for 10 minutes.",
      "Combat anxiety with these proven strategies: scheduled worry time (15 minutes daily), regular cardio exercise 3 times weekly, and progressive muscle relaxation before bed."
    ];

    const depressionResponses = [
      "To counter depression symptoms: 1) Set one small achievable goal daily 2) Get 10 minutes of morning sunlight 3) Move your body for 20 minutes 4) Connect with one supportive person.",
      "Depression-fighting strategies: Maintain regular sleep/wake times, engage in physical activity even briefly, eat regular meals, and schedule one small pleasurable activity each day.",
      "Practical steps to lift your mood: Create a consistent daily routine, spend 15 minutes in nature, limit alcohol and processed foods, and practice self-compassion statements daily.",
      "Evidence-based depression tactics: Behavioral activation (doing activities even when you don't feel like it), regular physical exercise, social connection, and tracking small wins daily."
    ];

    const sleepResponses = [
      "For better sleep: 1) Keep consistent sleep/wake times 2) Create a 30-minute wind-down routine 3) Remove screens 1 hour before bed 4) Keep your bedroom cool and dark.",
      "Sleep improvement tactics: Limit caffeine after noon, expose yourself to bright light in the morning, avoid alcohol before bed, and try a relaxation audio before sleeping.",
      "To enhance sleep quality: Take a warm shower before bed, use your bed only for sleep (not work/screens), practice 4-7-8 breathing, and write down worries before bedtime to clear your mind.",
      "Proven sleep strategies: Regular exercise (but not within 2 hours of bedtime), avoiding large meals before bed, using white noise if helpful, and creating a comfortable sleep environment."
    ];

    const schoolResponses = [
      "School stress management techniques: Break large assignments into small tasks, use the Pomodoro method (25 min work/5 min break), utilize study groups, and maintain a detailed planner.",
      "Academic success strategies: Create a dedicated study space, review notes within 24 hours of class, use active study methods (teaching concepts aloud), and schedule regular breaks.",
      "For school challenges: Prioritize assignments by due date and weight, use chunking to break down complex material, study in 30-45 minute blocks, and reward yourself after completion.",
      "Education stress reducers: Use color-coding for organization, create study guides early, practice retrieval techniques instead of re-reading, and maintain healthy sleep habits especially before exams."
    ];

    const socialResponses = [
      "Social skills toolkit: Practice active listening, use open body language, ask follow-up questions, and schedule regular check-ins with friends who energize you.",
      "Friendship-building strategies: Join groups based on interests, practice assertive communication, be reliable with commitments, and express appreciation to those you value.",
      "To strengthen relationships: Schedule regular one-on-one time with close friends, practice vulnerability gradually, respect boundaries, and focus on quality connections over quantity.",
      "Social anxiety reducers: Prepare conversation starters, arrive early to social events, take brief breaks when overwhelmed, and focus on showing interest in others rather than self-consciousness."
    ];

    const appResponses = [
      "ZenGen offers evidence-based tools including: mental health assessments with personalized insights, research-backed resources, and this chat feature to provide specific coping strategies.",
      "This app features comprehensive mental health tools: take the assessment to identify key areas for growth, browse resources tailored to your needs, and use the chat for specific coping techniques.",
      "ZenGen combines multiple features: mental health assessments to identify strengths and challenges, a curated resource library, and this chat tool for personalized coping strategies.",
      "The app provides a complete mental health toolkit: assessments to track your progress, a resource section with vetted information, and this chat feature for immediate support strategies."
    ];

    const gratitudeResponses = [
      "You're welcome! Remember to practice the techniques we discussed regularly for best results. I'm here whenever you need additional strategies.",
      "Happy to help! Consistency with these methods is key. Even 5 minutes of practice daily can make a significant difference in your mental wellbeing.",
      "Glad to provide support! Try implementing one technique we discussed today and see what works best for your unique situation.",
      "You're very welcome! Small, consistent steps with these strategies will yield better results than occasional major efforts. I'm here when you need more tools."
    ];

    const generalResponses = [
      "Here are some universal mental health boosters: daily physical movement, consistent sleep schedule, limiting social media to 30 minutes daily, and practicing the 5-4-3-2-1 grounding exercise.",
      "General wellness strategies include: drinking water regularly, spending 20 minutes in nature daily, practicing 10 minutes of deep breathing, and connecting meaningfully with others.",
      "Core mental health habits to implement: get morning sunlight, practice gratitude before bed, move your body daily, and limit news consumption to specific times.",
      "Fundamental wellness techniques: schedule worry time instead of worrying throughout the day, practice progressive muscle relaxation, maintain regular meals, and engage in activities that create flow states.",
      "Essential mental health tools: create a calm-down plan before you need it, practice self-compassion statements daily, move your body in ways that feel good, and connect with supportive people.",
      "Key resilience builders: develop a consistent morning routine, identify and use your personal strengths daily, practice boundary-setting, and engage in activities that bring a sense of accomplishment."
    ];

    // Determine which category to use and avoid repetition
    let selectedResponses: string[] = generalResponses;

    // Check for greetings
    if (userMessage.match(/\b(hello|hi|hey|greetings)\b/)) {
      selectedResponses = greetingResponses;
    }
    // Check for well-being questions
    else if (userMessage.match(/\b(how are you|how've you been|how's it going)\b/)) {
      selectedResponses = wellBeingResponses;
    }
    // Check for anxiety-related questions
    else if (userMessage.match(/\b(anxious|anxiety|stressed|stress|nervous|worry|worried|panic)\b/)) {
      selectedResponses = anxietyResponses;
    }
    // Check for depression-related questions
    else if (userMessage.match(/\b(sad|depress|unhappy|miserable|down|hopeless)\b/)) {
      selectedResponses = depressionResponses;
    }
    // Check for sleep issues
    else if (userMessage.match(/\b(sleep|tired|exhausted|insomnia|rest|nap|drowsy)\b/)) {
      selectedResponses = sleepResponses;
    }
    // Check for school-related stress
    else if (userMessage.match(/\b(school|homework|exam|test|study|teacher|class|college|university|grade)\b/)) {
      selectedResponses = schoolResponses;
    }
    // Check for friend or social issues
    else if (userMessage.match(/\b(friend|social|relationship|peer|bully|family|parent|sibling)\b/)) {
      selectedResponses = socialResponses;
    }
    // Check for questions about the app
    else if (userMessage.match(/\b(app|zengen|how do you work|what can you do|how does this work)\b/)) {
      selectedResponses = appResponses;
    }
    // Check for thank you messages
    else if (userMessage.match(/\b(thank|thanks|appreciate|grateful)\b/)) {
      selectedResponses = gratitudeResponses;
    }

    // Filter out responses that might be too similar to previous ones
    let filteredResponses = selectedResponses.filter(response => {
      // Simple check: make sure the first 15 characters don't appear in conversation history
      return !conversationHistory.includes(response.substring(0, 15).toLowerCase());
    });

    // If all responses have been used before, use general responses instead
    if (filteredResponses.length === 0) {
      filteredResponses = generalResponses.filter(response => {
        return !conversationHistory.includes(response.substring(0, 15).toLowerCase());
      });

      // If still empty, just use any general response
      if (filteredResponses.length === 0) {
        filteredResponses = generalResponses;
      }
    }

    // Select a response at random from filtered options
    const randomIndex = Math.floor(Math.random() * filteredResponses.length);
    return filteredResponses[randomIndex];
  }

  // Resources API
  app.get("/api/resources", async (req, res) => {
    try {
      const resources = await storage.getResources();
      res.json(resources);
    } catch (error) {
      console.error("Error fetching resources:", error);
      res.status(500).json({ message: "Failed to fetch resources" });
    }
  });

  // Initialize HTTP server
  const httpServer = createServer(app);

  // Initialize sample resources if none exist
  await initializeSampleResources();

  return httpServer;
}

// Helper to initialize sample resources
async function initializeSampleResources() {
  const existing = await storage.getResources();
  const existingTitles = new Set(existing.map(r => r.title));

  const allSampleResources = [
    {
      title: "Understanding Anxiety: A Teen's Guide",
      description: "Learn what anxiety is, how it affects your body and mind, and clinical ways to manage it.",
      type: "article",
      icon: "book",
      duration: "5 min read",
      tags: ["Anxiety", "Self-Care"],
      url: "https://www.nimh.nih.gov/health/publications/anxiety-disorders-in-children-and-adolescents"
    },
    {
      title: "Breathing Techniques for Instant Calm",
      description: "Simple, medically backed breathing exercises that help reduce acute stress and panic quickly.",
      type: "video",
      icon: "video",
      duration: "3 min video",
      tags: ["Anxiety", "Stress Management", "Mindfulness"],
      url: "https://www.youtube.com/watch?v=SEfs5TJZ6Nk"
    },
    {
      title: "Talking to Parents About Mental Health",
      description: "Evidence-based tips and conversation starters for discussing your mental health with family.",
      type: "guide",
      icon: "file-text",
      duration: "4 min read",
      tags: ["Communication", "Family", "Self-Care"],
      url: "https://www.mhanational.org/time-talk-talking-your-parents"
    },
    {
      title: "The Science of Sleep for Teens",
      description: "Why circadian rhythms shift in adolescence and actionable habits for deeper, restorative sleep.",
      type: "article",
      icon: "book",
      duration: "6 min read",
      tags: ["Sleep", "Self-Care"],
      url: "https://www.sleepfoundation.org/teens-and-sleep"
    },
    {
      title: "5-Minute Meditation for School Stress",
      description: "A quick guided meditation designed to calm test anxiety and academic overwhelm.",
      type: "video",
      icon: "video",
      duration: "5 min video",
      tags: ["Stress Management", "Mindfulness", "School"],
      url: "https://www.youtube.com/watch?v=F7PxEy5IyV4"
    },
    {
      title: "Overcoming Social Anxiety at School",
      description: "Practical behavioral strategies from clinical psychologists for managing classroom and peer anxiety.",
      type: "guide",
      icon: "file-text",
      duration: "7 min read",
      tags: ["Social Anxiety", "School", "Anxiety"],
      url: "https://childmind.org/article/what-to-do-and-not-do-when-children-are-anxious/"
    },
    {
      title: "Teen Depression: Understanding the Signs",
      description: "Clear guidance from Mayo Clinic specialists on recognizing depressive patterns and finding support.",
      type: "article",
      icon: "book",
      duration: "6 min read",
      tags: ["Depression", "Self-Care"],
      url: "https://www.mayoclinic.org/diseases-conditions/teen-depression/symptoms-causes/syc-20350985"
    },
    {
      title: "Box Breathing Technique for Acute Stress",
      description: "A 4x4 Navy SEAL-tested breathing method that rapidly regulates the parasympathetic nervous system.",
      type: "video",
      icon: "video",
      duration: "4 min video",
      tags: ["Stress Management", "Mindfulness", "Anxiety"],
      url: "https://www.youtube.com/watch?v=tEmt1Znux58"
    },
    {
      title: "Managing Study Pressure & Academic Burnout",
      description: "Effective pacing, study breaks, and psychological strategies from Johns Hopkins Medicine.",
      type: "guide",
      icon: "file-text",
      duration: "5 min read",
      tags: ["School", "Stress Management", "Self-Care"],
      url: "https://www.hopkinsmedicine.org/health/wellness-and-prevention/how-to-help-your-teen-deal-with-stress"
    },
    {
      title: "Mindfulness and Grounding for Adolescents",
      description: "Harvard Health insights on neuroplasticity and how mindfulness builds resilience against anxiety.",
      type: "article",
      icon: "book",
      duration: "5 min read",
      tags: ["Mindfulness", "Self-Care", "Anxiety"],
      url: "https://www.health.harvard.edu/blog/mindfulness-in-education-2019081417539"
    }
  ];

  for (const resource of allSampleResources) {
    if (!existingTitles.has(resource.title)) {
      await storage.createResource(resource);
    }
  }
}

function getFallbackRecommendations() {
  return [
    {
      title: "Try Breathing Exercises",
      description: "Simple breathing techniques can help reduce anxiety and stress.",
      icon: "heart"
    },
    {
      title: "Journal Your Thoughts",
      description: "Spending 5 minutes a day writing down your thoughts can help process emotions.",
      icon: "book"
    },
    {
      title: "Connect With Friends",
      description: "Make time for meaningful social interactions that energize you.",
      icon: "users"
    }
  ];
}

// Helper function to generate mental health predictions based on assessment scores
function generateMentalHealthPredictions(moodScore: number, anxietyScore: number, socialScore: number) {
  const predictions = [];

  // Depression prediction (based on mood score)
  // Lower score means higher chance of depression
  const depressionProbability = calculateProbability(moodScore, 30);
  const depressionSeverity = getSeverityLevel(depressionProbability);
  if (depressionProbability > 0.1) {
    predictions.push({
      condition: "Depression",
      probability: depressionProbability,
      severity: depressionSeverity,
      description: getDepressionDescription(depressionSeverity)
    });
  }

  // Anxiety prediction (based on anxiety score)
  // Lower score means higher chance of anxiety
  const anxietyProbability = calculateProbability(anxietyScore, 30);
  const anxietySeverity = getSeverityLevel(anxietyProbability);
  if (anxietyProbability > 0.1) {
    predictions.push({
      condition: "Anxiety",
      probability: anxietyProbability,
      severity: anxietySeverity,
      description: getAnxietyDescription(anxietySeverity)
    });
  }

  // Social isolation/loneliness prediction (based on social score)
  // Lower score means higher chance of social issues
  const socialProbability = calculateProbability(socialScore, 40);
  const socialSeverity = getSeverityLevel(socialProbability);
  if (socialProbability > 0.1) {
    predictions.push({
      condition: "Social Isolation",
      probability: socialProbability,
      severity: socialSeverity,
      description: getSocialDescription(socialSeverity)
    });
  }

  // If no predictions (all scores are good), add a positive prediction
  if (predictions.length === 0) {
    predictions.push({
      condition: "Positive Mental Health",
      probability: 0.9,
      severity: "none",
      description: "Your assessment indicates good mental health across all measured areas. Continue with your positive habits!"
    });
  }

  return predictions;
}

// Helper to calculate probability based on score and threshold
function calculateProbability(score: number, threshold: number): number {
  // Convert the score to a probability
  // Lower scores in our assessment mean better mental health (100 is best, 0 is worst)
  // So we invert the relationship to get probability of condition:
  // - A score of 0 would mean 100% probability of condition
  // - A score of 100 would mean 0% probability of condition
  const probabilityRaw = (100 - score) / 100;

  // Apply a threshold to create a more reasonable distribution
  // Scores under the threshold will result in lower probabilities
  const adjustment = score > threshold ? 0.3 : 0.7;

  // Round to 2 decimal places and ensure between 0 and 1
  return Math.min(1, Math.max(0, Math.round(probabilityRaw * adjustment * 100) / 100));
}

// Helper to get severity level from probability
function getSeverityLevel(probability: number): 'none' | 'mild' | 'moderate' | 'severe' {
  if (probability < 0.3) return 'none';
  if (probability < 0.5) return 'mild';
  if (probability < 0.7) return 'moderate';
  return 'severe';
}

// Helper to get depression description based on severity
function getDepressionDescription(severity: 'none' | 'mild' | 'moderate' | 'severe'): string {
  switch (severity) {
    case 'none':
      return "Your mood appears stable. Continue monitoring your feelings and practice self-care.";
    case 'mild':
      return "You may be experiencing some low mood. Try implementing regular exercise and mindfulness practices.";
    case 'moderate':
      return "Your responses suggest moderate depressive symptoms. Consider talking to a counselor or trusted adult about your feelings.";
    case 'severe':
      return "Your assessment indicates significant depressive symptoms. We strongly recommend speaking with a mental health professional for support.";
  }
}

// Helper to get anxiety description based on severity
function getAnxietyDescription(severity: 'none' | 'mild' | 'moderate' | 'severe'): string {
  switch (severity) {
    case 'none':
      return "Your anxiety levels appear to be within a normal range. Continue practicing stress management techniques.";
    case 'mild':
      return "You may be experiencing mild anxiety. Regular relaxation techniques and reducing caffeine can help manage these feelings.";
    case 'moderate':
      return "Your responses suggest moderate anxiety symptoms. Consider learning specific anxiety management techniques like deep breathing and progressive muscle relaxation.";
    case 'severe':
      return "Your assessment indicates significant anxiety symptoms. We strongly recommend speaking with a mental health professional who can provide appropriate support and strategies.";
  }
}

// Helper to get social isolation description based on severity
function getSocialDescription(severity: 'none' | 'mild' | 'moderate' | 'severe'): string {
  switch (severity) {
    case 'none':
      return "Your social connections appear stable. Continue nurturing your relationships.";
    case 'mild':
      return "You may benefit from expanding your social connections. Consider joining a club or group with shared interests.";
    case 'moderate':
      return "Your responses suggest some challenges with social connections. Consider talking to a trusted person about how to strengthen your support network.";
    case 'severe':
      return "Your assessment indicates significant social isolation. We recommend speaking with a counselor who can help develop strategies to build meaningful connections.";
  }
}

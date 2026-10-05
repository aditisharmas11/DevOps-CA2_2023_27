import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/client";
import { useAuth } from "../auth/AuthContext.jsx";
import Header from "../components/Header.jsx";
import Footer from "../components/Footer.jsx";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Heart, MessageCircle, Eye, ChevronRight, Bell, User, Search, Filter, Star } from "lucide-react";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { InterestButton } from "./InterestButton";

export default function Dashboard() {
  const { username } = useAuth();
  const navigate = useNavigate();
  const [userInfo, setUserInfo] = useState(null);
  const [matches, setMatches] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [receivedInterests, setReceivedInterests] = useState([]);

  useEffect(() => {
    let cancelled = false;
    async function fetchData() {
      try {
        setLoading(true);
        const userRes = await api.get("/api/profile/user-info", { params: { username } });
        let matchRes = null;
        try {
          matchRes = await api.get("/api/match", { params: { username } });
        } catch (e) {
          matchRes = { data: [] };
        }
        
        // Fetch profile details for education, rashi, etc.
        let profileRes = null;
        try {
          profileRes = await api.get("/api/profile/me");
          if (!cancelled) setProfile(profileRes.data);
        } catch (e) {
          // Profile might not exist yet
        }

        // Fetch received interests
        try {
          const interestsRes = await api.get("/api/interests/inbox");
          if (!cancelled) setReceivedInterests(Array.isArray(interestsRes.data) ? interestsRes.data : []);
        } catch (e) {
          // Interests might fail, ignore
        }

        if (!cancelled) {
          setUserInfo(userRes.data);
          setMatches(Array.isArray(matchRes.data) ? matchRes.data : []);
        }
      } catch (err) {
        if (!cancelled) setError(err?.response?.data || "Failed to load dashboard data");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    if (username) fetchData();
    return () => { cancelled = true; };
  }, [username]);

  const completion = useMemo(() => {
    if (!userInfo) return 0;
    const fields = [
      "firstName", "surname", "dob", "gender", 
      "occupation", "education", "faith"
    ];
    const filled = fields.filter((f) => {
      if (f === "education" || f === "faith") {
        return profile?.[f] || userInfo[f];
      }
      return userInfo[f];
    });
    return Math.round((filled.length / fields.length) * 100);
  }, [userInfo, profile]);

  const prioritizedMatches = useMemo(() => {
    return [...matches]
      .sort((a, b) => (b.compatibility || b.compatibilityScore || 0) - (a.compatibility || a.compatibilityScore || 0))
      .slice(0, 3);
  }, [matches]);

  const recentMessages = [
    { name: "Anita Kumar", message: "Thank you for showing interest in my profile!", time: "2 hours ago", unread: true },
    { name: "Rajesh Gupta", message: "I'd love to know more about your family values...", time: "5 hours ago", unread: false },
    { name: "Meera Singh", message: "Your profile seems very interesting. Would like to connect.", time: "1 day ago", unread: false },
  ];

  const notifications = [
    { text: "Your profile was viewed 12 times today", type: "view", time: "1 hour ago" },
    { text: "You have 3 new matches", type: "match", time: "3 hours ago" },
    { text: `${prioritizedMatches[0]?.firstName || 'Someone'} sent you an interest`, type: "interest", time: "5 hours ago" },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header variant="private" />
        <div className="container" style={{ marginTop: 40 }}>
          <p>Loading your dashboard…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header variant="private" />
        <div className="container" style={{ marginTop: 40 }}>
          <div className="error">{error}</div>
          <div className="muted" style={{ marginTop: 10 }}>
            Try refreshing or visit <button className="sm-btn sm-btn-outline" onClick={() => navigate('/matches')}>Matches</button>
          </div>
        </div>
      </div>
    );
  }

  const userFirstName = userInfo?.firstName || username;
  const userFullName = `${userInfo?.firstName || ''} ${userInfo?.surname || ''}`.trim() || username;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header variant="private" />
      <div className="container" style={{ padding: "24px 0" }}>
        <div style={{ display: "grid", gridTemplateColumns: "3fr 1fr", gap: 24 }}>
          
          {/* LEFT COLUMN */}
          <div style={{ display: "grid", gap: 24 }}>
            
            {/* Welcome Banner */}
            <div style={{
              background: "linear-gradient(to right, #ec4899, #9333ea)",
              borderRadius: 16,
              padding: 24,
              color: "#fff",
            }}>
              <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>
                Welcome back, {userFullName}! 👋
              </h1>
              <p style={{ opacity: 0.95, marginBottom: 16 }}>
                You have {prioritizedMatches.length} new matches today. 
                {receivedInterests.length > 0 && (
                  <span style={{ display: 'block', marginTop: 4, fontWeight: 600 }}>
                    💌 {receivedInterests.length} person{receivedInterests.length > 1 ? 's have' : ' has'} shown interest in you!
                  </span>
                )}
                Your profile has been viewed 12 times.
              </p>
              <Button 
                className="sm-btn-primary"
                style={{ background: "#fff", color: "#9333ea" }}
                onClick={() => navigate('/matches')}
              >
                View New Matches
              </Button>
            </div>

            {/* Daily Matches Section */}
            <Card>
              <CardHeader style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <CardTitle style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Heart className="h-5 w-5" style={{ color: "#ec4899" }} />
                  <span>Daily Matches</span>
                  {prioritizedMatches.length > 0 && (
                    <Badge style={{ background: "#f3f4f6", color: "#1f2937", marginLeft: 8 }}>
                      {prioritizedMatches.length} New
                    </Badge>
                  )}
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => navigate('/matches')}>
                  View All <ChevronRight className="h-4 w-4" style={{ marginLeft: 4 }} />
                </Button>
              </CardHeader>
              <CardContent>
                {prioritizedMatches.length > 0 ? (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
                    {prioritizedMatches.map((match, index) => {
                      const matchScore = Math.round((match.compatibility || match.compatibilityScore || 0));
                      // Use profile photo URL from backend if available, otherwise null (will show default)
                      const photoUrl = match.photoUrl || null;
                      
                      return (
                        <Card key={match.username || index} style={{ overflow: "hidden", cursor: "pointer" }}>
                          <div style={{ position: "relative" }}>
                            <ImageWithFallback
                              src={photoUrl}
                              alt={match.firstName || match.username}
                              className="w-full"
                              style={{ height: 192, objectFit: "cover", width: "100%" }}
                            />
                            <div style={{ position: "absolute", top: 12, right: 12, display: "flex", gap: 8, flexDirection: "column", alignItems: "flex-end" }}>
                              {match.isOnline && (
                                <Badge style={{ background: "#10b981", color: "#fff", fontSize: 11 }}>
                                  Online
                                </Badge>
                              )}
                              <Badge style={{ background: "#9333ea", color: "#fff", fontSize: 11 }}>
                                {matchScore}% Match
                              </Badge>
                            </div>
                          </div>
                          <CardContent style={{ padding: 16 }}>
                            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>
                              {match.firstName || match.username || "Match"}
                            </h3>
                            <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 12 }}>
                              <div>{match.age} years • {match.occupation || "—"}</div>
                              <div>{profile?.education || match.education || "—"}</div>
                              <div>{match.city || "Unknown"}</div>
                              <div>Rashi: {profile?.rashi || match.rashi || "—"}</div>
                            </div>
                            <div style={{ display: "flex", gap: 8 }}>
                              <InterestButton 
                                matchUsername={match.username || match.firstName}
                                onInterestSent={() => {
                                  // Optional: refresh matches or show notification
                                }}
                              />
                              <Button 
                                size="sm" 
                                variant="outline"
                                style={{ flex: 1 }}
                              >
                                <MessageCircle className="h-4 w-4" style={{ marginRight: 4 }} />
                                Message
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ textAlign: "center", padding: 40, color: "#6b7280" }}>
                    No matches yet. Try completing your profile to find matches!
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* RIGHT SIDEBAR */}
          <div style={{ display: "grid", gap: 16 }}>
            
            {/* Profile Completion */}
            <Card>
              <CardHeader>
                <CardTitle style={{ fontSize: 16 }}>Profile Completion</CardTitle>
              </CardHeader>
              <CardContent>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontSize: 14, color: "#6b7280" }}>{completion}% Complete</span>
                  <span style={{ fontSize: 14, color: "#9333ea" }}>{100 - completion}% to go</span>
                </div>
                <div style={{ height: 8, background: "#e5e7eb", borderRadius: 999, marginBottom: 16 }}>
                  <div
                    style={{
                      width: `${completion}%`,
                      height: 8,
                      borderRadius: 999,
                      background: "#9333ea",
                      transition: "width 0.3s",
                    }}
                  />
                </div>
                <Button variant="outline" size="sm" style={{ width: "100%" }} onClick={() => navigate('/profile')}>
                  Complete Profile
                </Button>
              </CardContent>
            </Card>

            {/* Today's Activity */}
            <Card>
              <CardHeader>
                <CardTitle style={{ fontSize: 16, display: "flex", alignItems: "center", gap: 8 }}>
                  <Bell className="h-4 w-4" />
                  <span>Today's Activity</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div style={{ display: "grid", gap: 12 }}>
                  {notifications.map((notif, i) => (
                    <div key={i} style={{ fontSize: 13 }}>
                      <p style={{ color: "#1f2937", marginBottom: 4 }}>{notif.text}</p>
                      <p style={{ fontSize: 12, color: "#9ca3af" }}>{notif.time}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Rashi Compatibility */}
            <Card>
              <CardHeader>
                <CardTitle style={{ fontSize: 16, display: "flex", alignItems: "center", gap: 8 }}>
                  <Star className="h-4 w-4" style={{ color: "#f59e0b" }} />
                  <span>Rashi Compatibility</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div style={{ textAlign: "center", padding: 16, background: "#fef3c7", borderRadius: 12, marginBottom: 12 }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>♌</div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: "#1f2937" }}>Your Rashi: Simha</p>
                  <p style={{ fontSize: 12, color: "#6b7280" }}>Best matches: Mesh, Dhanu</p>
                </div>
                <Button variant="outline" size="sm" style={{ width: "100%" }}>
                  View Full Report
                </Button>
              </CardContent>
            </Card>

            {/* Recent Messages */}
            <Card>
              <CardHeader style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <CardTitle style={{ fontSize: 16, display: "flex", alignItems: "center", gap: 8 }}>
                  <MessageCircle className="h-4 w-4" style={{ color: "#3b82f6" }} />
                  <span>Recent Messages</span>
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => navigate('/messages')}>
                  View All
                </Button>
              </CardHeader>
              <CardContent>
                <div style={{ display: "grid", gap: 12 }}>
                  {recentMessages.map((msg, i) => (
                    <div key={i} style={{ display: "flex", gap: 12, padding: 8, borderRadius: 8, cursor: "pointer" }}>
                      <div style={{
                        width: 40,
                        height: 40,
                        borderRadius: "50%",
                        background: "#e5e7eb",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 700,
                        color: "#1f2937"
                      }}>
                        {msg.name[0]}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                          <p style={{ fontSize: 13, fontWeight: 700, color: "#1f2937" }}>{msg.name}</p>
                          <span style={{ fontSize: 12, color: "#9ca3af" }}>{msg.time}</span>
                        </div>
                        <p style={{ fontSize: 12, color: "#6b7280", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {msg.message}
                        </p>
                        {msg.unread && (
                          <div style={{ width: 8, height: 8, background: "#3b82f6", borderRadius: "50%", marginTop: 4 }} />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle style={{ fontSize: 16 }}>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div style={{ display: "grid", gap: 8 }}>
                  <Button variant="outline" size="sm" style={{ justifyContent: "flex-start" }} onClick={() => navigate('/profile')}>
                    <User className="h-4 w-4" style={{ marginRight: 8 }} />
                    Edit My Profile
                  </Button>
                  <Button variant="outline" size="sm" style={{ justifyContent: "flex-start" }}>
                    <Search className="h-4 w-4" style={{ marginRight: 8 }} />
                    Advanced Search
                  </Button>
                  <Button variant="outline" size="sm" style={{ justifyContent: "flex-start" }}>
                    <Filter className="h-4 w-4" style={{ marginRight: 8 }} />
                    Update Preferences
                  </Button>
                  <Button variant="outline" size="sm" style={{ justifyContent: "flex-start" }}>
                    <Star className="h-4 w-4" style={{ marginRight: 8 }} />
                    Astrological Report
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Your Stats */}
            <Card>
              <CardHeader>
                <CardTitle style={{ fontSize: 16 }}>Your Stats</CardTitle>
              </CardHeader>
              <CardContent>
                <div style={{ display: "grid", gap: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 13, color: "#6b7280" }}>Profile Views</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#1f2937" }}>47 this week</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 13, color: "#6b7280" }}>Interests Sent</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#1f2937" }}>12</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 13, color: "#6b7280" }}>Interests Received</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#1f2937" }}>8</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 13, color: "#6b7280" }}>Messages</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#1f2937" }}>23</span>
                  </div>
                </div>
              </CardContent>
            </Card>

          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
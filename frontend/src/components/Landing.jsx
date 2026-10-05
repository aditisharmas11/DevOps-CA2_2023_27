// src/pages/Landing.jsx
import { Button } from "../components/ui/button"
import { Card, CardContent } from "../components/ui/card"
import { Badge } from "../components/ui/badge"
import { Heart, Shield, Users, Star, MessageCircle, CheckCircle, Activity } from "lucide-react"
import { ImageWithFallback } from "../components/figma/ImageWithFallback"
import { useRouter } from "../hooks/useRouter"
import Footer from "../components/Footer.jsx"

export default function Landing() {
  const { navigate } = useRouter()
  const successStories = [
    { names: 'Priya & Rajesh', story: "Found our perfect match in just 3 months through SoulMate's advanced compatibility system.", location: 'Mumbai' },
    { names: 'Sneha & Vikram', story: 'The astrological matching was incredible! We knew we were meant for each other.', location: 'Delhi' },
    { names: 'Anita & Suresh', story: 'After years of searching, we finally found our soulmate. Grateful for this platform!', location: 'Bangalore' },
  ]
  const features = [
    { icon: Shield, title: 'Verified Profiles', description: '100% verified profiles with ID proof and background checks' },
    { icon: Star, title: 'Advanced Matching', description: 'AI-powered compatibility based on values and preferences' },
    { icon: MessageCircle, title: 'Secure & Private', description: 'Safe communication with complete privacy protection' },
    { icon: Users, title: 'Dedicated Support', description: 'Personal relationship managers to guide your journey' },
    { icon: Activity, title: 'Community Activities', description: 'Discover service and social activities of potential matches' },
  ]
  return (
    <div>
      <header className="sm-card" style={{ padding: 12, position: 'sticky', top: 0, zIndex: 10 }}>
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ background: 'var(--sm-color-primary)', color: '#fff', padding: 8, borderRadius: 8 }}>
              <Heart className="h-6 w-6" />
            </div>
            <span style={{ fontWeight: 800 }}>SoulMate</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="ghost" onClick={() => navigate('login')}>Login</Button>
            <Button className="sm-btn-primary" onClick={() => navigate('register')}>Join Now</Button>
          </div>
        </div>
      </header>

      <section className="app-bg" style={{ padding: '40px 0' }}>
        <div className="container" style={{ display: 'grid', gap: 20, gridTemplateColumns: '1.2fr 1fr', alignItems: 'center' }}>
          <div>
            <h1 className="title" style={{ fontSize: 40 }}>Find Your <span style={{ color: 'var(--sm-color-primary)' }}>Life Partner</span> Today</h1>
            <p className="muted" style={{ marginBottom: 16 }}>Connecting hearts and building futures. Join thousands of happy couples who found their perfect match through our trusted platform.</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <Button className="sm-btn-primary" onClick={() => navigate('register')}>Find Your Match</Button>
              <Button variant="outline" onClick={() => navigate('login')}>Browse Profiles</Button>
            </div>
            <div style={{ display: 'flex', gap: 16, marginTop: 12, fontSize: 13 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Shield className="h-4 w-4" /><span>100% Verified</span></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Users className="h-4 w-4" /><span>50,000+ Members</span></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Star className="h-4 w-4" /><span>4.9 Rating</span></div>
            </div>
          </div>
          <div style={{ position: 'relative' }}>
            <ImageWithFallback className="sm-card" src="https://images.unsplash.com/photo-1756376748107-12c98ec6b969?q=80&w=1080" alt="Hero" />
            <Card className="sm-card" style={{ position: 'absolute', bottom: -14, left: -14 }}>
              <CardContent>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ background: '#e6ffed', padding: 6, borderRadius: 999 }}><Heart className="h-5 w-5" /></div>
                  <div>
                    <div style={{ fontSize: 12 }}>Latest Success</div>
                    <div className="muted" style={{ fontSize: 12 }}>Priya & Rahul just got engaged!</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section style={{ padding: '24px 0', background: '#fff' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 18 }}>
            <h2 className="title">Success Stories</h2>
            <p className="muted">Real couples who found their soulmates through our platform</p>
          </div>
          <div className="grid-cards">
            {successStories.map((story, i) => (
              <Card key={i}>
                <CardContent>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <div style={{ background: '#ffe3f1', padding: 6, borderRadius: 999 }}><Heart className="h-5 w-5" /></div>
                    <div>
                      <div style={{ fontWeight: 700 }}>{story.names}</div>
                      <div className="muted" style={{ fontSize: 12 }}>{story.location}</div>
                    </div>
                  </div>
                  <div className="muted" style={{ fontStyle: 'italic' }}>&quot;{story.story}&quot;</div>
                  <Badge className="sm-badge-ok" style={{ marginTop: 8 }}><CheckCircle className="h-3 w-3" /> Married</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <Button className="sm-btn-primary" onClick={() => navigate('register')}>Start Your Success Story</Button>
          </div>
        </div>
      </section>

      <section style={{ padding: '24px 0', background: 'var(--sm-color-bg-alt)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 18 }}>
            <h2 className="title">Why Choose SoulMate?</h2>
            <p className="muted">Experience the difference with our comprehensive approach</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0,1fr))', gap: 12 }}>
            {features.map((f, i) => {
              const Icon = f.icon
              return (
                <div key={i} className="sm-card" style={{ padding: 16, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div className="sm-card" style={{ padding: 10, width: 56, margin: '0 auto 8px' }}><Icon className="h-8 w-8" /></div>
                  <div style={{ fontWeight: 700 }}>{f.title}</div>
                  <div className="muted" style={{ fontSize: 13 }}>{f.description}</div>
                </div>
              )
            })}
          </div>
          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <Button variant="outline" onClick={() => navigate('register')}>Join Now - It&apos;s Free</Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}

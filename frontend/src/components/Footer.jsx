import './footer.css'

export default function Footer() {
  return (
    <footer className="sm-footer" style={{ width: '100%' }}>
      <div className="container" style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div className="cols">
          <div>
            <div className="brand">SoulMate</div>
            <div className="muted">Connecting hearts and building futures.</div>
          </div>
          <div>
            <div className="title">Company</div>
            <a href="#">About</a>
            <a href="#">Contact</a>
          </div>
          <div>
            <div className="title">Support</div>
            <a href="#">FAQ</a>
            <a href="#">Help</a>
          </div>
          <div>
            <div className="title">Legal</div>
            <a href="#">Privacy</a>
            <a href="#">Terms</a>
          </div>
        </div>
        <div className="bottom">© {new Date().getFullYear()} SoulMate. All rights reserved.</div>
      </div>
    </footer>
  )
}



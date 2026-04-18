import { Link } from 'react-router-dom';

export function Logo({ footer = false }) {
  return (
    <Link to="/" className="logo" aria-label="Obecność">
      <span className="logo-mark">Obecność</span>
      <span className="logo-sub" style={footer ? { color: '#8a8178' } : undefined}>Program mbU</span>
    </Link>
  );
}

export function Nav() {
  return (
    <header className="nav">
      <div className="wrap nav-inner">
        <Logo />
        <nav className="nav-links" aria-label="Główna nawigacja">
          <Link to="/#jak">O programie</Link>
          <Link to="/#wiedza">Wiedza</Link>
          <Link to="/#mapa">Mapa</Link>
          <Link to="/zapisz-sie" className="btn btn-cta" style={{ padding: '10px 18px' }}>Dołącz</Link>
        </nav>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer id="kontakt">
      <div className="wrap">
        <div className="foot-grid">
          <div className="foot-col">
            <div style={{ marginBottom: 18 }}>
              <Logo footer />
            </div>
            <p>
              Organizacja Pożytku Publicznego<br />
              Program „Obecność" realizowany przez Fundację mbU<br />
              od 2018 roku.
            </p>
            <p style={{ marginTop: 16 }}>KRS 0000 123 456 · NIP 525-12-34-567</p>
          </div>
          <div className="foot-col">
            <h4>Program</h4>
            <ul>
              <li><Link to="/#jak">Jak to działa</Link></li>
              <li><Link to="/zapisz-sie">Zostań wolontariuszem</Link></li>
              <li><Link to="/#mapa">Mapa samotności</Link></li>
              <li><Link to="/#wiedza">Baza wiedzy</Link></li>
            </ul>
          </div>
          <div className="foot-col">
            <h4>Kontakt</h4>
            <ul>
              <li><a href="tel:+48800123456">800 123 456</a> — linia seniora</li>
              <li><a href="mailto:kontakt@mbu.org.pl">kontakt@mbu.org.pl</a></li>
              <li>ul. Mokotowska 24, Warszawa</li>
              <li>pon–pt, 9:00–17:00</li>
            </ul>
          </div>
          <div className="foot-col">
            <h4>Wesprzyj</h4>
            <p style={{ color: '#c9c1b3', marginBottom: 10 }}>Numer konta dla darowizn (1,5% podatku — KRS powyżej):</p>
            <div className="foot-bank">12 1020 1026 0000 0212 3456 7890</div>
          </div>
        </div>
        <div className="foot-bottom">
          <div>© 2018–2026 Fundacja mbU · Wszelkie prawa zastrzeżone</div>
          <div style={{ display: 'flex', gap: 24 }}>
            <a href="#" style={{ color: '#8a8178' }}>Polityka prywatności</a>
            <a href="#" style={{ color: '#8a8178' }}>Regulamin</a>
            <a href="#" style={{ color: '#8a8178' }}>Dostępność</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

export function Shell({ children }) {
  return (
    <>
      <Nav />
      <main>{children}</main>
      <Footer />
    </>
  );
}

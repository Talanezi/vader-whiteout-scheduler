import Container from 'react-bootstrap/Container';
import Offcanvas from 'react-bootstrap/Offcanvas';
import Nav from 'react-bootstrap/Nav';
import Navbar from 'react-bootstrap/Navbar';
import { LinkContainer } from 'react-router-bootstrap';
import {
  BrowserRouter,
  Link,
  Outlet,
  Route,
  Routes,
} from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import './App.scss';
import './custom.css';
import 'common/common.css';

import { useAppSelector } from 'app/hooks';
import DayPicker from 'components/DayPicker/DayPicker';
import ForgotPassword from 'components/ForgotPassword';
import HistoryProvider from 'components/HistoryProvider';
import Login from 'components/Login';
import Signup from 'components/Signup';
import Meeting from 'components/availabilities/Meeting';
import Profile from 'components/Profile';
import Settings from 'components/Settings';
import ConfirmLinkExternalCalendar from 'components/ConfirmLinkExternalCalendar';
import ConfirmPasswordReset from 'components/ConfirmPasswordReset';
import VerifyEmail from 'components/VerifyEmail';
import Privacy from 'components/Privacy';
import Feedback from 'components/Feedback';
import TermsOfService from 'components/TermsOfService';
import ErrorPage from 'components/ErrorPage';
import WaitForServerInfo from 'components/WaitForServerInfo';
import { BottomOverlayFiller } from 'components/BottomOverlay';
import { selectTokenIsPresent } from 'slices/authentication';
import {
  useExtractTokenFromQueryParams,
  useGetSelfInfoIfTokenIsPresent,
} from 'utils/auth.hooks';

const SOURCE_URL = 'https://github.com/Talanezi/vader-whiteout-scheduler';

export default function App() {
  const dayPicker = <DayPicker />;

  return (
    <BrowserRouter basename="/scheduler">
      <HistoryProvider>
        <WaitForServerInfo>
          <Routes>
            <Route path="/" element={<AppRoot />}>
              <Route index element={dayPicker} />
              <Route path="create" element={dayPicker} />
              <Route path="privacy" element={<Privacy />} />
              <Route path="feedback" element={<Feedback />} />
              <Route path="terms-of-service" element={<TermsOfService />} />
              <Route path="m/:id" element={<Meeting />} />
              <Route path="signup" element={<Signup />} />
              <Route path="login" element={<Login />} />
              <Route path="confirm-link-google-account" element={<ConfirmLinkExternalCalendar provider="google" />} />
              <Route path="confirm-link-microsoft-account" element={<ConfirmLinkExternalCalendar provider="microsoft" />} />
              <Route path="forgot-password" element={<ForgotPassword />} />
              <Route path="confirm-password-reset" element={<ConfirmPasswordReset />} />
              <Route path="verify-email" element={<VerifyEmail />} />
              <Route path="error" element={<ErrorPage />} />
              <Route path="me">
                <Route index element={<Profile />} />
                <Route path="settings" element={<Settings />} />
              </Route>
              <Route path="*" element={<h3 className="vw-simple-heading">Page not found</h3>} />
            </Route>
          </Routes>
        </WaitForServerInfo>
      </HistoryProvider>
    </BrowserRouter>
  );
}

function AppRoot() {
  useExtractTokenFromQueryParams();
  useGetSelfInfoIfTokenIsPresent();

  const [showToggle, setShowToggle] = useState(false);
  const [theme, setTheme] = useStoredTheme();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const onShowToggle = () => setShowToggle(true);
  const onHideToggle = () => setShowToggle(false);

  const themeIcon = useMemo(() => {
    return theme === 'light'
      ? 'https://www.svgrepo.com/show/432507/light-mode.svg'
      : 'https://i.postimg.cc/63Mr6Vgt/output-onlinepngtools-3.png';
  }, [theme]);

  return (
    <div className="App vw-app-shell d-flex flex-column">
      <Navbar expand="md" className="custom-navbar vw-navbar" sticky="top">
        <Container className="custom-navbar-container">
          <Navbar.Toggle
            aria-controls="app-navbar-nav"
            className="custom-navbar-toggle"
            onClick={onShowToggle}
          />
          <BrandWithLogo onClick={onHideToggle} />
          <Navbar.Collapse className="justify-content-end d-none d-md-flex">
            <Nav className="ms-auto align-items-center">
              <HeaderLinks onClick={onHideToggle} />
              <button
                type="button"
                className="btn vw-theme-toggle ms-md-3"
                onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
              >
                <img src={themeIcon} alt={theme === 'light' ? 'Light mode icon' : 'Dark mode icon'} />
              </button>
            </Nav>
          </Navbar.Collapse>

          <Navbar.Offcanvas
            id="app-navbar-nav"
            aria-labelledby="app-navbar-offcanvas-label"
            placement="start"
            onHide={onHideToggle}
            show={showToggle}
          >
            <Offcanvas.Header closeButton className="mt-3">
              <Offcanvas.Title id="app-navbar-offcanvas-label" className="fs-4">
                <BrandWithLogo onClick={onHideToggle} />
              </Offcanvas.Title>
            </Offcanvas.Header>
            <Offcanvas.Body>
              <div className="px-3">
                <hr className="mt-0 mb-4 vw-line" />
              </div>
              <Nav className="ms-auto">
                <HeaderLinks onClick={onHideToggle} />
                <button
                  type="button"
                  className="btn vw-theme-toggle mt-3 d-inline-flex d-md-none"
                  onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                  aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
                >
                  <img src={themeIcon} alt={theme === 'light' ? 'Light mode icon' : 'Dark mode icon'} />
                </button>
              </Nav>
            </Offcanvas.Body>
          </Navbar.Offcanvas>
        </Container>
      </Navbar>

      <main className="container app-main-container flex-grow-1 d-flex flex-column vw-main">
        <Outlet />
      </main>

      <Footer />
      <BottomOverlayFiller />
    </div>
  );
}

function BrandWithLogo({onClick}: {onClick: () => void}) {
  return (
    <LinkContainer to="/" onClick={onClick}>
      <Navbar.Brand className="vw-brand">
        Vader: Whiteout
      </Navbar.Brand>
    </LinkContainer>
  );
}

function HeaderLinks({onClick}: {onClick: () => void}) {
  const isOrWillBeLoggedIn = useAppSelector(selectTokenIsPresent);

  const links = [{to: '/', desc: 'Schedule'}];
  if (isOrWillBeLoggedIn) {
    links.push({to: '/me', desc: 'Crew'});
  } else {
    links.push(
      {to: '/signup', desc: 'Sign up'},
      {to: '/login', desc: 'Login'},
    );
  }

  const offcanvasOnlyLinks = [
    {to: '/privacy', desc: 'Privacy'},
    {to: '/feedback', desc: 'Feedback'},
  ];

  const linkProps = {
    className: 'header-link',
    activeClassName: 'header-link_active',
  };

  const offcanvasOnlyLinksProps = {
    className: 'header-link d-block d-md-none',
    activeClassName: 'header-link_active d-block d-md-none',
  };

  return (
    <>
      {links.map((lnk) => (
        <LinkContainer
          to={lnk.to}
          key={lnk.to}
          {...linkProps}
        >
          <Nav.Link onClick={onClick}>{lnk.desc}</Nav.Link>
        </LinkContainer>
      ))}

      {offcanvasOnlyLinks.map((lnk) => (
        <LinkContainer
          to={lnk.to}
          key={lnk.to}
          onClick={onClick}
          {...offcanvasOnlyLinksProps}
        >
          <Nav.Link>{lnk.desc}</Nav.Link>
        </LinkContainer>
      ))}
    </>
  );
}

function Footer() {
  return (
    <footer className="vw-footer d-none d-md-flex align-items-center justify-content-center border-top mt-md-5">
      <span>Internal production scheduler</span>
      <Link to="/privacy">Privacy</Link>
      <Link to="/feedback">Feedback</Link>
      <Link to="/terms-of-service">Terms</Link>
      <a href={SOURCE_URL} target="_blank" rel="noreferrer">Source</a>
    </footer>
  );
}

function useStoredTheme(): [string, (theme: string) => void] {
  const getInitial = () => {
    try {
      return localStorage.getItem('theme') === 'light' ? 'light' : 'dark';
    } catch {
      return 'dark';
    }
  };

  const [theme, setThemeState] = useState<string>(getInitial);

  const setTheme = (next: string) => {
    setThemeState(next);
    try {
      localStorage.setItem('theme', next);
    } catch {}
  };

  return [theme, setTheme];
}

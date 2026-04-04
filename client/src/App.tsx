import Container from 'react-bootstrap/Container';
import Nav from 'react-bootstrap/Nav';
import Navbar from 'react-bootstrap/Navbar';
import { LinkContainer } from 'react-router-bootstrap';
import {
  HashRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
} from 'react-router-dom';
import { useEffect } from 'react';
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

export default function App() {
  const dayPicker = <DayPicker />;

  return (
    <HashRouter>
      <HistoryProvider>
        <WaitForServerInfo>
          <Routes>
            <Route path="/" element={<AppRoot />}>
              <Route index element={<MeetingsHome />} />
              <Route path="create" element={dayPicker} />
              <Route path="m/:id" element={<Meeting />} />

              <Route path="signup" element={<Signup />} />
              <Route path="login" element={<Login />} />

              <Route
                path="confirm-link-google-account"
                element={<ConfirmLinkExternalCalendar provider="google" />}
              />
              <Route
                path="confirm-link-microsoft-account"
                element={<ConfirmLinkExternalCalendar provider="microsoft" />}
              />
              <Route path="forgot-password" element={<ForgotPassword />} />
              <Route path="confirm-password-reset" element={<ConfirmPasswordReset />} />
              <Route path="verify-email" element={<VerifyEmail />} />
              <Route path="privacy" element={<Privacy />} />
              <Route path="feedback" element={<Feedback />} />
              <Route path="terms-of-service" element={<TermsOfService />} />
              <Route path="error" element={<ErrorPage />} />

              <Route path="me">
                <Route index element={<Profile />} />
                <Route path="settings" element={<Settings />} />
              </Route>

              <Route path="crew" element={<Navigate to="/me" replace />} />
              <Route path="*" element={<h3 className="vw-simple-heading">Page not found</h3>} />
            </Route>
          </Routes>
        </WaitForServerInfo>
      </HistoryProvider>
    </HashRouter>
  );
}

function AppRoot() {
  useExtractTokenFromQueryParams();
  useGetSelfInfoIfTokenIsPresent();

  const isLoggedIn = useAppSelector(selectTokenIsPresent);
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
  }, []);

  return (
    <div className="App vw-app-shell d-flex flex-column">
      <Navbar className="vw-navbar" sticky="top">
        <Container className="vw-navbar-inner">
          <LinkContainer to="/">
            <Navbar.Brand className="vw-brand">Vader: Whiteout</Navbar.Brand>
          </LinkContainer>

          <Nav className="vw-nav-links">
            <NavItem to="/" label="Meetings" />
            {isLoggedIn ? (
              <NavItem to="/me" label="My Page" />
            ) : (
              <>
                <NavItem to="/signup" label="Sign Up" />
                <NavItem to="/login" label="Log In" />
              </>
            )}
          </Nav>
        </Container>
      </Navbar>

      <main className="container app-main-container flex-grow-1 d-flex flex-column vw-main">
        <Outlet />
      </main>

      <BottomOverlayFiller />
    </div>
  );
}

function MeetingsHome() {
  const isLoggedIn = useAppSelector(selectTokenIsPresent);

  return (
    <div className="vw-home d-flex flex-column align-items-center justify-content-center text-center flex-grow-1">
      <h2 className="vw-simple-heading mb-3">Meetings</h2>
      <p className="mb-4" style={{ color: 'var(--mute)', maxWidth: 640 }}>
        View your scheduling hub and create new availability requests for the production.
      </p>
      <div className="d-flex gap-3 flex-wrap justify-content-center">
        <LinkContainer to="/create">
          <button className="btn btn-primary">Create Meeting</button>
        </LinkContainer>
        {isLoggedIn && (
          <LinkContainer to="/me">
            <button className="btn btn-outline-primary">Go to My Page</button>
          </LinkContainer>
        )}
      </div>
    </div>
  );
}

function NavItem({ to, label }: { to: string; label: string }) {
  return (
    <LinkContainer to={to}>
      <Nav.Link className="vw-nav-link">{label}</Nav.Link>
    </LinkContainer>
  );
}


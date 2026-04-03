import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import Form from 'react-bootstrap/Form';
import { Link, useNavigate } from 'react-router-dom';
import BottomOverlay from 'components/BottomOverlay';
import styles from './Signup.module.css';
import { getReqErrorMessage, useMutationWithPersistentError } from 'utils/requests.utils';
import ButtonWithSpinner from './ButtonWithSpinner';
import { useSignupMutation } from 'slices/api';
import { HistoryContext } from './HistoryProvider';
import { isVerifyEmailAddressResponse } from 'slices/enhancedApi';
import VerifyEmailAddress from './SignupConfirmation';
import WaitForServerInfo from './WaitForServerInfo';
import useSetTitle from 'utils/title.hook';
import { useAppDispatch } from 'app/hooks';
import { setToken } from 'slices/authentication';
import { setLocalToken } from 'utils/auth.utils';
import {
  PRODUCTION_DEPARTMENTS,
  ProductionDepartment,
  rolesForDepartment,
} from 'utils/productionRoles';

export default function Signup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [department, setDepartment] = useState<ProductionDepartment | ''>('');
  const [role, setRole] = useState('');
  const [shouldShowVerificationPage, setShouldShowVerificationPage] = useState(false);
  const navigate = useNavigate();
  const { lastNonAuthPath } = useContext(HistoryContext);
  const lastNonAuthPathRef = useRef('/');
  useSetTitle('Signup');

  useEffect(() => {
    lastNonAuthPathRef.current = lastNonAuthPath;
  }, [lastNonAuthPath]);

  const redirectAfterSuccessfulSignup = useCallback(() => {
    navigate(lastNonAuthPathRef.current);
  }, [navigate]);

  if (shouldShowVerificationPage) {
    return <VerifyEmailAddress email={email} />;
  }

  return (
    <WaitForServerInfo>
      <div className={styles.signupContainer}>
        <SignupForm
          name={name}
          setName={setName}
          email={email}
          setEmail={setEmail}
          password={password}
          setPassword={setPassword}
          department={department}
          setDepartment={setDepartment}
          role={role}
          setRole={setRole}
          setShouldShowVerificationPage={setShouldShowVerificationPage}
          redirectAfterSuccessfulSignup={redirectAfterSuccessfulSignup}
        />
        <WhyShouldISignUp />
      </div>
    </WaitForServerInfo>
  );
}

function SignupForm({
  name,
  setName,
  email,
  setEmail,
  password,
  setPassword,
  department,
  setDepartment,
  role,
  setRole,
  setShouldShowVerificationPage,
  redirectAfterSuccessfulSignup,
}: {
  name: string;
  setName: (s: string) => void;
  email: string;
  setEmail: (s: string) => void;
  password: string;
  setPassword: (s: string) => void;
  department: ProductionDepartment | '';
  setDepartment: (s: ProductionDepartment | '') => void;
  role: string;
  setRole: (s: string) => void;
  setShouldShowVerificationPage: (b: boolean) => void;
  redirectAfterSuccessfulSignup: () => void;
}) {
  const [signup, { data, isLoading, error }] = useMutationWithPersistentError(useSignupMutation);
  const dispatch = useAppDispatch();
  const errorMessageElemRef = useRef<HTMLParagraphElement>(null);
  const roleOptions = useMemo(() => rolesForDepartment(department), [department]);

  useEffect(() => {
    if (!department) {
      setRole('');
      return;
    }
    if (role && !roleOptions.includes(role)) {
      setRole('');
    }
  }, [department, role, roleOptions, setRole]);

  useEffect(() => {
    if (!data) return;
    if (isVerifyEmailAddressResponse(data)) {
      setShouldShowVerificationPage(true);
      return;
    }
    if ('token' in (data as any)) {
      const token = (data as any).token;
      setLocalToken(token);
      dispatch(setToken(token));
    }
    redirectAfterSuccessfulSignup();
  }, [data, dispatch, redirectAfterSuccessfulSignup, setShouldShowVerificationPage]);

  useEffect(() => {
    if (error && errorMessageElemRef.current) {
      errorMessageElemRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [error]);

  const onSubmit: React.FormEventHandler<HTMLFormElement> = (ev) => {
    ev.preventDefault();
    if (!name.trim() || !email.trim() || !password.trim() || !department || !role) {
      return;
    }
    signup({
      name: name.trim(),
      email: email.trim(),
      password,
      department,
      role,
    } as any);
  };

  const isDisabled =
    !name.trim() ||
    !email.trim() ||
    !password.trim() ||
    !department ||
    !role ||
    isLoading;

  return (
    <div className={styles.signupForm}>
      <Form onSubmit={onSubmit}>
        <Form.Group className="mb-3">
          <Form.Label>Full name</Form.Label>
          <Form.Control
            value={name}
            onChange={(ev) => setName(ev.target.value)}
            placeholder="Full name"
            autoComplete="off"
          />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Email</Form.Label>
          <Form.Control
            value={email}
            onChange={(ev) => setEmail(ev.target.value)}
            placeholder="you@example.com"
            type="email"
            autoComplete="email"
          />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Password</Form.Label>
          <Form.Control
            value={password}
            onChange={(ev) => setPassword(ev.target.value)}
            placeholder="Create a password"
            type="password"
            autoComplete="new-password"
          />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Department</Form.Label>
          <Form.Select
            value={department}
            onChange={(ev) => setDepartment(ev.target.value as ProductionDepartment | '')}
          >
            <option value="">Select department</option>
            {PRODUCTION_DEPARTMENTS.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </Form.Select>
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Role</Form.Label>
          <Form.Select
            value={role}
            onChange={(ev) => setRole(ev.target.value)}
            disabled={!department}
          >
            <option value="">{department ? 'Select role' : 'Select department first'}</option>
            {roleOptions.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </Form.Select>
        </Form.Group>

        <p className="mt-3 mb-4" style={{ color: 'var(--mute)', fontSize: '0.95rem' }}>
          Your production role will be stored on your account so later passes can use it in crew views,
          permissions, and availability display.
        </p>

        <div className="d-none d-md-flex align-items-center justify-content-between">
          <Link className={styles.alreadyHaveAccountLink} to="/login">
            Already have an account?
          </Link>
          <ButtonWithSpinner
            className="btn btn-primary"
            type="submit"
            disabled={isDisabled}
            isLoading={isLoading}
          >
            Sign up
          </ButtonWithSpinner>
        </div>

        <BottomOverlay>
          <Link className={styles.alreadyHaveAccountLink} to="/login">
            Already have an account?
          </Link>
          <ButtonWithSpinner
            className="btn btn-light ms-auto"
            type="submit"
            disabled={isDisabled}
            isLoading={isLoading}
          >
            Sign up
          </ButtonWithSpinner>
        </BottomOverlay>

        {error && (
          <p
            className="text-danger text-center mb-0 mt-3"
            ref={errorMessageElemRef}
          >
            Could not sign up: {getReqErrorMessage(error)}
          </p>
        )}
      </Form>
    </div>
  );
}

function WhyShouldISignUp() {
  return (
    <div className={styles.whyShouldISignUp}>
      <h3 className="vw-simple-heading mb-3">Why sign up?</h3>
      <p style={{ color: 'var(--mute)', maxWidth: 420 }}>
        Save your production identity, keep your department and role attached to your account,
        and prepare the scheduler for responder permissions and reusable availability templates.
      </p>
    </div>
  );
}

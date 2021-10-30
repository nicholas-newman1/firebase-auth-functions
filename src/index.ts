import * as functionsPackage from 'firebase-functions';
import * as adminPackage from 'firebase-admin';
import axios from 'axios';
import { Config } from './types';

const getFunctions = (
  admin: typeof adminPackage,
  functions: typeof functionsPackage
) => {
  const auth = admin.auth();
  const db = admin.firestore();
  // const increment = admin.firestore.FieldValue.increment;
  const env = functions.config().runtime.env;
  const apiKey = functions.config().fb.api_key;
  const signInURL = `http${env === 'development' ? '' : 's'}://${
    env === 'development' ? 'localhost:9099/' : ''
  }identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`;

  const error = (code: string) => {
    throw new functions.https.HttpsError('invalid-argument', code);
  };

  const signUp = functions.https.onCall(async data => {
    const {
      config,
      username,
      firstName,
      lastName,
      email,
      password,
    }: {
      config?: Config;
      username: string;
      firstName: string;
      lastName: string;
      email: string;
      password: string;
    } = data;

    // Valid Email
    if (typeof email !== 'string') error('Email must be of type string');
    const emailMatch = email.match(
      //eslint-disable-next-line
      /(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9]))\.){3}(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9])|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/
    );
    if (!emailMatch || emailMatch[0] !== email)
      error('Email must be a valid email address');

    // Password Type
    if (typeof password !== 'string') error('Password must be of type string');

    // Password Max Length
    const maxLengthRule = config?.passwordRules?.maxLength;
    const maxLength =
      typeof maxLengthRule === 'number' ? maxLengthRule : maxLengthRule?.value;
    if (maxLengthRule && maxLength && password.length < maxLength)
      error(
        typeof maxLengthRule === 'number'
          ? `Password must have a maximum of ${maxLength} characters`
          : maxLengthRule.message
      );

    // Password Min Length
    const minLengthRule = config?.passwordRules?.minLength;
    const minLength =
      typeof minLengthRule === 'number' ? minLengthRule : minLengthRule?.value;
    if (minLengthRule && minLength && password.length < minLength)
      error(
        typeof minLengthRule === 'number'
          ? `Password must have a minimum of ${minLength} characters`
          : minLengthRule.message
      );

    // Password Pattern
    const passwordRule = config?.passwordRules?.pattern;
    const pattern =
      passwordRule instanceof RegExp ? passwordRule : passwordRule?.value;
    if (passwordRule && pattern && !password.match(pattern))
      error(
        passwordRule instanceof RegExp
          ? `Password must match ${pattern}`
          : passwordRule.message
      );

    // Valid Name
    if (config?.signUpFields?.name) {
      if (typeof firstName !== 'string' || firstName.length === 0)
        error('First Name must be a non-empty string');
      if (typeof lastName !== 'string' || lastName.length === 0)
        error('Last Name must be a non-empty string');
    }

    // Valid Username
    if (config?.signInWith?.username || config?.signUpFields?.username) {
      if (typeof username !== 'string')
        error('Username must be of type string');
      if (username.length < 3)
        error('Username must have a length greater than 3 characters');
      const usernameRule = config?.usernameRules?.pattern;
      const pattern =
        usernameRule instanceof RegExp ? usernameRule : usernameRule?.value;
      if (usernameRule && pattern && !username.match(pattern))
        error(
          usernameRule instanceof RegExp
            ? `Username must match ${pattern}`
            : usernameRule.message
        );
      // Username Already In Use
      const snap = await db
        .collection('users')
        .where('username', '==', username)
        .get();
      const usernameTaken = snap.docs.length;
      if (usernameTaken) error('Username is already in use');
    }

    try {
      const userAuth = {
        email,
        emailVerified: false,
        password,
        displayName: '',
        photoURL: 'https://afcm.ca/wp-content/uploads/2018/06/no-photo.png',
        disabled: false,
      };
      const userProfile: any = {
        email,
      };
      if (config?.signUpFields?.name) {
        userAuth.displayName = `${firstName} ${lastName}`;
        userProfile.firstName = firstName;
        userProfile.lastName = lastName;
      }
      if (config?.signInWith?.username) {
        userAuth.displayName = username;
        userProfile.username = username;
      }
      const user = await auth.createUser(userAuth);
      userProfile.uid = user.uid;
      db.doc(`users/${user.uid}`).set({
        ...userProfile,
        ...config?.initialProfileValues,
      });

      return user;
    } catch (e) {
      const err = e as any;
      if (err.code === 'auth/phone-number-already-exists')
        error('Phone number already in use');
      if (err.code === 'auth/email-already-exists')
        error('Email already in use');
      error(err.message || 'unknown');
      return;
    }
  });

  const signIn = functions.https.onCall(async data => {
    const {
      config,
      email,
      password,
    }: { config: Config; email: string; password: string } = data;

    // Email Type
    if (typeof email !== 'string') error('Email must be of type string');

    // Password Type
    if (typeof password !== 'string') error('Password must be of type string');

    const body = {
      email,
      password,
      returnSecureToken: true,
    };

    try {
      if (config?.signInWith?.username) {
        // check if given value has associated username
        const usersRef = db.collection('users');
        let userRef = usersRef.where('username', '==', email);
        let userDoc = (await userRef.get()).docs[0];

        // check if given value has associated email
        if (!userDoc) {
          userRef = usersRef.where('email', '==', email);
          userDoc = (await userRef.get()).docs[0];
        }

        if (!userDoc)
          error(
            `Incorrect email${
              config.signInWith?.username ? ', username, ' : ''
            } or password`
          );
        body.email = userDoc.data().email;
      }

      const res = await axios.post(signInURL, body);
      return res.data;
    } catch (e) {
      const err = e as any;
      const axiosMessage = err.response?.data?.error?.message;
      if (
        axiosMessage === 'EMAIL_NOT_FOUND' ||
        axiosMessage === 'INVALID_PASSWORD'
      )
        error(
          `Incorrect email${
            config.signInWith?.username ? ', username, ' : ''
          } or password`
        );
      error(axiosMessage || err.message || 'unknown');
      return;
    }
  });

  const editProfile = functions.https.onCall(async (data, context) => {
    const { config, username, firstName, lastName, email } = data;
    if (!context.auth) error('You must be signed in');

    // Valid Email
    if (typeof email !== 'string') error('Email must be of type string');
    const emailMatch = email.match(
      //eslint-disable-next-line
      /(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9]))\.){3}(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9])|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/
    );
    if (!emailMatch || emailMatch[0] !== email)
      error('Email must be a valid email address');

    // Valid Name
    if (config?.signUpFields?.name) {
      if (typeof firstName !== 'string' || firstName.length === 0)
        error('First Name must be a non-empty string');
      if (typeof lastName !== 'string' || lastName.length === 0)
        error('Last Name must be a non-empty string');
    }

    // Valid Username
    if (config?.signInWith?.username || config?.signUpFields?.username) {
      if (typeof username !== 'string')
        error('Username must be of type string');
      if (username.length < 3)
        error('Username must have a length greater than 3 characters');
      const usernameRule = config?.usernameRules?.pattern;
      const pattern =
        usernameRule instanceof RegExp ? usernameRule : usernameRule?.value;
      if (usernameRule && pattern && !username.match(pattern))
        error(
          usernameRule instanceof RegExp
            ? `Username must match ${pattern}`
            : usernameRule.message
        );
      // Username Already In Use
      const snap = await db
        .collection('users')
        .where('username', '==', username)
        .get();

      console.log(
        snap.docs[0].data(),
        snap.docs[0].data().uid,
        context.auth?.uid
      );
      const usernameTaken =
        snap.docs.length && snap.docs[0].data().uid !== context.auth?.uid;
      if (usernameTaken) error('Username is already in use');
    }

    const userAuth = {
      email,
      displayName: '',
    };
    const userProfile: any = {
      email,
    };
    if (config?.signUpFields?.name) {
      userAuth.displayName = `${firstName} ${lastName}`;
      userProfile.firstName = firstName;
      userProfile.lastName = lastName;
    }
    if (config?.signInWith?.username) {
      userAuth.displayName = username;
      userProfile.username = username;
    }

    try {
      auth.updateUser(context.auth!.uid, userAuth);
      db.doc(`users/${context.auth!.uid}`).update({ ...userProfile });
      return userProfile;
    } catch (e) {
      const err = e as any;
      error(err.message || 'unknown');
      return;
    }
  });

  return { signUp, signIn, editProfile };
};

export default getFunctions;

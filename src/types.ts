import {
  ButtonProps,
  CardProps,
  DialogProps,
  LinkProps,
  TextFieldProps,
  Theme,
  TypographyProps,
} from '@material-ui/core';
import firebase from 'firebase/app';

export interface User {
  displayName: string | null;
  email: string;
  emailVerified: boolean;
  creationTime: string | undefined;
  lastSignInTime: string | undefined;
  phoneNumber: string | null;
  photoUrl: string | null;
  uid: string;
}

export type FirebaseApp = firebase.app.App;

export interface SignInWithConfig {
  username?: boolean;
}

export interface SignUpFieldsConfig {
  username?: boolean;
  name?: boolean;
}

export type InputRule<T> = T | { value: T; message: string };

export interface InputRules {
  minLength?: InputRule<number>;
  maxLength?: InputRule<number>;
  pattern?: InputRule<RegExp>;
}

export interface Config {
  signUpFields?: SignUpFieldsConfig;
  signInWith?: SignInWithConfig;
  theme?: Theme;
  props?: {
    TextFieldProps?: TextFieldProps;
    SubmitButtonProps?: ButtonProps;
    NavigationLinkProps?: LinkProps<'button'>;
    DialogHeadingProps?: TypographyProps<'h1'>;
    DialogProps?: DialogProps;
    CardProps?: CardProps;
    ErrorTypographyProps?: TypographyProps;
  };
  disableEmailVerification?: boolean;
  passwordRules?: InputRules;
  usernameRules?: InputRules;
  initialProfileValues?: { [key: string]: any };
  createProfile?: boolean;
}

export interface SignUpFormFields {
  email: string;
  password: string;
  confirmPassword: string;
  username?: string;
  firstName?: string;
  lastName?: string;
}

export interface EditProfileFormFields {
  email: string;
  username?: string;
  firstName?: string;
  lastName?: string;
}

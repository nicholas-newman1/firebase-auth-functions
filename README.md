## Getting Started

This package contains pre-built firebase cloud functions and is intended to be used in conjuction with [react-redux-firebase-auth](https://www.npmjs.com/package/react-redux-firebase-auth)

```
npm i firebase-auth-functions
```

### Using Firebase Auth Functions

#### Environment Variables

First, set a couple of environemnt variables:

```
firebase functions:config:set fb.ap_key=[API_KEY]
```

```
firebase functions:config:set runtime.env=production
```

If you wish to use the firebase emulator, set its environment variables by creating .runtimeconfig.json with the following:

```json
{
  "fb": {
    "api_key": "[API_KEY]"
  },
  "runtime": {
    "env": "development"
  }
}
```

Remember to add .runtimeconfig.json to .gitignore

#### Functions Code

```js
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import getFunctions from 'firebase-auth-functions';
admin.initializeApp();

export const { signUp, signIn, editProfile } = getFunctions(admin, functions);
```

### Typescript errors when building?

Add "skipLibCheck": true to tsconfig.

- Clears errors
- Significant performance increase by skipping checking .d.ts files, particularly those in node_modules
- Recommended by TS

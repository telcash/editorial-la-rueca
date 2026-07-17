export interface SignInState {
  success: boolean;
  fieldErrors: {
    email?: string[];
    password?: string[];
  };
  formError: string | null;
}

export const initialSignInState: SignInState = {
  success: false,
  fieldErrors: {},
  formError: null,
};

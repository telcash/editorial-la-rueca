export interface PasswordResetRequestState {
  success: boolean;
  fieldErrors: {
    email?: string[];
  };
  formError: string | null;
  values: {
    email: string;
  };
}

export interface UpdatePasswordState {
  success: boolean;
  fieldErrors: {
    password?: string[];
    confirmPassword?: string[];
  };
  formError: string | null;
}

export const initialPasswordResetRequestState: PasswordResetRequestState = {
  success: false,
  fieldErrors: {},
  formError: null,
  values: {
    email: '',
  },
};

export const initialUpdatePasswordState: UpdatePasswordState = {
  success: false,
  fieldErrors: {},
  formError: null,
};

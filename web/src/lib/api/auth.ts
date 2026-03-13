import api from "@/lib/api-client";
import type { AuthResponse } from "@/types/api";

export type ConfirmationResponse = {
  requires_confirmation: true;
  email: string;
  message: string;
};

export type SignupResponse = AuthResponse | ConfirmationResponse;

export async function login(email: string, password: string): Promise<AuthResponse> {
  return api.post("api/auth/login", { json: { email, password } }).json<AuthResponse>();
}

export async function signup(
  email: string,
  password: string,
  name: string,
  orgName: string,
): Promise<SignupResponse> {
  return api
    .post("api/auth/signup", {
      json: { email, password, name, org_name: orgName },
    })
    .json<SignupResponse>();
}

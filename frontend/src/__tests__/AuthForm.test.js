import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import AuthForm from "@/components/AuthForm";

jest.mock("@/lib/firebase", () => ({
  isFirebaseConfigured: () => false,
  loginWithEmail: jest.fn(),
  registerWithEmail: jest.fn(),
  sendReset: jest.fn()
}));

describe("AuthForm", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("creates a local preview account when Firebase credentials are missing", async () => {
    render(<AuthForm mode="register" />);

    expect(screen.getByText(/local preview mode is active/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "owner@taplex.test" }
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: "taplexPass123" }
    });
    fireEvent.click(screen.getByRole("button", { name: /register/i }));

    await waitFor(() => {
      expect(screen.getByText(/local preview account created/i)).toBeInTheDocument();
    });
    expect(window.localStorage.getItem("taplex.preview.users")).toContain("owner@taplex.test");
  });
});

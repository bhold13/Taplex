import { render, screen } from "@testing-library/react";

import BioProfilePage from "@/components/BioProfilePage";
import { demoProfile } from "@/lib/profileStore";

describe("BioProfilePage", () => {
  it("shows booking only for an eligible plan", () => {
    const { rerender } = render(
      <BioProfilePage profile={{ ...demoProfile, plan: "free", bookingUrl: "https://example.com/book" }} />
    );

    expect(screen.queryByRole("link", { name: /book now/i })).not.toBeInTheDocument();

    rerender(<BioProfilePage profile={{ ...demoProfile, plan: "pro", bookingUrl: "https://example.com/book" }} />);

    expect(screen.getByRole("link", { name: /book now/i })).toBeInTheDocument();
  });
});

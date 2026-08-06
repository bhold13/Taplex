import { fireEvent, render, screen } from "@testing-library/react";

import DownloadContactButton from "@/components/DownloadContactButton";
import { demoProfile } from "@/lib/profileStore";

describe("DownloadContactButton", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    URL.createObjectURL = jest.fn(() => "blob:taplex-contact");
    URL.revokeObjectURL = jest.fn();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it("creates and clicks a downloadable vCard", () => {
    const clickSpy = jest.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    render(<DownloadContactButton profile={demoProfile} />);
    fireEvent.click(screen.getByRole("button", { name: /download contact/i }));

    expect(URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    expect(clickSpy).toHaveBeenCalledTimes(1);

    clickSpy.mockRestore();
  });
});

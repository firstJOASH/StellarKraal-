import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import RepayPanel from "../components/RepayPanel";

const mockSignTransaction = jest.fn();
const mockSubmitSignedXdr = jest.fn();

jest.mock("@stellar/freighter-api", () => ({
  signTransaction: (...args: any[]) => mockSignTransaction(...args),
}));

jest.mock("../lib/stellarUtils", () => ({
  submitSignedXdr: (...args: any[]) => mockSubmitSignedXdr(...args),
  healthColor: () => "#16a34a",
  formatStroops: (s: number) => `${s / 1e7} XLM`,
}));

const fetchMock = jest.fn();
beforeEach(() => {
  fetchMock.mockReset();
  mockSignTransaction.mockReset();
  mockSubmitSignedXdr.mockReset();
  (global as any).fetch = fetchMock;
});

describe("RepayPanel", () => {
  it("renders repay form", () => {
    render(<RepayPanel walletAddress="GTEST" />);
    expect(screen.getByText("Repay Loan")).toBeTruthy();
    expect(screen.getByPlaceholderText("Loan ID")).toBeTruthy();
    expect(screen.getByPlaceholderText("Amount (stroops)")).toBeTruthy();
    expect(screen.getByText("Repay")).toBeTruthy();
  });

  it("pre-fills fields from initialLoanId and initialAmount props", () => {
    render(<RepayPanel walletAddress="GTEST" initialLoanId="7" initialAmount="50000" />);
    expect((screen.getByPlaceholderText("Loan ID") as HTMLInputElement).value).toBe("7");
    expect((screen.getByPlaceholderText("Amount (stroops)") as HTMLInputElement).value).toBe("50000");
  });

  it("updates fields when props change", () => {
    const { rerender } = render(
      <RepayPanel walletAddress="GTEST" initialLoanId="1" initialAmount="100" />
    );
    rerender(<RepayPanel walletAddress="GTEST" initialLoanId="2" initialAmount="200" />);
    expect((screen.getByPlaceholderText("Loan ID") as HTMLInputElement).value).toBe("2");
    expect((screen.getByPlaceholderText("Amount (stroops)") as HTMLInputElement).value).toBe("200");
  });

  it("shows success status after repayment", async () => {
    fetchMock.mockResolvedValue({ json: async () => ({ xdr: "test-xdr" }) });
    mockSignTransaction.mockResolvedValue({ signedTxXdr: "signed-xdr" });
    mockSubmitSignedXdr.mockResolvedValue(undefined);

    render(<RepayPanel walletAddress="GTEST" initialLoanId="5" initialAmount="10000" />);
    fireEvent.click(screen.getByText("Repay"));

    await waitFor(() =>
      expect(screen.getByText("✅ Repayment submitted!")).toBeTruthy()
    );
  });

  it("shows error status when repayment fails", async () => {
    fetchMock.mockRejectedValue(new Error("Repay failed"));

    render(<RepayPanel walletAddress="GTEST" initialLoanId="5" initialAmount="10000" />);
    fireEvent.click(screen.getByText("Repay"));

    await waitFor(() =>
      expect(screen.getByText("❌ Repay failed")).toBeTruthy()
    );
  });

  it("disables button while loading", async () => {
    let resolve: (v: any) => void;
    fetchMock.mockReturnValue(new Promise((r) => { resolve = r; }));

    render(<RepayPanel walletAddress="GTEST" initialLoanId="1" initialAmount="100" />);
    fireEvent.click(screen.getByText("Repay"));

    expect(screen.getByText("Processing…")).toBeTruthy();
    expect((screen.getByText("Processing…") as HTMLButtonElement).disabled).toBe(true);
    resolve!({ json: async () => ({ xdr: "" }) });
  });
});

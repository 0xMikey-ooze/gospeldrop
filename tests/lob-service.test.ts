import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockPrisma, sampleAddress, sampleBibleDrop } from "./setup";

// Mock Lob SDK
const mockVerifySingle = vi.fn();
const mockLettersCreate = vi.fn();
const mockLettersGet = vi.fn();

vi.mock("@/lib/lob", () => ({
  usVerificationsApi: { verifySingle: mockVerifySingle },
  lettersApi: { create: mockLettersCreate, get: mockLettersGet },
}));

import { verifyAddress, sendBibleLetter, getLetterStatus, createBibleDrops } from "@/lib/lob-service";

beforeEach(() => {
  mockVerifySingle.mockReset();
  mockLettersCreate.mockReset();
  mockLettersGet.mockReset();
});

describe("verifyAddress", () => {
  it("should return deliverable for valid address", async () => {
    mockVerifySingle.mockResolvedValue({
      deliverability: "deliverable",
      primary_line: "123 MAIN ST",
      components: { city: "NASHVILLE", state: "TN", zip_code: "37201" },
    });

    const result = await verifyAddress({
      name: "John", line1: "123 Main St", city: "Nashville", state: "TN", zip: "37201",
    });

    expect(result.deliverable).toBe(true);
    expect(result.deliverability).toBe("deliverable");
    expect(result.standardizedAddress).toBeDefined();
  });

  it("should return undeliverable for bad address", async () => {
    mockVerifySingle.mockResolvedValue({ deliverability: "undeliverable" });

    const result = await verifyAddress({
      name: "Nobody", line1: "999 Fake St", city: "Nowhere", state: "XX", zip: "00000",
    });

    expect(result.deliverable).toBe(false);
    expect(result.standardizedAddress).toBeUndefined();
  });

  it("should handle deliverable_missing_unit", async () => {
    mockVerifySingle.mockResolvedValue({
      deliverability: "deliverable_missing_unit",
      primary_line: "456 APT BLVD",
      components: { city: "AUSTIN", state: "TX", zip_code: "73301" },
    });

    const result = await verifyAddress({
      name: "Jane", line1: "456 Apt Blvd", city: "Austin", state: "TX", zip: "73301",
    });

    expect(result.deliverable).toBe(true);
    expect(result.deliverability).toBe("deliverable_missing_unit");
  });

  it("should propagate API errors", async () => {
    mockVerifySingle.mockRejectedValue(new Error("Rate limit exceeded"));
    await expect(
      verifyAddress({ name: "X", line1: "1 St", city: "C", state: "S", zip: "0" })
    ).rejects.toThrow("Rate limit exceeded");
  });
});

describe("sendBibleLetter", () => {
  it("should create letter and update BibleDrop", async () => {
    mockLettersCreate.mockResolvedValue({
      id: "ltr_abc123",
      tracking_number: "TRK001",
    });
    mockPrisma.bibleDrop.update.mockResolvedValue({});

    const result = await sendBibleLetter(
      { name: "John", line1: "123 Main", city: "Nashville", state: "TN", zip: "37201" },
      "drop_1"
    );

    expect(result.lobLetterId).toBe("ltr_abc123");
    expect(result.trackingNumber).toBe("TRK001");
    expect(mockPrisma.bibleDrop.update).toHaveBeenCalledWith({
      where: { id: "drop_1" },
      data: { lobLetterId: "ltr_abc123", trackingNumber: "TRK001" },
    });
  });

  it("should handle null tracking number", async () => {
    mockLettersCreate.mockResolvedValue({ id: "ltr_xyz", tracking_number: null });
    mockPrisma.bibleDrop.update.mockResolvedValue({});

    const result = await sendBibleLetter(
      { name: "Jane", line1: "456 Oak", city: "Austin", state: "TX", zip: "73301" },
      "drop_2"
    );

    expect(result.trackingNumber).toBeNull();
  });
});

describe("getLetterStatus", () => {
  it("should return letter tracking info", async () => {
    mockLettersGet.mockResolvedValue({
      id: "ltr_abc123",
      status: "in_transit",
      expected_delivery_date: "2026-03-20",
      tracking_number: "TRK001",
      tracking_events: [{ type: "mailed", time: "2026-03-15" }],
    });

    const result = await getLetterStatus("ltr_abc123");
    expect(result.status).toBe("in_transit");
    expect(result.trackingEvents).toHaveLength(1);
  });
});

describe("createBibleDrops", () => {
  it("should create drops and send letters for each address", async () => {
    const addresses = [
      { ...sampleAddress, id: "addr_1" },
      { ...sampleAddress, id: "addr_2", name: "Jane Doe" },
    ];

    mockPrisma.address.findMany.mockResolvedValue(addresses);
    mockPrisma.bibleDrop.create
      .mockResolvedValueOnce({ ...sampleBibleDrop, id: "drop_1", addressId: "addr_1" })
      .mockResolvedValueOnce({ ...sampleBibleDrop, id: "drop_2", addressId: "addr_2" });
    mockLettersCreate
      .mockResolvedValueOnce({ id: "ltr_1", tracking_number: "TRK1" })
      .mockResolvedValueOnce({ id: "ltr_2", tracking_number: "TRK2" });
    mockPrisma.bibleDrop.update.mockResolvedValue({});
    mockPrisma.address.update.mockResolvedValue({});
    mockPrisma.donation.update.mockResolvedValue({});

    const result = await createBibleDrops("don_1", 2);

    expect(result.successCount).toBe(2);
    expect(result.results).toHaveLength(2);
    expect(mockPrisma.donation.update).toHaveBeenCalledWith({
      where: { id: "don_1" },
      data: { status: "completed" },
    });
  });

  it("should handle partial failures", async () => {
    mockPrisma.address.findMany.mockResolvedValue([
      { ...sampleAddress, id: "addr_1" },
      { ...sampleAddress, id: "addr_2" },
    ]);
    mockPrisma.bibleDrop.create
      .mockResolvedValueOnce({ ...sampleBibleDrop, id: "drop_1" })
      .mockResolvedValueOnce({ ...sampleBibleDrop, id: "drop_2" });
    mockLettersCreate
      .mockResolvedValueOnce({ id: "ltr_1", tracking_number: "TRK1" })
      .mockRejectedValueOnce(new Error("Lob API error"));
    mockPrisma.bibleDrop.update.mockResolvedValue({});
    mockPrisma.address.update.mockResolvedValue({});
    mockPrisma.donation.update.mockResolvedValue({});

    const result = await createBibleDrops("don_1", 2);

    expect(result.successCount).toBe(1);
    expect(mockPrisma.donation.update).toHaveBeenCalledWith({
      where: { id: "don_1" },
      data: { status: "partial" },
    });
  });

  it("should throw when no addresses available", async () => {
    mockPrisma.address.findMany.mockResolvedValue([]);
    await expect(createBibleDrops("don_1", 1)).rejects.toThrow("No available addresses");
  });
});

let idCounter = 0;

function nextId() {
  return `test_${++idCounter}`;
}

export function resetIdCounter() {
  idCounter = 0;
}

export const sampleUser = {
  id: "user_1",
  email: "test@gospeldrop.com",
  name: "Test User",
  passwordHash: "$2a$10$hashedpassword",
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
};

export const sampleAddress = {
  id: "addr_1",
  name: "John Doe",
  line1: "123 Main St",
  line2: null,
  city: "Nashville",
  state: "TN",
  zip: "37201",
  hasReceived: false,
  createdAt: new Date("2026-01-01"),
};

export const sampleDonation = {
  id: "don_1",
  userId: "user_1",
  amount: 1500,
  quantity: 1,
  polarCheckoutId: "polar_checkout_123",
  status: "pending",
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
};

export const sampleBibleDrop = {
  id: "drop_1",
  donationId: "don_1",
  addressId: "addr_1",
  lobLetterId: "ltr_test123",
  trackingNumber: null,
  status: "pending",
  shippedAt: null,
  deliveredAt: null,
  createdAt: new Date("2026-01-01"),
};

export function createTestUser(overrides: Partial<typeof sampleUser> = {}) {
  return { ...sampleUser, id: nextId(), ...overrides };
}

export function createTestAddress(overrides: Partial<typeof sampleAddress> = {}) {
  return { ...sampleAddress, id: nextId(), ...overrides };
}

export function createTestDonation(overrides: Partial<typeof sampleDonation> = {}) {
  return { ...sampleDonation, id: nextId(), ...overrides };
}

export function createTestBibleDrop(overrides: Partial<typeof sampleBibleDrop> = {}) {
  return { ...sampleBibleDrop, id: nextId(), ...overrides };
}

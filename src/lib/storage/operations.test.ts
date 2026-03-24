const { mockS3Client, mockGetSignedUrl } = vi.hoisted(() => ({
  mockS3Client: {
    send: vi.fn().mockResolvedValue({}),
  },
  mockGetSignedUrl: vi
    .fn()
    .mockResolvedValue("https://s3.example.com/presigned-url"),
}));

vi.mock("./client", () => ({
  getS3Client: () => mockS3Client,
  getS3Bucket: () => "test-bucket",
}));
vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: mockGetSignedUrl,
}));

import {
  ensureBucket,
  uploadFile,
  deleteFile,
  getDownloadUrl,
} from "./operations";

describe("ensureBucket", () => {
  beforeEach(() => vi.clearAllMocks());

  it("does not create bucket if it already exists", async () => {
    mockS3Client.send.mockResolvedValueOnce({});

    await ensureBucket();

    expect(mockS3Client.send).toHaveBeenCalledTimes(1);
  });

  it("creates bucket if head check fails", async () => {
    mockS3Client.send
      .mockRejectedValueOnce(new Error("NotFound"))
      .mockResolvedValueOnce({});

    await ensureBucket();

    expect(mockS3Client.send).toHaveBeenCalledTimes(2);
  });
});

describe("uploadFile", () => {
  beforeEach(() => vi.clearAllMocks());

  it("sends PutObjectCommand with correct params", async () => {
    const buffer = Buffer.from("file content");

    await uploadFile("knowledge/user/doc/file.pdf", buffer, "application/pdf");

    expect(mockS3Client.send).toHaveBeenCalledTimes(1);
    const command = mockS3Client.send.mock.calls[0][0];
    expect(command.input).toEqual({
      Bucket: "test-bucket",
      Key: "knowledge/user/doc/file.pdf",
      Body: buffer,
      ContentType: "application/pdf",
    });
  });
});

describe("deleteFile", () => {
  beforeEach(() => vi.clearAllMocks());

  it("sends DeleteObjectCommand with correct params", async () => {
    await deleteFile("knowledge/user/doc/file.pdf");

    expect(mockS3Client.send).toHaveBeenCalledTimes(1);
    const command = mockS3Client.send.mock.calls[0][0];
    expect(command.input).toEqual({
      Bucket: "test-bucket",
      Key: "knowledge/user/doc/file.pdf",
    });
  });
});

describe("getDownloadUrl", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns presigned URL", async () => {
    const url = await getDownloadUrl("knowledge/user/doc/file.pdf");

    expect(url).toBe("https://s3.example.com/presigned-url");
    expect(mockGetSignedUrl).toHaveBeenCalledWith(
      mockS3Client,
      expect.objectContaining({
        input: { Bucket: "test-bucket", Key: "knowledge/user/doc/file.pdf" },
      }),
      { expiresIn: 3600 }
    );
  });

  it("accepts custom expiry", async () => {
    await getDownloadUrl("key", 600);

    expect(mockGetSignedUrl).toHaveBeenCalledWith(
      mockS3Client,
      expect.anything(),
      { expiresIn: 600 }
    );
  });
});

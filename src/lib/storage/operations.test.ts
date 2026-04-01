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
  listObjects,
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

describe("listObjects", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns keys from S3 listing", async () => {
    mockS3Client.send.mockResolvedValueOnce({
      Contents: [{ Key: "recordings/a.mp4" }, { Key: "recordings/b.mp4" }],
    });

    const keys = await listObjects("recordings/");

    expect(keys).toEqual(["recordings/a.mp4", "recordings/b.mp4"]);
    const command = mockS3Client.send.mock.calls[0][0];
    expect(command.input).toEqual({
      Bucket: "test-bucket",
      Prefix: "recordings/",
      MaxKeys: 1000,
    });
  });

  it("returns empty array when no objects found", async () => {
    mockS3Client.send.mockResolvedValueOnce({ Contents: undefined });

    const keys = await listObjects("empty/");

    expect(keys).toEqual([]);
  });

  it("respects custom maxKeys", async () => {
    mockS3Client.send.mockResolvedValueOnce({ Contents: [] });

    await listObjects("prefix/", 50);

    const command = mockS3Client.send.mock.calls[0][0];
    expect(command.input.MaxKeys).toBe(50);
  });

  it("paginates when IsTruncated is true", async () => {
    mockS3Client.send
      .mockResolvedValueOnce({
        Contents: [{ Key: "a/1.txt" }],
        IsTruncated: true,
        NextContinuationToken: "token-page2",
      })
      .mockResolvedValueOnce({
        Contents: [{ Key: "a/2.txt" }],
        IsTruncated: false,
      });

    const keys = await listObjects("a/");

    expect(keys).toEqual(["a/1.txt", "a/2.txt"]);
    expect(mockS3Client.send).toHaveBeenCalledTimes(2);
    const secondCall = mockS3Client.send.mock.calls[1][0];
    expect(secondCall.input.ContinuationToken).toBe("token-page2");
  });

  it("stops paginating when maxKeys is reached", async () => {
    mockS3Client.send.mockResolvedValueOnce({
      Contents: [{ Key: "a/1.txt" }, { Key: "a/2.txt" }],
      IsTruncated: true,
      NextContinuationToken: "token-page2",
    });

    const keys = await listObjects("a/", 2);

    expect(keys).toEqual(["a/1.txt", "a/2.txt"]);
    // Should not make a second call since maxKeys reached
    expect(mockS3Client.send).toHaveBeenCalledTimes(1);
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

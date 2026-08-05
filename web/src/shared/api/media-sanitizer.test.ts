import { describe, expect, it } from "vitest";
import { prepareAttachmentUpload } from "@/shared/api/media-sanitizer";

function ascii(value: string): number[] {
  return [...new TextEncoder().encode(value)];
}

function pngChunk(kind: string, payload: number[]): Uint8Array {
  const output = new Uint8Array(payload.length + 12);
  new DataView(output.buffer).setUint32(0, payload.length);
  output.set(ascii(kind), 4);
  output.set(payload, 8);
  return output;
}

function concat(parts: Uint8Array[]): Uint8Array {
  const output = new Uint8Array(parts.reduce((size, part) => size + part.byteLength, 0));
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.byteLength;
  }
  return output;
}

describe("prepareAttachmentUpload", () => {
  it("removes GIF comments without flattening animation blocks", async () => {
    const header = new Uint8Array([
      ...ascii("GIF89a"),
      0x02,
      0x00,
      0x02,
      0x00,
      0x80,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0xff,
      0xff,
      0xff,
    ]);
    const comment = new Uint8Array([0x21, 0xfe, 0x06, ...ascii("secret"), 0x00]);
    const loop = new Uint8Array([0x21, 0xff, 0x0b, ...ascii("NETSCAPE2.0"), 3, 1, 0, 0, 0]);
    const frame = new Uint8Array([0x2c, 0, 0, 0, 0, 2, 0, 2, 0, 0, 2, 2, 0x44, 1, 0, 0x3b]);
    const source = new Uint8Array(concat([header, comment, loop, frame])).buffer;
    const prepared = await prepareAttachmentUpload(
      new File([source], "animation.gif", { type: "image/gif" }),
    );
    const output = new Uint8Array(prepared.bytes);

    expect(prepared.mimeType).toBe("image/gif");
    expect(new TextDecoder().decode(output)).not.toContain("secret");
    expect(new TextDecoder().decode(output)).toContain("NETSCAPE2.0");
    expect(output[output.byteLength - 1]).toBe(0x3b);
  });

  it("removes APNG text metadata while retaining animation chunks", async () => {
    const source = new Uint8Array(
      concat([
        new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
        pngChunk("IHDR", new Array(13).fill(0)),
        pngChunk("acTL", [0, 0, 0, 2, 0, 0, 0, 0]),
        pngChunk("tEXt", ascii("Location\0secret")),
        pngChunk("fcTL", new Array(26).fill(0)),
        pngChunk("IDAT", [1, 2, 3]),
        pngChunk("fdAT", [0, 0, 0, 1, 4, 5]),
        pngChunk("IEND", []),
      ]),
    ).buffer;
    const prepared = await prepareAttachmentUpload(
      new File([source], "animation.png", { type: "image/png" }),
    );
    const text = new TextDecoder().decode(prepared.bytes);

    expect(prepared.mimeType).toBe("image/png");
    expect(text).not.toContain("Location");
    expect(text).toContain("acTL");
    expect(text).toContain("fdAT");
  });
});

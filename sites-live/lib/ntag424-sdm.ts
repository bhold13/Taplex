import { createCipheriv, createDecipheriv, timingSafeEqual } from "node:crypto";

export type Ntag424Verification = {
  verified: boolean;
  uidHex: string;
  counter: number;
  receivedMacHex: string;
  expectedMacHex: string;
};

function parseHex(value: string, bytes: number, label: string) {
  if (!new RegExp(`^[0-9a-fA-F]{${bytes * 2}}$`).test(value)) {
    throw new Error(`${label} must be exactly ${bytes * 2} hexadecimal characters.`);
  }
  return Buffer.from(value, "hex");
}

function xor(a: Buffer, b: Buffer) {
  const out = Buffer.alloc(a.length);
  for (let i = 0; i < a.length; i += 1) out[i] = a[i] ^ b[i];
  return out;
}

function aesEcbBlock(key: Buffer, block: Buffer) {
  const cipher = createCipheriv("aes-128-ecb", key, null);
  cipher.setAutoPadding(false);
  return Buffer.concat([cipher.update(block), cipher.final()]);
}

function leftShiftOne(input: Buffer) {
  const out = Buffer.alloc(input.length);
  let carry = 0;
  for (let i = input.length - 1; i >= 0; i -= 1) {
    const value = input[i];
    out[i] = ((value << 1) & 0xff) | carry;
    carry = value & 0x80 ? 1 : 0;
  }
  return out;
}

function cmacSubkeys(key: Buffer) {
  const l = aesEcbBlock(key, Buffer.alloc(16));
  const k1 = leftShiftOne(l);
  if (l[0] & 0x80) k1[15] ^= 0x87;
  const k2 = leftShiftOne(k1);
  if (k1[0] & 0x80) k2[15] ^= 0x87;
  return { k1, k2 };
}

function aesCmac(key: Buffer, message: Buffer) {
  const { k1, k2 } = cmacSubkeys(key);
  let blockCount = Math.ceil(message.length / 16);
  if (blockCount === 0) blockCount = 1;
  const complete = message.length > 0 && message.length % 16 === 0;

  let lastBlock: Buffer;
  if (complete) {
    const block = Buffer.from(message.subarray((blockCount - 1) * 16, blockCount * 16));
    lastBlock = xor(block, k1);
  } else {
    const remaining = message.subarray((blockCount - 1) * 16);
    const padded = Buffer.alloc(16);
    remaining.copy(padded);
    padded[remaining.length] = 0x80;
    lastBlock = xor(padded, k2);
  }

  let x = Buffer.alloc(16);
  for (let i = 0; i < blockCount - 1; i += 1) {
    const block = Buffer.from(message.subarray(i * 16, (i + 1) * 16));
    x = aesEcbBlock(key, xor(x, block));
  }
  return aesEcbBlock(key, xor(x, lastBlock));
}

function truncateSdmMac(fullMac: Buffer) {
  return Buffer.from([fullMac[1], fullMac[3], fullMac[5], fullMac[7], fullMac[9], fullMac[11], fullMac[13], fullMac[15]]);
}

function decryptPiccData(encryptedPicc: Buffer, metaReadKey: Buffer) {
  const decipher = createDecipheriv("aes-128-cbc", metaReadKey, Buffer.alloc(16));
  decipher.setAutoPadding(false);
  return Buffer.concat([decipher.update(encryptedPicc), decipher.final()]);
}

export function verifyNtag424Sdm(input: {
  encryptedPiccHex: string;
  receivedMacHex: string;
  metaReadKeyHex: string;
  fileReadKeyHex: string;
}): Ntag424Verification {
  const encryptedPicc = parseHex(input.encryptedPiccHex, 16, "e");
  const receivedMac = parseHex(input.receivedMacHex, 8, "c");
  const metaReadKey = parseHex(input.metaReadKeyHex, 16, "SDM meta read key");
  const fileReadKey = parseHex(input.fileReadKeyHex, 16, "SDM file read key");

  const piccData = decryptPiccData(encryptedPicc, metaReadKey);
  if (piccData[0] !== 0xc7) throw new Error("Unexpected encrypted PICCData format.");

  const uid = Buffer.from(piccData.subarray(1, 8));
  const counterBytes = Buffer.from(piccData.subarray(8, 11));
  const counter = counterBytes[0] | (counterBytes[1] << 8) | (counterBytes[2] << 16);

  // NTAG 424 DNA SDM session-vector 2 for UID + read-counter mirroring.
  const sv2 = Buffer.concat([Buffer.from("3CC300010080", "hex"), uid, counterBytes]);
  const sessionMacKey = aesCmac(fileReadKey, sv2);

  // Current TapLex SDM template deliberately uses SDMMACInputOffset == SDMMACOffset,
  // so the CMAC input is zero-length.
  const expectedMac = truncateSdmMac(aesCmac(sessionMacKey, Buffer.alloc(0)));
  const verified = timingSafeEqual(expectedMac, receivedMac);

  return {
    verified,
    uidHex: uid.toString("hex").toUpperCase(),
    counter,
    receivedMacHex: receivedMac.toString("hex").toUpperCase(),
    expectedMacHex: expectedMac.toString("hex").toUpperCase(),
  };
}

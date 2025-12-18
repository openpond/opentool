import assert from "node:assert/strict";
import { test } from "node:test";

import { readTurnkeyEnv } from "../src/wallet/env";

const KEYS = [
  "TURNKEY_SUBORG_ID",
  "TURNKEY_API_PUBLIC_KEY",
  "TURNKEY_API_PRIVATE_KEY",
  "TURNKEY_WALLET_ADDRESS",
  "TURNKEY_API_BASE_URL",
] as const;

function withEnv(next: Partial<Record<(typeof KEYS)[number], string | undefined>>, fn: () => void) {
  const prior: Partial<Record<(typeof KEYS)[number], string | undefined>> = {};
  for (const key of KEYS) prior[key] = process.env[key];
  try {
    for (const key of KEYS) {
      const value = next[key];
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
    fn();
  } finally {
    for (const key of KEYS) {
      const value = prior[key];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

test("readTurnkeyEnv returns undefined when suborg id missing", () => {
  withEnv(
    {
      TURNKEY_API_PUBLIC_KEY: "pub",
      TURNKEY_API_PRIVATE_KEY: "priv",
      TURNKEY_WALLET_ADDRESS: "0x69cc68669d2c91FFc9FaB84C1F845d85E0D36F95",
    },
    () => {
      assert.equal(readTurnkeyEnv(), undefined);
    }
  );
});

test("readTurnkeyEnv reads TURNKEY_SUBORG_ID", () => {
  withEnv(
    {
      TURNKEY_SUBORG_ID: "suborg_abc",
      TURNKEY_API_PUBLIC_KEY: "pub",
      TURNKEY_API_PRIVATE_KEY: "priv",
      TURNKEY_WALLET_ADDRESS: "0x69cc68669d2c91FFc9FaB84C1F845d85E0D36F95",
    },
    () => {
      const result = readTurnkeyEnv();
      assert.ok(result);
      assert.equal(result.organizationId, "suborg_abc");
      assert.equal(result.signWith, "0x69cc68669d2c91FFc9FaB84C1F845d85E0D36F95");
    }
  );
});

test("readTurnkeyEnv returns undefined when required fields are missing", () => {
  withEnv(
    {
      TURNKEY_SUBORG_ID: "suborg_abc",
      TURNKEY_API_PUBLIC_KEY: "pub",
      TURNKEY_API_PRIVATE_KEY: undefined,
      TURNKEY_WALLET_ADDRESS: "0x69cc68669d2c91FFc9FaB84C1F845d85E0D36F95",
    },
    () => {
      assert.equal(readTurnkeyEnv(), undefined);
    }
  );
});

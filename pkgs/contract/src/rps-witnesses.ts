export const RpsPrivateStateId = "rpsPrivateState" as const;

export type RpsPrivateState = {
  readonly secretKey: Uint8Array;
  readonly myMove: number | null;
  readonly mySalt: Uint8Array | null;
};

type WebCrypto = { getRandomValues<T extends Uint8Array>(array: T): T };
// biome-ignore lint/suspicious/noExplicitAny: cross-env Web Crypto API — not in ESNext lib
const _crypto: WebCrypto = (globalThis as unknown as { crypto: WebCrypto }).crypto;

export const INITIAL_RPS_PRIVATE_STATE: RpsPrivateState = {
  secretKey: _crypto.getRandomValues(new Uint8Array(32)),
  myMove: null,
  mySalt: null,
};

type WitnessCtx = { readonly privateState: RpsPrivateState };

export const rpsWitnesses = {
  local_secret_key: (ctx: WitnessCtx): [RpsPrivateState, Uint8Array] =>
    [ctx.privateState, ctx.privateState.secretKey],

  get_my_move: (ctx: WitnessCtx): [RpsPrivateState, number] => {
    const { myMove } = ctx.privateState;
    if (myMove === null) throw new Error("Move not set: call setMyMove() before commit()");
    return [ctx.privateState, myMove];
  },

  get_my_salt: (ctx: WitnessCtx): [RpsPrivateState, Uint8Array] => {
    const { mySalt } = ctx.privateState;
    if (mySalt === null) throw new Error("Salt not set: call setMyMove() before commit()");
    return [ctx.privateState, mySalt];
  },

  store_move_and_salt: (ctx: WitnessCtx, m_0: number, s_0: Uint8Array): [RpsPrivateState, []] =>
    [{ ...ctx.privateState, myMove: m_0, mySalt: s_0 }, []],
};

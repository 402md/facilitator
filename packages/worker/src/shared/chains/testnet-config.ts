export const TESTNET_CONFIG = {
  'eip155:84532': {
    rpcUrl: 'https://sepolia.base.org',
    usdcAddress: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    cctpTokenMessenger: '0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5',
    cctpMessageTransmitter: '0x7865fAfC2db2093669d92c0F33AeEF291086BEFD',
    cctpDomain: 6,
  },
  'solana:devnet': {
    rpcUrl: 'https://api.devnet.solana.com',
    usdcMint: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
    cctpDomain: 5,
  },
  'stellar:testnet': {
    rpcUrl: 'https://soroban-testnet.stellar.org',
    cctpDomain: 7,
  },
}

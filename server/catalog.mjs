export const initialAccounts = () => [
  { id: 'savings', name: 'Everyday Savings', number: '0482', currency: 'SGD', balance: 1284050 },
  { id: 'joint', name: 'Joint Account', number: '7291', currency: 'SGD', balance: 426000 },
];
export const payees = [
  { id: 'mom', name: 'Mei Tan', nickname: 'Mom', bank: 'DBS', number: '6018', aliases: ['mom', 'mum', 'mother', '妈妈', '妈妈账户', 'mei tan'] },
  { id: 'john-lim', name: 'John Lim', nickname: 'John · colleague', bank: 'OCBC', number: '4521', aliases: ['john', 'john lim', '约翰'] },
  { id: 'john-tan', name: 'John Tan', nickname: 'John · friend', bank: 'UOB', number: '8892', aliases: ['john', 'john tan', '约翰'] },
  { id: 'sarah', name: 'Sarah Lee', nickname: 'Sarah', bank: 'DBS', number: '2309', aliases: ['sarah', 'sarah lee', '莎拉'] },
];
export const initialBills = () => [
  { id: 'electricity', name: 'SP Services', description: 'Electricity · October', number: 'SP-2026-1018', amount: 12840, due: '2026-10-16', paid: false, aliases: ['electricity', 'utility', 'utilities', 'sp services', '电费', '水电'] },
  { id: 'phone', name: 'Singtel', description: 'Mobile · October', number: 'ST-2026-1021', amount: 5800, due: '2026-10-21', paid: false, aliases: ['phone', 'mobile', 'singtel', '电话费', '话费'] },
];
export const policy = { currency: 'SGD', maxActions: 5, batchLimit: 500000, dailyLimit: 1000000, stepUp: 200000, velocityCount: 5, velocityWindowMs: 60000, approvalTtlMs: 120000 };
export const money = cents => `SGD ${(cents / 100).toFixed(2)}`;
